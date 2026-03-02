# Architecture Notes: `@omnicajs/vue-remote`

This document is a practical map of the repository for both humans and coding agents.
It explains what the project does, where the logic lives, and how data moves between runtime parts.

## 1. Purpose

`@omnicajs/vue-remote` lets a Vue app run in a **remote runtime** (iframe, worker, window, socket bridge, etc.)
while rendering UI in a **host runtime**.

At runtime, the remote side builds a virtual tree of remote nodes, serializes changes into protocol actions,
and sends them over a transport channel. The host side reconstructs that tree and renders it with Vue.

## 2. High-Level Model

```text
Remote Vue app
  -> vue/remote renderer
  -> dom/remote tree operations
  -> channel actions (mount/insert/update/remove/invoke)
  -> transport (RPC bridge provided by integrator)
  -> dom/host receiver
  -> vue/host HostedTree + provider
  -> Host Vue VNode tree
  -> Real host DOM
```

The library is transport-agnostic at the core level: the only requirement is a function-compatible `Channel`.

## 3. Core Concepts and Entities

1. `Channel`
- A callable action dispatcher (`mount`, `insert-child`, `remove-child`, `update-*`, `invoke`).
- Defined in `src/dom/common/channel.ts`.

2. Serialized nodes (`Serialized*`)
- Transport format shared between host and remote.
- Kinds: `root`, `component`, `text`, `comment`, `fragment`.
- Defined in `src/dom/common/tree.ts`.

3. Remote tree (`Remote*`)
- Mutable tree API used by remote runtime.
- Owns creation, structural edits, property updates, and method invocation requests.
- Main entry: `src/dom/remote/tree/root.ts`.

4. Received tree (`Received*`)
- Host-side in-memory representation produced from incoming actions.
- Managed by `createReceiver()`.
- Main entry: `src/dom/host/receiver.ts`.

5. Hosted tree (`Hosted*`)
- Vue-reactive wrappers around `Received*` nodes.
- Used by `HostedTree` to render host-side Vue VNodes.
- Main entry: `src/vue/host/useReceived.ts`.

6. Provider
- Host-side registry that maps remote component type names to local Vue components.
- Main entry: `src/vue/host/createProvider.ts`.

7. Remote component schema
- Type-level contract for remote component props/methods/children.
- Main types: `SchemaType`, `PropertiesOf`, `MethodsOf`, `ChildrenOf`.
- Defined in `src/dom/remote/schema.ts`.

## 4. Repository Layout

`src/dom/common/`
- Shared wire protocol primitives: actions, channel typing, serialized node kinds.

`src/dom/remote/`
- Remote runtime tree model and operations.
- Function-prop proxying logic (`proxy.ts`) for stable callbacks across updates.

`src/dom/host/`
- Receiver, tree reconstruction, update queue, invoke handler registry.
- Converts protocol actions to host-side state mutations.

`src/vue/remote/`
- Custom Vue renderer targetting remote DOM tree (`createRemoteRenderer`).
- Remote Vue component helpers (`defineRemoteComponent`, slot adaptation).

`src/vue/host/`
- `HostedTree` component and render pipeline from `Received*` to host VNodes.
- Event serialization for function props/events crossing runtimes.

`src/common/`
- Generic helpers and DOM tag lists used by host/remote adapters.

`types/`
- Shared type declarations (`events`, host provider interfaces, utility types).

`tests/`
- `unit/`: isolated behavior.
- `integration/`: host + remote flow with Vue runtime.
- `e2e/`: browser-level scenarios (Playwright) with scaffolded host/remote apps.

`web/`
- Astro/Starlight documentation source.

`docs/`
- Repository notes for contributors and agents (this file, Astro ops docs, etc.).

## 5. Runtime Lifecycle

1. Bootstrap
- Host creates `receiver` (`createReceiver`) and passes `receiver.receive` to remote runtime through transport.
- Remote creates `root` (`createRemoteRoot(channel)`), mounts Vue app via `createRemoteRenderer(root).createApp(...)`.

2. Initial mount
- Remote calls `root.mount()`, sending `ACTION_MOUNT` with serialized root children.
- Host receiver deserializes nodes, attaches them into context map, emits `mount`, enqueues updates.

