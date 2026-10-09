# Exercise 3 Project Rules

## Scope

- Keep this exercise self-contained in `Ex3/`; do not import source files from the Week 1 or Week 2 workspace.
- Use Vite, strict TypeScript, ES modules, and modern DOM APIs. Keep the lifecycle renderer intentionally small and describe the choice in `README.md`.
- Keep changes related to this exercise. Do not add authentication, a backend, a database, or deployment configuration.

## State contract

- The view lifecycle is represented only by `ViewState<T>`: `IDLE`, `LOADING`, `SUCCESS`, or `ERROR`.
- `SUCCESS` carries validated data; `ERROR` carries a human-readable string. `IDLE` and `LOADING` carry neither old data nor an old error.
- Keep transitions explicit and render every state. Do not add parallel lifecycle booleans or use `any`.
- Validate values crossing runtime boundaries with type guards.

## Async work and cleanup

- Loaders accept an `AbortSignal` and return `Promise<Item[]>`.
- Every load supersedes the prior request, aborts it, and receives a monotonically increasing request ID.
- Only the current request may commit a result. Stale `catch` and `finally` paths must not affect current UI or request ownership.
- Dispose invalidates pending work, aborts the active request, and removes listeners owned by the app.
- Mock scenarios are deterministic and clean up their timers and abort listeners.

## UI and safety

- Build UI with semantic DOM APIs. Use `textContent` for feed and error text; never interpolate data into HTML.
- Use one delegated root click listener and remove it on dispose. Do not attach action listeners during render or use inline handlers.
- Keep loading skeletons decorative, expose loading with a polite status announcement, set `aria-busy`, and support reduced motion.
- Keep render failures separate from request failures; render a bounded safe fallback with a retry action.
- Preserve focus by matching the active action across state renders when a replacement control exists.

## Verification and documentation

- Keep tests for transitions, runtime validation, request races, abort, disposal, UI exclusivity, delegated actions, focus, and safe text rendering.
- Run typecheck, tests, and production build before the required feature commit.
- Record only checks actually run and results actually observed in `README.md` and this task decomposition.

## Applied choices and current verification record

- This exercise uses a small direct DOM renderer and controller. It is self-contained and does not import the Ex1/Ex2 engine.
- Demo data is local, deterministic, and in-memory; it is not a production service.
- `npm run check` passed: typecheck, 28 tests across 5 files, and production build. Desktop and 375 CSS-pixel browser checks covered success, failure/retry, skeleton, replacement, empty state, keyboard activation, focus, and console output.
- A separate screen-reader session and an emulated reduced-motion preference were not run; these limits are recorded in `README.md`.
- The required feature commit `c0ba1f2` was created and pushed to `origin/main` after the user confirmed the GitHub identity to use. No existing history was rewritten and no force push was used.
