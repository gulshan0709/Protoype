export type IndustryId = "education" | "corporate" | "retail" | "manufacturing";
export type Tone =
  | "healthy"
  | "attention"
  | "critical"
  | "pending"
  | "unavailable"
  | "complete"
  | "neutral";
export type Cell =
  | string
  | number
  | {
      primary?: string;
      secondary?: string;
      label?: string;
      value?: string;
      meta?: string;
      tone?: Tone;
    };
export interface Status {
  label: string;
  tone: Tone;
}
export interface Action {
  id: string;
  label: string;
  kind?: string;
  requiresReason?: boolean;
}
export interface Item {
  label: string;
  value: Cell;
  tone?: Tone;
  meta?: string;
}
export interface Panel {
  title: string;
  subtitle?: string;
  items: Item[];
}
export interface RecordDetail {
  title: string;
  eyebrow: string;
  summary: string;
  facts: Item[];
  sections: { title: string; description?: string; items: Item[] }[];
  timeline: { time: string; event: string; actor?: string }[];
  permittedActions: Action[];
  related?: Item[];
}
export interface DataRecord {
  id: string;
  type: string;
  cells: Record<string, Cell>;
  state: Status;
  action: string;
  detail: RecordDetail;
  scope: string[];
  [key: string]: unknown;
}
export interface Metric {
  label: string;
  value: string;
  context: string;
  tone: Tone;
  drill?: string;
  valuesByScope?: Record<string, string>;
  contextsByScope?: Record<string, string>;
  denominator?: string;
}
export interface PageContract {
  id: string;
  heading: string;
  description: string;
  detailType: string;
  recordLabel?: string;
  metrics: Metric[];
  columns: { id: string; label: string; type: string }[];
  filters: {
    id: string;
    label: string;
    options: (string | { label: string; value: string })[];
  }[];
  records: DataRecord[];
  sidePanels: Panel[];
  sources: { label: string; value: string; tone: Tone; impact: string }[];
  states: Record<string, string>;
  primaryAction?: Action;
  banner?: { title: string; text: string; tone: Tone };
  variants?: Record<string, PageContract>;
}
export interface Persona {
  label: string;
  home: string;
  scopes: string[];
  products: string[];
  organization: string[];
}
export interface Industry {
  id: IndustryId;
  label: string;
  tenant: string;
  core: {
    roles: Record<string, Persona>;
    productFamilies: Record<string, { family: string; icon: string }>;
    productTabs: Record<string, Record<string, string[]>>;
  };
  pages: Record<
    string,
    Record<"org" | "product", Record<string, Record<string, PageContract>>>
  >;
}
export interface Workspace {
  industry: IndustryId;
  role: string;
  scope: string;
}
export interface Location {
  type: "org" | "product";
  name: string;
  tab: string;
  record?: string;
  metric?: string;
}
export interface AuditEvent {
  id: string;
  recordId: string;
  pageId: string;
  action: string;
  actionId?: string;
  reason: string;
  at: string;
  actor: string;
  workspace: Workspace;
}
