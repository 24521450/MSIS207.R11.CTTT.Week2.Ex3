import {
  isDemoScenario,
  type DemoScenario,
  type Item,
  type ItemLoader,
} from "./contracts";

const SAMPLE_ITEMS: readonly Item[] = [
  {
    id: "field-notes",
    title: "Field notes from the river path",
    description: "A short update about the new native planting beds and the birds they attract.",
  },
  {
    id: "studio-hours",
    title: "Community studio hours",
    description: "The shared workshop is open on Thursday evening for small repairs and projects.",
  },
  {
    id: "weekend-market",
    title: "Weekend market guide",
    description: "Find local produce, warm bread, and reusable packaging at the south entrance.",
  },
];

const SCENARIO_DELAY_MS: Record<DemoScenario, number> = {
  success: 450,
  "fail-once": 450,
  slow: 2_400,
  empty: 450,
};

function createAbortError(): Error {
  const error = new Error("The request was cancelled.");
  error.name = "AbortError";
  return error;
}

function waitForDelay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;

    const cleanup = (): void => {
      if (timer !== undefined) clearTimeout(timer);
      signal.removeEventListener("abort", onAbort);
    };

    const onAbort = (): void => {
      cleanup();
      reject(createAbortError());
    };

    signal.addEventListener("abort", onAbort, { once: true });
    if (signal.aborted) {
      onAbort();
      return;
    }

    timer = setTimeout(() => {
      cleanup();
      resolve();
    }, milliseconds);
  });
}

export function createDemoLoader(getScenario: () => DemoScenario): ItemLoader {
  let hasFailedOnce = false;

  return async (signal) => {
    const scenario: unknown = getScenario();
    if (!isDemoScenario(scenario)) {
      throw new Error("Choose a valid demo scenario before loading the feed.");
    }

    await waitForDelay(SCENARIO_DELAY_MS[scenario], signal);
    if (signal.aborted) throw createAbortError();

    if (scenario === "fail-once" && !hasFailedOnce) {
      hasFailedOnce = true;
      throw new Error("The demo connection failed. Please retry the feed.");
    }

    if (scenario === "empty") return [];
    return SAMPLE_ITEMS.map((item) => ({ ...item }));
  };
}
