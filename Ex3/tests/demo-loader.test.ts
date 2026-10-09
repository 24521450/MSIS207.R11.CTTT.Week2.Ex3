import { afterEach, describe, expect, it, vi } from "vitest";
import { createDemoLoader } from "../src/demo-loader";

describe("deterministic demo loader", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns stable local sample items for the success scenario", async () => {
    vi.useFakeTimers();
    const loader = createDemoLoader(() => "success");
    const first = loader(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(450);
    const firstItems = await first;

    const second = loader(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(450);
    const secondItems = await second;

    expect(firstItems.length).toBeGreaterThan(0);
    expect(firstItems.map((item) => item.id)).toEqual(secondItems.map((item) => item.id));
    expect(new Set(firstItems.map((item) => item.id)).size).toBe(firstItems.length);
  });

  it("fails once and succeeds on the next load", async () => {
    vi.useFakeTimers();
    const loader = createDemoLoader(() => "fail-once");
    const first = loader(new AbortController().signal);
    const firstFailure = expect(first).rejects.toThrow("demo connection failed");
    await vi.advanceTimersByTimeAsync(450);
    await firstFailure;

    const retry = loader(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(450);
    await expect(retry).resolves.toHaveLength(3);
  });

  it("returns an empty array for the empty scenario", async () => {
    vi.useFakeTimers();
    const loader = createDemoLoader(() => "empty");
    const request = loader(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(450);

    await expect(request).resolves.toEqual([]);
  });

  it("uses a visibly slower delay and cleans timer plus abort listener", async () => {
    vi.useFakeTimers();
    const loader = createDemoLoader(() => "slow");
    const controller = new AbortController();
    const removeListener = vi.spyOn(controller.signal, "removeEventListener");
    const request = loader(controller.signal);

    expect(vi.getTimerCount()).toBe(1);
    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(vi.getTimerCount()).toBe(0);
    expect(removeListener).toHaveBeenCalledWith("abort", expect.any(Function));
  });
});