3. Incremental updates
- Remote structural/property/text changes send `ACTION_INSERT_CHILD`, `ACTION_REMOVE_CHILD`,
  `ACTION_UPDATE_PROPERTIES`, `ACTION_UPDATE_TEXT`.
- Host applies mutations and notifies subscribers through updater queue (`receiver.flush()` resolves queue completion).

4. Event and callback round-trip
- Host render wraps function props/events and serializes browser event objects (`src/vue/host/events.ts`).
- Remote receives and executes proxied callbacks.

5. Host method invocation from remote
- Remote component can call `invoke(method, ...payload)`.
- Host registers invoke handlers per received node ID (`receiver.tree.invokable(...)`).

6. Teardown
- Integrator calls remote `release()` (outside this package, usually via RPC endpoint contract).
- Both sides must release retained references (`retain/release` from `@remote-ui/rpc`) and unmount app.

## 6. Key Implementation Notes

1. Node ownership is strict per remote root
- Remote insert/append/invoke validates node ownership via context (`context.nodes`).
- Cross-root node usage throws.

2. `children` property is reserved in component props
- On remote component creation/update, `children` prop is filtered out to avoid ambiguity with actual child nodes.

3. Function props are proxied, not replaced directly
- `src/dom/remote/proxy.ts` keeps function references stable and updates `__current` targets.
- Prevents stale callback execution when props change quickly.

4. Local-vs-remote update timing
- `context.update()` currently applies local mutations immediately and sends remote update without waiting for remote ack.
- `receiver.flush()` only guarantees host-side updater queue completion.

5. Slots
- Named slots are adapted using synthetic `RemoteSlot` nodes (`src/vue/remote/slots.ts`, `src/vue/internals.ts`).
- Host render converts them into Vue slot functions (`toSlots` in `src/vue/host/render.ts`).

## 7. Public API Entry Points

Build output exposes two main entries:

1. Host entry
- Source: `src/vue/host/index.ts`
- Includes `HostedTree`, `createProvider`, `createReceiver`, host-side types/constants.

2. Remote entry
- Source: `src/vue/remote/index.ts`
- Includes `createRemoteRenderer`, `createRemoteRoot`, `defineRemoteComponent`, remote-side types/constants.

Vite library config: `vite.config.ts`.

## 8. Where To Change What

If you need to add a new protocol action:
- Update `src/dom/common/channel.ts`.
- Implement send path in remote (`src/dom/remote/**`).
- Implement receive path in host (`src/dom/host/receiver.ts` + possibly context/tree handling).
- Add integration coverage under `tests/integration/dom/`.

If you need to change rendering semantics:
- Remote render behavior: `src/vue/remote/createRemoteRenderer.ts`.
- Host render behavior: `src/vue/host/render.ts` and `src/vue/host/useReceived.ts`.

If you need to add new event serialization:
- Extend `src/vue/host/events.ts`.
- Add integration/e2e tests for round-trip payload shape.

If you need to add/adjust host component mapping:
- `src/vue/host/createProvider.ts`.
- Integration fixtures in `tests/integration/fixtures/host/`.

If you need transport/runtime docs:
- English docs: `web/content/docs/*.mdx`.
- Russian docs: `web/content/docs/ru/*.mdx`.

## 9. Test Strategy Map

1. Unit tests (`tests/unit/`)
- Isolated utilities and localized behavior.

2. Integration tests (`tests/integration/`)
- Primary correctness suite for host/remote synchronization, events, invoke, slots, lifecycle.

3. E2E tests (`tests/e2e/`)
- Real browser runs with transport scaffolding and full flow checks.

For architecture-impacting changes, integration tests are the first required signal.

## 10. CI/Release Notes (Current Setup)

1. Main CI workflow
- `.github/workflows/tests.yml`
- Runs actionlint, lint/test/e2e matrix jobs.

2. Release workflow
- `.github/workflows/release.yml`
- Manual dispatch with release type (`auto|patch|minor|major`) and prerelease channel (`none|alpha|beta|rc`),
  then publishes to npm using `NPM_TOKEN`.
- Includes docs publishing job `docs_pages` after npm publish.

3. Shared workflow setup action
- `.github/actions/setup-node-deps/action.yml`
- Standardizes Node setup + Yarn cache + dependency install.
