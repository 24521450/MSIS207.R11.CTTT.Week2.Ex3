export type ViewState<T> =
  | { readonly status: "IDLE" }
  | { readonly status: "LOADING" }
  | { readonly status: "SUCCESS"; readonly data: T }
  | { readonly status: "ERROR"; readonly error: string };

export interface Item {
  readonly id: string;
  readonly title: string;
  readonly description: string;
}

export type ItemLoader = (signal: AbortSignal) => Promise<Item[]>;

export const DEMO_SCENARIOS = ["success", "fail-once", "slow", "empty"] as const;

export type DemoScenario = (typeof DEMO_SCENARIOS)[number];

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isItem(value: unknown): value is Item {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    value.id.trim().length > 0 &&
    typeof value.title === "string" &&
    typeof value.description === "string"
  );
}

export function isItemArray(value: unknown): value is Item[] {
  if (!Array.isArray(value) || !value.every(isItem)) return false;

  const ids = new Set(value.map((item: Item) => item.id));
  return ids.size === value.length;
}

export function isDemoScenario(value: unknown): value is DemoScenario {
  return DEMO_SCENARIOS.some((scenario) => scenario === value);
}
