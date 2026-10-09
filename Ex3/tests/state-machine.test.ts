import { describe, expect, it } from "vitest";
import type { Item, ViewState } from "../src/contracts";
import { isItemArray } from "../src/contracts";
import { transition } from "../src/state-machine";

const item: Item = {
  id: "test-item",
  title: "A test item",
  description: "A short description.",
};

describe("ViewState contract and transitions", () => {
  it("transitions from IDLE through LOADING to SUCCESS", () => {
    const idle: ViewState<Item[]> = { status: "IDLE" };
    const loading = transition(idle, { type: "LOAD" });
    const success = transition(loading, { type: "RESOLVE", data: [item] });

    expect(loading).toEqual({ status: "LOADING" });
    expect(success).toEqual({ status: "SUCCESS", data: [item] });
  });

  it("transitions from IDLE through LOADING to ERROR, then retries to SUCCESS", () => {
    const loading = transition<Item[]>({ status: "IDLE" }, { type: "LOAD" });
    const error = transition(loading, { type: "REJECT", error: "Connection unavailable." });
    const retrying = transition(error, { type: "LOAD" });
    const success = transition(retrying, { type: "RESOLVE", data: [item] });

    expect(error).toEqual({ status: "ERROR", error: "Connection unavailable." });
    expect(retrying).toEqual({ status: "LOADING" });
    expect(success.status).toBe("SUCCESS");
  });

  it("allows SUCCESS with an empty data array", () => {
    const loading = transition<Item[]>({ status: "IDLE" }, { type: "LOAD" });
    const success = transition(loading, { type: "RESOLVE", data: [] });

    expect(success).toEqual({ status: "SUCCESS", data: [] });
    if (success.status === "SUCCESS") expect(success.data).toHaveLength(0);
  });

  it("supports replacement loads and explicit cancellation", () => {
    const loading = transition<Item[]>({ status: "IDLE" }, { type: "LOAD" });
    const replacement = transition(loading, { type: "LOAD" });
    const cancelled = transition(replacement, { type: "CANCEL" });

    expect(replacement).toEqual({ status: "LOADING" });
    expect(cancelled).toEqual({ status: "IDLE" });
  });

  it("ignores completion events outside LOADING", () => {
    const idle: ViewState<Item[]> = { status: "IDLE" };
    const success: ViewState<Item[]> = { status: "SUCCESS", data: [item] };

    expect(transition(idle, { type: "RESOLVE", data: [item] })).toBe(idle);
    expect(transition(success, { type: "REJECT", error: "Old error" })).toBe(success);
    expect(transition(success, { type: "CANCEL" })).toBe(success);
  });

  it("validates item shape and uniqueness before SUCCESS", () => {
    expect(isItemArray([item])).toBe(true);
    expect(isItemArray([])).toBe(true);
    expect(isItemArray([{ ...item, id: "" }])).toBe(false);
    expect(isItemArray([item, { ...item, title: "duplicate id" }])).toBe(false);
    expect(isItemArray([{ id: "missing-fields" }])).toBe(false);
  });
});
