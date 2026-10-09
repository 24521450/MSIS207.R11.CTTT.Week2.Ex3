import { describe, expect, it, vi } from "vitest";
import { DataFeedController } from "../src/data-feed-controller";
import type { Item } from "../src/contracts";

interface Deferred<T> {
  readonly promise: Promise<T>;
  resolve(value: T): void;
  reject(reason: unknown): void;
}

function deferred<T>(): Deferred<T> {
  let resolvePromise: (value: T) => void = () => undefined;
  let rejectPromise: (reason: unknown) => void = () => undefined;
  const promise = new Promise<T>((resolve, reject) => {
    resolvePromise = resolve;
    rejectPromise = reject;
  });

  return {
    promise,
    resolve: (value) => resolvePromise(value),
    reject: (reason) => rejectPromise(reason),
  };
}

const itemA: Item = { id: "a", title: "Request A", description: "Older response." };
const itemB: Item = { id: "b", title: "Request B", description: "Current response." };

describe("DataFeedController", () => {
  it("commits a successful response and publishes lifecycle changes", async () => {
    const listener = vi.fn();
    const controller = new DataFeedController(async () => [itemA]);
    controller.subscribe(listener);

    await controller.load();

    expect(listener.mock.calls.map(([state]) => state.status)).toEqual([
      "IDLE",
      "LOADING",
      "SUCCESS",
    ]);
    expect(controller.state).toEqual({ status: "SUCCESS", data: [itemA] });
  });

  it("turns unknown rejection values into a safe string error", async () => {
    const controller = new DataFeedController(async () => Promise.reject({ code: "OFFLINE" }));

    await controller.load();

    expect(controller.state).toEqual({
      status: "ERROR",
      error: "The data feed could not be loaded. Please try again.",
    });
  });

  it("accepts string errors and rejects malformed runtime data", async () => {
    const stringError = new DataFeedController(async () => Promise.reject("No connection."));
    await stringError.load();
    expect(stringError.state).toEqual({ status: "ERROR", error: "No connection." });

    const malformed = new DataFeedController(
      async () => "not an item array" as unknown as Item[],
    );
    await malformed.load();
    expect(malformed.state).toEqual({
      status: "ERROR",
      error: "The data feed returned items in an unexpected format.",
    });
  });

  it("keeps B when a non-cooperative request A resolves later", async () => {
    const requests: Deferred<Item[]>[] = [];
    const signals: AbortSignal[] = [];
    const controller = new DataFeedController((signal) => {
      signals.push(signal);
      const request = deferred<Item[]>();
      requests.push(request);
      return request.promise;
    });

    const requestA = controller.load();
    const requestB = controller.load();
    expect(signals[0]?.aborted).toBe(true);
    expect(controller.state).toEqual({ status: "LOADING" });

    requests[1]?.resolve([itemB]);
    await requestB;
    requests[0]?.resolve([itemA]);
    await requestA;

    expect(controller.state).toEqual({ status: "SUCCESS", data: [itemB] });
  });

  it("does not surface replacement aborts as connection errors", async () => {
    const secondRequest = deferred<Item[]>();
    const signals: AbortSignal[] = [];
    let callCount = 0;
    const controller = new DataFeedController((signal) => {
      signals.push(signal);
      callCount += 1;
      if (callCount === 1) {
        return new Promise<Item[]>((_resolve, reject) => {
          signal.addEventListener(
            "abort",
            () => {
              const error = new Error("aborted");
              error.name = "AbortError";
              reject(error);
            },
            { once: true },
          );
        });
      }
      return secondRequest.promise;
    });

    const oldRequest = controller.load();
    const currentRequest = controller.load();
    await oldRequest;

    expect(signals[0]?.aborted).toBe(true);
    expect(controller.state).toEqual({ status: "LOADING" });

    secondRequest.resolve([itemB]);
    await currentRequest;
    expect(controller.state).toEqual({ status: "SUCCESS", data: [itemB] });
  });

  it("does not let an old finally block clear the current controller", async () => {
    const requests: Deferred<Item[]>[] = [];
    const signals: AbortSignal[] = [];
    const controller = new DataFeedController((signal) => {
      signals.push(signal);
      const request = deferred<Item[]>();
      requests.push(request);
      return request.promise;
    });

    const requestA = controller.load();
    const requestB = controller.load();
    requests[0]?.resolve([itemA]);
    await requestA;

    controller.cancel();

    expect(signals[1]?.aborted).toBe(true);
    expect(controller.state).toEqual({ status: "IDLE" });
    requests[1]?.resolve([itemB]);
    await requestB;
    expect(controller.state).toEqual({ status: "IDLE" });
  });

  it("cancels a load to IDLE and ignores its late result", async () => {
    const request = deferred<Item[]>();
    let signal: AbortSignal | undefined;
    const controller = new DataFeedController((nextSignal) => {
      signal = nextSignal;
      return request.promise;
    });

    const loading = controller.load();
    controller.cancel();
    request.resolve([itemA]);
    await loading;

    expect(signal?.aborted).toBe(true);
    expect(controller.state).toEqual({ status: "IDLE" });
  });

  it("ignores a non-cooperative completion after dispose and releases subscribers", async () => {
    const request = deferred<Item[]>();
    const listener = vi.fn();
    const controller = new DataFeedController(() => request.promise);
    controller.subscribe(listener);
    const loading = controller.load();
    const callsBeforeDispose = listener.mock.calls.length;

    controller.dispose();
    request.resolve([itemA]);
    await loading;

    expect(listener).toHaveBeenCalledTimes(callsBeforeDispose);
    expect(controller.state).toEqual({ status: "LOADING" });
    expect(controller.subscribe(listener)).toBeTypeOf("function");
    expect(listener).toHaveBeenCalledTimes(callsBeforeDispose);
    await controller.load();
    expect(listener).toHaveBeenCalledTimes(callsBeforeDispose);
  });
});
