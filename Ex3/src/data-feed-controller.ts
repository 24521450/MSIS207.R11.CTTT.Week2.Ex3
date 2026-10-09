import { isItemArray, type Item, type ItemLoader, type ViewState } from "./contracts";
import { transition, type ViewEvent } from "./state-machine";

export type StateListener = (state: ViewState<Item[]>) => void;

function errorMessage(error: unknown): string {
  if (typeof error === "string" && error.trim().length > 0) return error;

  if (error instanceof Error && error.message.trim().length > 0) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim().length > 0
  ) {
    return error.message;
  }

  return "The data feed could not be loaded. Please try again.";
}

export class DataFeedController {
  private currentState: ViewState<Item[]> = { status: "IDLE" };
  private activeController: AbortController | null = null;
  private requestId = 0;
  private disposed = false;
  private readonly listeners = new Set<StateListener>();

  public constructor(private readonly loader: ItemLoader) {}

  public get state(): ViewState<Item[]> {
    return this.currentState;
  }

  public subscribe(listener: StateListener): () => void {
    if (this.disposed) return () => undefined;

    this.listeners.add(listener);
    listener(this.currentState);

    return () => {
      this.listeners.delete(listener);
    };
  }

  public async load(): Promise<void> {
    if (this.disposed) return;

    const requestId = ++this.requestId;
    const previousController = this.activeController;
    this.activeController = null;
    previousController?.abort();

    const requestController = new AbortController();
    this.activeController = requestController;
    this.commit({ type: "LOAD" });

    try {
      const result: unknown = await this.loader(requestController.signal);
      if (!this.isCurrent(requestId, requestController)) return;

      if (!isItemArray(result)) {
        this.commit({
          type: "REJECT",
          error: "The data feed returned items in an unexpected format.",
        });
        return;
      }

      this.commit({ type: "RESOLVE", data: result });
    } catch (error: unknown) {
      if (!this.isCurrent(requestId, requestController) || requestController.signal.aborted) return;

      this.commit({ type: "REJECT", error: errorMessage(error) });
    } finally {
      if (this.isCurrent(requestId, requestController)) {
        this.activeController = null;
      }
    }
  }

  public cancel(): void {
    if (this.disposed || this.currentState.status !== "LOADING") return;

    this.requestId += 1;
    const activeController = this.activeController;
    this.activeController = null;
    activeController?.abort();
    this.commit({ type: "CANCEL" });
  }

  public dispose(): void {
    if (this.disposed) return;

    this.disposed = true;
    this.requestId += 1;
    const activeController = this.activeController;
    this.activeController = null;
    activeController?.abort();
    this.listeners.clear();
  }

  private isCurrent(requestId: number, requestController: AbortController): boolean {
    return (
      !this.disposed &&
      this.requestId === requestId &&
      this.activeController === requestController
    );
  }

  private commit(event: ViewEvent<Item[]>): void {
    if (this.disposed) return;

    this.currentState = transition(this.currentState, event);
    for (const listener of [...this.listeners]) {
      if (this.disposed) return;
      if (this.listeners.has(listener)) listener(this.currentState);
    }
  }
}
