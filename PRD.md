# Gacha Web RPG – Product Requirements Document

_Last updated: 2025-03-17_

## 1. Vision & Goals
- Deliver a compelling web-based RPG gacha experience with real-time multiplayer touches.
- Prioritize fairness and transparency while keeping the loop rewarding and exciting.
- Support both casual drop-in play and deeper progression for engaged users.

## 2. Target Users
- **Collectors** – focus on completing gear/character sets, value rarity.
- **Competitors** – pursue high-tier PvE/PvP challenges and leaderboards.
- **Social players** – leverage chat, mailbox, cooperative engagements.

## 3. Core Gameplay Requirements
1. **Gacha System**
   - Multi-mode draws: gear, character, pet, with configurable probabilities.
   - Slot-machine presentation supporting single & multi draws (with skip option).
   - Guaranteed mechanics: pity counters, min-tier guarantees, admin overrides.
2. **Progression Loops**
   - PvE stage progression with escalating difficulty and rewards.
   - Quest system with tracked completion & mail reward delivery.
   - Inventory management for gear, items, currencies.
3. **Combat**
   - Turn-based battle flow with skill cooldowns, status effects, pet abilities.
   - Visual feedback for ultimates and legendary drops.
   - PvP duel simulation with matchmaking (roadmap: Phase 3).

## 4. Economy & Rewards
- Currencies: points (wallet), gold, diamonds, pet tickets, holy water.
- Rewards delivered either instant (DB update) or via mailbox (with expiry).
- Admin tooling to grant, adjust drop tables, and monitor economy health.

## 5. Social & Live Features
- Global chat with system messages and moderation hooks.
- Mailbox for rewards, gifts, admin communications.
- Future roadmap: seasonal ladders, guild / cooperative mechanics.

## 6. Non-Functional Requirements
- **Performance**: responsive on modern desktop browsers, low-latency Firebase interactions.
- **Reliability**: gacha draws and reward grants must be atomic; handle retries safely.
- **Security**: sanitize user input, guard against UID spoofing, enforce auth checks.
- **Observability**: logging for critical flows (gacha, combat, auth) with telemetry pipeline (Phase 2).

## 7. Success Metrics
- Daily Active Users (DAU) and retention (D1/D7).
- Draw completion conversion (% of users triggering gacha per session).
- Quest completion and combat win rates.
- System health: error rates below defined thresholds (<1% failed draws).

## 8. Dependencies & Integrations
- Firebase Authentication, Realtime Database, Cloud Functions (mirror, snapshots).
- CDN-hosted assets for animations, icons, video overlays.
- External analytics endpoint (to be defined Phase 2).

## 9. Open Questions / To Clarify
- Define reward tables for upcoming banners (Phase 4).
- Establish moderation policy & tooling requirements (Phase 3).
- Determine monetization model: cosmetic vs. progression-linked.

