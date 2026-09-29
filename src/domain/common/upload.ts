// Bulk-upload CSV reading shared by the learner, surveillance-user and class
// uploads: template header checks, then every row mapped onto an empty form,
// validated and classified. Pure, so node tests can load it.

export type UploadStatus = "Valid" | "Invalid" | "Duplicate" | "Existing";
export interface UploadRow<T> {
  key: number;
  data: T;
  status: UploadStatus;
  message: string;
}
/** A row that passed validation but cannot be added as it is. */
export type UploadVerdict = {
  status: "Duplicate" | "Existing";
  message: string;
};

const norm = (header: string) =>
  header.trim().toLowerCase().replace(/\s+/g, "_");

export interface UploadTemplate<C extends string, T extends Record<C, string>> {
  columns: readonly C[];
  /** Columns the header must contain. */
  required: readonly C[];
  empty: () => T;
  /** Plural shown when the file has no rows: "learners". */
  noun: string;
  validate: (row: T) => Partial<Record<C, string>>;
  /**
   * Called for every row in file order (so it can remember what it has seen);
   * `valid` says whether the row passed validation. Only a valid row's verdict counts.
   */
  classify: (row: T, valid: boolean) => UploadVerdict | undefined;
  /** Another header accepted for a column: { class_name: "lab_name" }. */
  alias?: Partial<Record<C, string>>;
  /** How a missing required column is named in the error. */
  requiredName?: (column: C) => string;
  /** Normalises a mapped row before validation (e.g. value casing). */
  prepare?: (row: T) => void;
  messages?: { duplicateHeaders?: string; fieldCount?: string };
}

/** Maps CSV rows onto the template's columns and classifies each row. */
export function readUploadTable<C extends string, T extends Record<C, string>>(
  table: string[][],
  template: UploadTemplate<C, T>,
): { rows: UploadRow<T>[]; error?: string } {
  if (!table.length) return { rows: [], error: "The file is empty." };
  const header = table[0].map(norm);
  if (new Set(header).size !== header.length)
    return {
      rows: [],
      error: template.messages?.duplicateHeaders ?? "Duplicate column headers.",
    };
  const index = Object.fromEntries(
    template.columns.map((k) => {
      let at = header.indexOf(norm(k));
      const alias = template.alias?.[k];
      if (at < 0 && alias) at = header.indexOf(alias);
      return [k, at];
    }),
  ) as Record<C, number>;
  const missing = template.required
    .filter((k) => index[k] < 0)
    .map((k) => template.requiredName?.(k) ?? k);
  if (missing.length)
    return {
      rows: [],
      error: `Missing template columns: ${missing.join(", ")}. Download the template and keep its header row.`,
    };
  const rows = table.slice(1).map((values, i): UploadRow<T> => {
    const data = template.empty();
    for (const k of template.columns)
      (data as Record<C, string>)[k] =
        index[k] >= 0 ? (values[index[k]] ?? "").trim() : "";
    template.prepare?.(data);
    const errors: string[] = Object.values<string | undefined>(
      template.validate(data),
    ).filter((e): e is string => !!e);
    if (values.length !== header.length)
      errors.push(
        template.messages?.fieldCount ?? "Row has the wrong number of fields",
      );
    const verdict = template.classify(data, !errors.length);
    if (errors.length)
      return { key: i, data, status: "Invalid", message: errors.join("; ") };
    return verdict
      ? { key: i, data, ...verdict }
      : { key: i, data, status: "Valid", message: "Ready to add" };
  });
  if (!rows.length)
    return {
      rows,
      error: `The file has a header row but no ${template.noun}.`,
    };
  return { rows };
}
