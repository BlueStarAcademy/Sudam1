# Realtime State Refactor Roadmap

## 1. Current Situation (Audit Summary)
- `hooks/useApp.ts` encapsulates ~2.8 KLOC of stateful logic: authentication, route state, WebSocket lifecycle, domain caches (users/games/inventory/chat), UI modal flags and audio/theme settings.
- Server actions respond over HTTP and _also_ broadcast entire user records via WebSocket. The client side throttles those updates with manual timers (`lastActionProcessedTime`, `ignoreDuration`) to prevent overwriting POST responses, leading to inconsistent UI refreshes (e.g. equipment toggles).
- WebSocket payloads are domain-agnostic blobs (`USER_UPDATE`, `INITIAL_STATE_*`). Clients must diff/merge manually, causing heavy renders and subtle race bugs when multiple domains mutate the session concurrently.
- No shared event bus or selector-based subscription. Every component reads `AppContext`, so any state change forces a deep rerender tree even for unrelated domains.
- Server broadcast layer (`server/socket.ts`) cannot target individual users (no connection → user mapping), so every event is global.

## 2. Goals
1. Deterministic state propagation: POST response or socket event should always update the same canonical store without race conditions.
2. Domain-isolated subscriptions so UI fragments re-render only when relevant slices change.
3. Predictable server → client event contract (typed, versioned payloads) with minimal over-the-wire footprint.
4. Deployment readiness: structure must scale to 1 K concurrent users without rerender storms or redundant traffic.

## 3. Proposed Client Architecture

### 3.1 State Layer
- Introduce a lightweight global store (Zustand or Redux Toolkit). Recommendation: **Zustand + immer** for minimal boilerplate and selectors.
- Organize by domains:
  - `src/state/userStore.ts` (`currentUser`, inventory/equipment, balances).
  - `src/state/gameStore.ts` (live matches, single-player, tower).
  - `src/state/socialStore.ts` (chat, negotiations, guild once added).
  - `src/state/uiStore.ts` (modal flags, nonpersistent UI toggles).
- Expose typed selectors and actions; avoid exposing raw setters.

### 3.2 Data Flow
```
HTTP Actions → action client → (optional optimistic draft) → await response → domain updater (state store)
WebSocket messages → wsClient → event router → domain handler → store patch
```
- HTTP action responses become authoritative for the initiating user. They dispatch store updates via domain-specific reducers.
- WebSocket events are routed through a central `eventBus` (`src/realtime/eventRouter.ts`). Each event has:
  - `type`: e.g. `user.inventory.updated`, `game.singlePlayer.updated`
  - `payload`: typed DTO
  - Optional `meta` (version, emittedAt, correlationId for dedupe)
- Client handlers decide whether to merge/replace based on `payload.version` vs store snapshot, eliminating `ignoreDuration` hacks.

### 3.3 React Integration
- Replace `AppContext` with thin providers:
  - `AppShell` handles routing/session bootstrap.
  - Components read from selectors via `useStore(selector)` to minimize rerenders.
  - Derived/computed values (e.g. `hasClaimableQuest`) live in memoized selectors rather than inside a monolithic hook.

### 3.4 Transition Strategy
- Implement stores alongside existing `useApp`. Gradually migrate consumers:
  1. Carve out read-only selectors for critical UI (inventory/equipment).
  2. Replace `currentUser` references with `useUserStore`.
  3. Remove redundant state from `useApp` once no longer referenced.
- Keep compatibility by bridging: `AppContext` simply proxies the new stores during transition to avoid breaking untouched screens.

## 4. Proposed Server/Event Refactor
- Introduce domain broadcasters (`server/events/userEvents.ts`, `server/events/gameEvents.ts`). Each exports helpers like `publishUserInventoryUpdated(userId, payload)`.
- Maintain a `connectionRegistry` mapping `userId → Set<WebSocket>` (populate during auth handshake; reuse existing cookie/JWT to authenticate on socket connect).
- Emit typed events rather than whole user records. Example payload:
  ```json
  {
    "type": "user.inventory.updated",
    "version": 7,
    "payload": {
      "userId": "abc123",
      "inventory": [...],
      "equipment": {...}
    }
  }
  ```
- Include monotonically increasing `version` per domain/user to allow client-side stale event rejection.
- For large initial state, replace giant payload with modular fetches:
  1. On connect, send `SESSION_BOOTSTRAP` containing tokens/ids.
  2. Client fires parallel REST fetches (`/api/me`, `/api/games/active`, etc.) seeded into stores.
  3. Socket delivers incremental updates only.

## 5. Implementation Phases
### Phase 1 – Foundation
1. Add Zustand (or chosen store dependency) and create `state/` modules with TypeScript interfaces.
2. Build `realtime/wsClient.ts` with reconnect + exponential backoff (reuse existing logic).
3. Mirror current WebSocket contract but funnel updates through the new store actions.
4. Update action client (`services/actionClient.ts`) to dispatch store updates on success.

### Phase 2 – Incremental Migration
1. Migrate inventory/equipment flows and remove manual `sessionStorage` sync.
2. Transition single-player game state, removing `flushSync` and `updateTrigger`.
3. Split UI modal flags into `uiStore`; refactor components to subscribe via selectors.
4. Delete unused logic from `useApp`, keeping only routing/auth bootstrap.

### Phase 3 – Server Event Contract
1. Implement connection registry and authenticated socket handshake.
2. Emit typed events from server actions; adapt client router to new schema.
3. Introduce versioning/deduplication; log rejected stale events for observability.
4. Add integration tests (Jest/supertest) for action → event emission.

### Phase 4 – Hardening & Tooling
1. Add devtools: Redux/Zustand devtools toggle in development, socket event logger.
2. Performance audit (React Profiler) to ensure selector-based rerenders stay bounded.
3. Prepare load-test scripts (k6/Locust) for 1 K users focusing on WebSocket churn.
4. Document new conventions in `docs/architecture/state.md`.

## 6. Risks & Mitigations
- **Large Migration Surface**: Start with high-impact domains (inventory/equipment) and keep bridges until completion.
- **Socket Auth Complexity**: Reuse existing session token; fall back to REST polling until socket handshake completes.
- **Version Drift**: Enforce event typings via shared `types/realtime.ts` imported by both client/server.
- **Temporary Double State**: Implement automated lint rule or test ensuring no component accesses deprecated `useApp` slices.

## 7. Next Steps
1. Scaffold state + realtime directories (`src/state`, `src/realtime`).
2. Implement `useUserStore` and migrate `SinglePlayerControls` as the first consumer.
3. Draft ADR for WebSocket contract changes and review with backend owner.
4. Once Phase 1 PR merged, proceed to deployment-environment setup (Task `deployment_setup`).


