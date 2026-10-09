import { describe, expect, it } from "vitest";
import type { Item } from "../src/contracts";
import { renderDataFeed, renderErrorFallback } from "../src/renderer";

function createRoot(): HTMLDivElement {
  const root = document.createElement("div");
  document.body.append(root);
  return root;
}

describe("data feed renderer", () => {
  it("renders only loading content with an accessible skeleton", () => {
    const root = createRoot();
    renderDataFeed(root, { status: "LOADING" }, "success");

    const region = root.querySelector(".feed-region");
    expect(region?.getAttribute("aria-busy")).toBe("true");
    expect(root.querySelector('[role="status"]')?.textContent).toContain("Loading the data feed");
    expect(root.querySelector(".skeleton-list")?.getAttribute("aria-hidden")).toBe("true");
    expect(root.querySelectorAll(".skeleton-card")).toHaveLength(3);
    expect(root.querySelector(".feed-card__title")).toBeNull();
    expect(root.querySelector('[role="alert"]')).toBeNull();
    root.remove();
  });

  it("renders stable item IDs and text without carrying loading or error content", () => {
    const root = createRoot();
    const items: Item[] = [
      { id: "stable-1", title: "One", description: "First item." },
      { id: "stable-2", title: "Two", description: "Second item." },
    ];
    renderDataFeed(root, { status: "SUCCESS", data: items }, "success");

    expect(Array.from(root.querySelectorAll("[data-item-id]"), (element) => element.getAttribute("data-item-id"))).toEqual([
      "stable-1",
      "stable-2",
    ]);
    expect(root.querySelectorAll(".skeleton-card")).toHaveLength(0);
    expect(root.querySelector('[role="alert"]')).toBeNull();
    expect(root.textContent).toContain("First item.");
    expect(root.querySelector('[aria-busy="false"]')).not.toBeNull();
    root.remove();
  });

  it("renders a clear empty state for SUCCESS with no items", () => {
    const root = createRoot();
    renderDataFeed(root, { status: "SUCCESS", data: [] }, "empty");

    expect(root.querySelector(".empty-state")?.textContent).toContain("no items");
    expect(root.querySelector(".item-list")).toBeNull();
    expect(root.querySelector("button[data-action='refresh']")?.textContent).toBe("Refresh");
    root.remove();
  });

  it("shows error content alone and treats HTML-looking values as text", () => {
    const root = createRoot();
    const hostileText = '<img src=x onerror="window.compromised=true">';
    renderDataFeed(
      root,
      { status: "ERROR", error: hostileText },
      "success",
    );

    expect(root.querySelector('[role="alert"]')?.textContent).toBe(hostileText);
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector(".skeleton-list")).toBeNull();
    expect(root.querySelector(".feed-card")).toBeNull();
    expect(root.querySelector("button[data-action='retry']")?.textContent).toBe("Retry Connection");

    renderDataFeed(
      root,
      {
        status: "SUCCESS",
        data: [{ id: "hostile", title: hostileText, description: hostileText }],
      },
      "success",
    );
    expect(root.querySelector("img")).toBeNull();
    expect(root.querySelector(".feed-card__title")?.textContent).toBe(hostileText);
    expect(root.querySelector(".feed-card__description")?.textContent).toBe(hostileText);
    root.remove();
  });

  it("preserves focus on the matching action after state rerenders", () => {
    const root = createRoot();
    renderDataFeed(root, { status: "IDLE" }, "success");
    root.querySelector<HTMLButtonElement>("[data-focus-key='primary-action']")?.focus();

    renderDataFeed(root, { status: "LOADING" }, "success");
    expect(document.activeElement?.textContent).toBe("Start another request");

    renderDataFeed(root, { status: "SUCCESS", data: [] }, "success");
    expect(document.activeElement?.textContent).toBe("Refresh");
    root.remove();
  });

  it("provides a safe fallback action for rendering errors", () => {
    const root = createRoot();
    renderErrorFallback(root);

    expect(root.querySelector("main h1")?.textContent).toBe("The feed could not be displayed");
    expect(root.querySelector('[role="alert"]')).not.toBeNull();
    expect(root.querySelector("button[data-action='retry']")?.textContent).toBe("Retry Connection");
    root.remove();
  });
});
