import type { ViewState } from "./contracts";

export type ViewEvent<T> =
  | { readonly type: "LOAD" }
  | { readonly type: "CANCEL" }
  | { readonly type: "RESOLVE"; readonly data: T }
  | { readonly type: "REJECT"; readonly error: string };

export function transition<T>(state: ViewState<T>, event: ViewEvent<T>): ViewState<T> {
  switch (event.type) {
    case "LOAD":
      return { status: "LOADING" };
    case "CANCEL":
      return state.status === "LOADING" ? { status: "IDLE" } : state;
    case "RESOLVE":
      return state.status === "LOADING" ? { status: "SUCCESS", data: event.data } : state;
    case "REJECT":
      return state.status === "LOADING" ? { status: "ERROR", error: event.error } : state;
    default: {
      const exhaustiveCheck: never = event;
      return exhaustiveCheck;
    }
  }
}
