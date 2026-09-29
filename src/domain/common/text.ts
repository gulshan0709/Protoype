// Small text helpers shared by the domain modules. Pure, so node tests can load it.

/** The value when it is a string, else "" (setup fields and raw cells may be anything). */
export const str = (value: unknown): string =>
  typeof value === "string" ? value : "";

/** Escapes a literal for use inside a RegExp. */
export const escapeRegExp = (text: string) =>
  text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** "first_name" + "last_name" → "Kavita Rao"; blank parts are skipped. */
export const fullName = (person: { first_name?: string; last_name?: string }) =>
  [person.first_name, person.last_name].filter(Boolean).join(" ");
