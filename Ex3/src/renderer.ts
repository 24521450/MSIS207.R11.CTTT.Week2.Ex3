import {
  DEMO_SCENARIOS,
  type DemoScenario,
  type Item,
  type ViewState,
} from "./contracts";

const SCENARIO_LABELS: Record<DemoScenario, string> = {
  success: "Success",
  "fail-once": "Fail once, then retry",
  slow: "Slow loading",
  empty: "Empty feed",
};

function createElement<K extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: K,
  className?: string,
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  return element;
}

function createButton(
  document: Document,
  label: string,
  action: string,
  focusKey: string,
): HTMLButtonElement {
  const button = createElement(document, "button", "button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.focusKey = focusKey;
  return button;
}

function captureFocusKey(root: HTMLElement): string | null {
  const activeElement = root.ownerDocument.activeElement;
  if (!(activeElement instanceof HTMLElement) || !root.contains(activeElement)) return null;
  return activeElement.dataset.focusKey ?? null;
}

function restoreFocus(root: HTMLElement, focusKey: string | null): void {
  if (!focusKey) return;

  const matchingElement = Array.from(root.querySelectorAll<HTMLElement>("[data-focus-key]")).find(
    (element) => element.dataset.focusKey === focusKey,
  );
  matchingElement?.focus({ preventScroll: true });
}

function createScenarioControls(document: Document, selectedScenario: DemoScenario): HTMLElement {
  const section = createElement(document, "section", "scenario-panel");
  section.setAttribute("aria-labelledby", "scenario-heading");

  const heading = createElement(document, "h2", "section-heading");
  heading.id = "scenario-heading";
  heading.textContent = "Choose a demo";

  const description = createElement(document, "p", "scenario-description");
  description.textContent = "All scenarios use local sample data; no service connection is needed.";

  const controls = createElement(document, "div", "scenario-options");
  controls.setAttribute("role", "group");
  controls.setAttribute("aria-label", "Demo scenarios");

  for (const scenario of DEMO_SCENARIOS) {
    const button = createButton(document, SCENARIO_LABELS[scenario], "choose-scenario", `scenario-${scenario}`);
    button.dataset.scenario = scenario;
    button.setAttribute("aria-pressed", String(scenario === selectedScenario));
    controls.append(button);
  }

  section.append(heading, description, controls);
  return section;
}

function createSkeletonList(document: Document): HTMLUListElement {
  const list = createElement(document, "ul", "item-list skeleton-list");
  list.setAttribute("aria-hidden", "true");

  for (let index = 0; index < 3; index += 1) {
    const listItem = createElement(document, "li", "item-list__entry");
    const article = createElement(document, "article", "feed-card skeleton-card");
    const title = createElement(document, "span", "skeleton skeleton-line skeleton-line--title");
    const line = createElement(document, "span", "skeleton skeleton-line");
    const shortLine = createElement(document, "span", "skeleton skeleton-line skeleton-line--short");
    article.append(title, line, shortLine);
    listItem.append(article);
    list.append(listItem);
  }

  return list;
}

function createItemList(document: Document, items: Item[]): HTMLUListElement {
  const list = createElement(document, "ul", "item-list");

  for (const item of items) {
    const listItem = createElement(document, "li", "item-list__entry");
    listItem.dataset.itemId = item.id;

    const article = createElement(document, "article", "feed-card");
    const title = createElement(document, "h3", "feed-card__title");
    title.textContent = item.title;

    const description = createElement(document, "p", "feed-card__description");
    description.textContent = item.description;

    article.append(title, description);
    listItem.append(article);
    list.append(listItem);
  }

  return list;
}

function createStateRegion(
  document: Document,
  state: ViewState<Item[]>,
): HTMLElement {
  const region = createElement(document, "section", "feed-region");
  region.setAttribute("aria-busy", String(state.status === "LOADING"));

  const heading = createElement(document, "h2", "section-heading feed-region__heading");
  heading.id = "feed-state-heading";

  switch (state.status) {
    case "IDLE": {
      heading.textContent = "Your feed is ready to load";
      const message = createElement(document, "p", "state-message");
      message.textContent = "Load a local sample feed to explore the four-state lifecycle.";
      region.append(heading, message, createButton(document, "Load Data", "load", "primary-action"));
      break;
    }
    case "LOADING": {
      heading.textContent = "Loading your feed";
      const status = createElement(document, "p", "sr-only");
      status.setAttribute("role", "status");
      status.setAttribute("aria-live", "polite");
      status.textContent = "Loading the data feed. Please wait.";
      region.append(heading, status, createSkeletonList(document));

      const actions = createElement(document, "div", "state-actions");
      actions.append(
        createButton(document, "Start another request", "replace-request", "primary-action"),
        createButton(document, "Cancel loading", "cancel", "cancel-action"),
      );
      region.append(actions);
      break;
    }
    case "SUCCESS": {
      heading.textContent = "Your feed";
      if (state.data.length === 0) {
        const emptyState = createElement(document, "p", "empty-state");
        emptyState.setAttribute("role", "status");
        emptyState.textContent = "There are no items in this feed yet. Choose another demo or refresh.";
        region.append(heading, emptyState);
      } else {
        region.append(heading, createItemList(document, state.data));
      }
      region.append(createButton(document, "Refresh", "refresh", "primary-action"));
      break;
    }
    case "ERROR": {
      heading.textContent = "We couldn't load your feed";
      const alert = createElement(document, "p", "error-message");
      alert.setAttribute("role", "alert");
      alert.textContent = state.error;
      region.append(heading, alert, createButton(document, "Retry Connection", "retry", "primary-action"));
      break;
    }
    default: {
      const exhaustiveCheck: never = state;
      return exhaustiveCheck;
    }
  }

  region.setAttribute("aria-labelledby", heading.id);
  return region;
}

export function renderDataFeed(
  root: HTMLElement,
  state: ViewState<Item[]>,
  selectedScenario: DemoScenario,
): void {
  const focusKey = captureFocusKey(root);
  const document = root.ownerDocument;

  const main = createElement(document, "main", "app-shell");
  const header = createElement(document, "header", "hero");
  const eyebrow = createElement(document, "p", "eyebrow");
  eyebrow.textContent = "A resilient UI exercise";
  const title = createElement(document, "h1", "hero__title");
  title.textContent = "Neighbourhood Feed";
  const introduction = createElement(document, "p", "hero__description");
  introduction.textContent = "A small local feed that makes loading, success, and recovery visible.";
  header.append(eyebrow, title, introduction);

  const scenarioControls = createScenarioControls(document, selectedScenario);
  const stateRegion = createStateRegion(document, state);
  main.append(header, scenarioControls, stateRegion);
  root.replaceChildren(main);
  restoreFocus(root, focusKey);
}

export function renderErrorFallback(root: HTMLElement): void {
  const focusKey = captureFocusKey(root);
  const document = root.ownerDocument;
  const main = createElement(document, "main", "app-shell render-fallback");
  const heading = createElement(document, "h1", "hero__title");
  heading.textContent = "The feed could not be displayed";
  const message = createElement(document, "p", "error-message");
  message.setAttribute("role", "alert");
  message.textContent = "A display problem interrupted this view. You can try loading the feed again.";
  main.append(heading, message, createButton(document, "Retry Connection", "retry", "primary-action"));
  root.replaceChildren(main);
  restoreFocus(root, focusKey);
}
