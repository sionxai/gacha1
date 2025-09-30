# Gacha Web RPG – Low Level Design

_Last updated: 2025-03-17_

## 1. Architecture Overview
- **Client**: Modular ES modules (`app.js`, `battle.js`, `pvp.js`, etc.) running in the browser. Shared utilities via `combat-core.js`, `gacha-system.js`, `ui-utils.js`.
- **Backend**: Firebase Realtime Database as source of truth; Cloud Functions (`functions/index.js`) mirror profiles and manage snapshots.
- **State Management**: Central `state` object (see `app-context.js`); specialized modules (`state/*.js`) expose getters/setters.

## 2. Module Responsibilities
### app.js
- Handles main gacha UI, admin controls, slot-machine animations, mailbox integration.
- Maintains `slotMachineState`; interacts with Firebase for profile persistence.
- Entry point for quest configuration and config synchronization.

### battle.js
- PvE battle flow: enemy scaling, status effects, ultimate handling, auto-session (hell mode) logic.
- Synchronizes battle outcomes to profile (`queueProfileUpdate`).

### pvp.js & pvp-battle-sim.js
- PvP lobby and simulation utilities; calculates turn-by-turn results offline.
- Shares combat helpers with battle module.

### mailbox.js & mail-service.js
- Mailbox UI widget, reward claiming, Firebase path resolution, key sanitization.
- `enqueueMail` ensures fail-fast UID validation and mailbox/user_mail fallback.

## 3. Data Flow & Persistence
- User session bootstrap: `auth.js` → Firebase Auth → profile load (`loadOrInitializeProfile`).
- Gacha draw: client computes results (with seeded RNG when configured), updates profile, enqueues animations, logs.
- Rewards: quests & admin grants push entries via `enqueueMail`, users claim via mailbox UI -> DB updates.
- Cloud Functions mirror `/users` to `/mirrors/{uid}` and snapshot hourly to `/snapshots/{uid}`.

## 4. Slot Machine Flow (Recent Changes)
1. `showSlotMachineWithActualDraw` primes overlay, sets mode, triggers `runDraws`.
2. `runSingleSlotAnimationWithResult` / `runMultiSlotAnimationWithResults` orchestrate deterministic animations using `stopAtTargetTier`.
3. `finalizeSingleSlot` & `finalizeMultiSlot` centralize completion messaging and `triggerOriginalDraw` invocation.
4. Skip handling uses `slotMachineState.skipRequested` to short-circuit animations safely.

## 5. Key Algorithms
- **Probability selection**: `chooseTier` from `gacha-system.js`, backed by normalized weight maps.
- **Stat rolls**: `rollStatFor` ensures base stat within tier min/max; `effectiveStat` computes gear power.
- **Combat resolution**: Damage = `(attacker.atk * multiplier) - defender.def` (bounded); statuses adjust stats per turn.
- **Auto-session hell mode**: `openHell`/`closeHell` manage forced difficulty and timers, persisting to profile/localStorage.

## 6. Error Handling Strategy
- Firebase writes wrapped with try/catch + retries via `queueProfileUpdate` timers.
- Mail delivery logs path fallback; invalid UIDs throw before DB interaction.
- Slot-machine DOM guards return structured skip objects to avoid `ReferenceError`.

## 7. Testing & Tooling
- Node test runner (`npm test`) executes smoke suite (`test-smoke.js`) plus module-specific tests.
- ESLint (`eslint.config.js`) enforces browser + Node linting (functions dir override).
- Future work: integrate Jest or node:test suites for battle & gacha logic (Phase 2).

## 8. Extension Points / TODOs
- Add telemetry hooks (Phase 2) at gacha draw, battle resolution, auth events.
- Implement deterministic slot machine fallback removal (now unused helper functions cleaned up).
- Expand Cloud Functions for moderation tools (pending PRD decisions).

