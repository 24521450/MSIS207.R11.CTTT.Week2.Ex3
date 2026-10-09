# Exercise 3 Task Decomposition

Workflow: contract → state machine → async controller → UI → verification → documentation.

## 1. Contract-first setup

- [x] Confirm the target repository and keep it separate from the Week 2 workspace repository.
- [x] Define `ViewState<T>`, `Item`, `ItemLoader`, runtime guards, and deterministic demo scenario types.
- [x] Record project constraints and this work breakdown before implementation.

## 2. State machine

- [x] Implement the pure transition function for start, resolve, reject, and explicit cancel.
- [x] Verify each legal lifecycle path and reject stale/invalid runtime data.

## 3. Async controller

- [x] Implement `AbortController`, request IDs, stale-result guards, safe unknown-error conversion, and guarded `finally` cleanup.
- [x] Implement cancel and dispose behavior, including unsubscription and late completion.
- [x] Implement deterministic mock success, fail-once, slow, and empty scenarios with timer cleanup.

## 4. UI

- [x] Implement semantic rendering for IDLE, LOADING, SUCCESS, and ERROR with exclusive state content.
- [x] Add responsive CSS skeletons, reduced-motion support, ARIA announcements, and keyboard-visible focus.
- [x] Add delegated actions, scenario selection, safe render fallback, and focus retention across rerenders.

## 5. Verification

- [x] Add state-machine and runtime-guard tests.
- [x] Add concurrency tests including a loader that ignores abort, late completion after dispose, and stale `finally` behavior.
- [x] Add UI tests for skeleton, retry, empty state, delegation, listener count, focus, and text-only rendering.
- [x] Run typecheck, automated tests, and production build; inspect the running UI on desktop and a narrow viewport.

## 6. Documentation and commit

- [x] Document architecture, transitions, cancellation, scenarios, commands, observed results, limits, and any browser checks not completed.
- [x] Review the final diff and stage only this task's files.
- [x] Create the required commit: `feat(ui): implement multi-state data component with skeleton feedback`.

Commit note: Required commit `c0ba1f2` was created with the user-confirmed GitHub profile identity and pushed to `origin/main`. The identity configuration is local to this Exercise 3 checkout.
