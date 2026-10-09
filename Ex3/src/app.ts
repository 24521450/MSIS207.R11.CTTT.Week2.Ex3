import {
  isDemoScenario,
  type DemoScenario,
  type Item,
  type ItemLoader,
  type ViewState,
} from "./contracts";
import { DataFeedController } from "./data-feed-controller";
import { createDemoLoader } from "./demo-loader";
import { renderDataFeed, renderErrorFallback } from "./renderer";

export type FeedRenderer = (
  root: HTMLElement,
  state: ViewState<Item[]>,
  selectedScenario: DemoScenario,
) => void;

export interface DataFeedAppOptions {
  readonly loader?: ItemLoader;
  readonly renderer?: FeedRenderer;
}

export interface DataFeedApp {
  readonly controller: DataFeedController;
  dispose(): void;
}

function findActionButton(root: HTMLElement, target: EventTarget | null): HTMLButtonElement | null {
  if (!(target instanceof Element)) return null;

  const button = target.closest<HTMLButtonElement>("button[data-action]");
  if (!button || !root.contains(button) || button.disabled) return null;
  return button;
}

export function createDataFeedApp(root: HTMLElement, options: DataFeedAppOptions = {}): DataFeedApp {
  let selectedScenario: DemoScenario = "success";
  let renderFailed = false;
  let disposed = false;
  const loader = options.loader ?? createDemoLoader(() => selectedScenario);
  const renderer = options.renderer ?? renderDataFeed;
  const controller = new DataFeedController(loader);

  const render = (state: ViewState<Item[]>): void => {
    if (disposed || renderFailed) return;

    try {
      renderer(root, state, selectedScenario);
    } catch (error: unknown) {
      renderFailed = true;
      console.error("Data feed render failure:", error);
      try {
        renderErrorFallback(root);
      } catch (fallbackError: unknown) {
        console.error("Data feed fallback render failure:", fallbackError);
      }
    }
  };

  const onRootClick = (event: MouseEvent): void => {
    const button = findActionButton(root, event.target);
    if (!button) return;

    switch (button.dataset.action) {
      case "choose-scenario": {
        const scenario: unknown = button.dataset.scenario;
        if (!isDemoScenario(scenario)) return;
        selectedScenario = scenario;
        render(controller.state);
        return;
      }
      case "load":
      case "refresh":
      case "retry":
      case "replace-request":
        void controller.load();
        return;
      case "cancel":
        controller.cancel();
        return;
      default:
        return;
    }
  };

  root.addEventListener("click", onRootClick);
  const unsubscribe = controller.subscribe(render);

  return {
    controller,
    dispose: (): void => {
      if (disposed) return;
      disposed = true;
      root.removeEventListener("click", onRootClick);
      unsubscribe();
      controller.dispose();
      root.replaceChildren();
    },
  };
}
