# Gacha Web RPG – Implementation Plan

_Last updated: 2025-03-17_

## Guiding Principles
- Ship playable, stable experiences first; follow with depth and polish.
- Keep live game data safe: treat Firebase writes as critical path items.
- All feature work must align with `PRD.md` and implementation details in `LLD.md`.

## Roadmap Overview

- [x] **Phase 0 – Stabilize existing experience**  
  Runtime stopper fixes, mail UID hardening, lint baseline to green.
- [ ] **Phase 1 – Core gameplay polish**  
  Tighten slot-machine UX, quest progression, PvE encounter balance.
- [ ] **Phase 2 – Live service foundations**  
  Admin tooling, analytics hooks, automated test coverage expansion.
- [ ] **Phase 3 – Social & competitive layer**  
  PvP matchmaking improvements, chat moderation, seasonal ladders.
- [ ] **Phase 4 – Content & monetization**  
  New gacha banners, events, storefront tuning, live ops automation.

## Phase Detail & Status Tracking

### Phase 1 – Core Gameplay Polish
- [ ] **S1.1 Slot-machine UX pass** – Integrate deterministic animations, consolidate duplicate flows, ensure skip states resolve cleanly.
- [ ] **S1.2 Quest & reward loop tuning** – Review quest rewards vs. economy; document changes in `PRD.md`.
- [ ] **S1.3 PvE balance sweep** – Adjust difficulty scaling (`battle.js`) and update `LLD.md` combat formulas.

### Phase 2 – Live Service Foundations
- [ ] **S2.1 Admin surface audit** – Ensure admin panel mirrors backend state, add safe guards.
- [ ] **S2.2 Telemetry & logging** – Hook critical flows to analytics endpoints (spec in LLD).
- [ ] **S2.3 Automated tests** – Expand smoke tests, introduce CI-ready suites.

### Phase 3 – Social & Competitive Layer
- [ ] **S3.1 PvP matchmaking** – Design & implement ranking buckets and match flow.
- [ ] **S3.2 Chat & mailbox moderation** – Rate limits, profanity filter, audit log.
- [ ] **S3.3 Seasonal ladders** – Define season cadence & reward distribution.

### Phase 4 – Content & Monetization
- [ ] **S4.1 Banner pipeline** – Configurable drops, PRD updates, content authoring docs.
- [ ] **S4.2 Events system** – Time-bound modifiers, server-side toggles.
- [ ] **S4.3 Storefront tuning** – Price experiments, AB test support.

## Next Steps
1. Kick off Phase 1 by clarifying UX goals for the slot-machine flow (update PRD).
2. Translate required technical changes into the `LLD.md` implementation backlog.
3. Schedule regular plan reviews; update checkboxes as each step completes.

