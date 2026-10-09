import { afterEach, describe, expect, it, vi } from "vitest";
import { createDataFeedApp } from "../src/app";
import type { Item } from "../src/contracts";

const item: Item = {
  id: "delegated-item",
  title: "Delegated result",
  description: "Loaded through the root click listener.",
};

function createRoot(): HTMLDivElement {
  const root = document.createElement("div");
  document.body.append(root);
  return root;
}

function buttonFor(root: HTMLElement, action: string, value?: string): HTMLButtonElement {
  const selector = value
    ? `button[data-action="${action}"][data-scenario="${value}"]`
    : `button[data-action="${action}"]`;
  const button = root.querySelector<HTMLButtonElement>(selector);
  if (!button) throw new Error(`Missing button for action ${action}.`);
  return button;
}

function clickAction(root: HTMLElement, action: string, value?: string): void {
  buttonFor(root, action, value).click();
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe("data feed app event architecture", () => {
  afterEach(() => {
    vi.useRealTimers();
    document.body.replaceChildren();
  });

  it("uses one root listener for nested-button actions and removes it on dispose", async () => {
    const root = createRoot();
    let completeRequest: ((items: Item[]) => void) | undefined;
    let loaderCalls = 0;
    const addListener = vi.spyOn(root, "addEventListener");
    const removeListener = vi.spyOn(root, "removeEventListener");
    const app = createDataFeedApp(root, {
      loader: () => {
        loaderCalls += 1;
        return new Promise<Item[]>((resolve) => {
          completeRequest = resolve;
        });
      },
    });

    const loadButton = buttonFor(root, "load");
    const nestedLabel = document.createElement("span");
    nestedLabel.textContent = "Load feed";
    loadButton.replaceChildren(nestedLabel);
    nestedLabel.click();

    expect(app.controller.state).toEqual({ status: "LOADING" });
    expect(loaderCalls).toBe(1);
    expect(addListener.mock.calls.filter(([type]) => type === "click")).toHaveLength(1);

    completeRequest?.([item]);
    await flushMicrotasks();
    expect(app.controller.state).toEqual({ status: "SUCCESS", data: [item] });
    clickAction(root, "choose-scenario", "empty");
    clickAction(root, "choose-scenario", "slow");
    expect(addListener.mock.calls.filter(([type]) => type === "click")).toHaveLength(1);

    app.dispose();
    expect(removeListener.mock.calls.filter(([type]) => type === "click")).toHaveLength(1);
    root.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(loaderCalls).toBe(1);
  });

  it("makes Retry Connection start a fresh request after the fail-once scenario", async () => {
    vi.useFakeTimers();
    const root = createRoot();
    const app = createDataFeedApp(root);

    clickAction(root, "choose-scenario", "fail-once");
    clickAction(root, "load");
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();
    await vi.advanceTimersByTimeAsync(450);

    expect(app.controller.state.status).toBe("ERROR");
    expect(root.querySelector('[role="alert"]')?.textContent).toContain("demo connection failed");

    clickAction(root, "retry");
    expect(app.controller.state).toEqual({ status: "LOADING" });
    await vi.advanceTimersByTimeAsync(450);

    expect(app.controller.state.status).toBe("SUCCESS");
    expect(root.querySelectorAll("[data-item-id]")).toHaveLength(3);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.querySelector(".skeleton-list")).toBeNull();
    app.dispose();
  });

  it("shows the slow skeleton, replaces a request, and reaches the selected empty state", async () => {
    vi.useFakeTimers();
    const root = createRoot();
    const app = createDataFeedApp(root);

    clickAction(root, "choose-scenario", "slow");
    clickAction(root, "load");
    expect(root.querySelectorAll(".skeleton-card")).toHaveLength(3);
    expect(root.querySelector('[aria-busy="true"]')).not.toBeNull();

    clickAction(root, "choose-scenario", "empty");
    clickAction(root, "replace-request");
    await vi.advanceTimersByTimeAsync(450);

    expect(app.controller.state).toEqual({ status: "SUCCESS", data: [] });
    expect(root.querySelector(".empty-state")).not.toBeNull();
    expect(root.querySelector(".skeleton-list")).toBeNull();
    expect(root.querySelector('[aria-busy="true"]')).toBeNull();

    await vi.advanceTimersByTimeAsync(2_000);
    expect(app.controller.state).toEqual({ status: "SUCCESS", data: [] });
    app.dispose();
  });

  it("catches render errors once and leaves a delegated retry in the fallback", async () => {
    const root = createRoot();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    let loaderCalls = 0;
    const app = createDataFeedApp(root, {
      loader: async () => {
        loaderCalls += 1;
        return [item];
      },
      renderer: () => {
        throw new Error("render defect");
      },
    });

    expect(root.querySelector(".render-fallback h1")?.textContent).toBe("The feed could not be displayed");
    expect(consoleError).toHaveBeenCalledTimes(1);
    clickAction(root, "retry");
    await flushMicrotasks();

    expect(loaderCalls).toBe(1);
    expect(app.controller.state).toEqual({ status: "SUCCESS", data: [item] });
    expect(root.querySelector(".render-fallback h1")).not.toBeNull();
    expect(consoleError).toHaveBeenCalledTimes(1);
    app.dispose();
  });
});
