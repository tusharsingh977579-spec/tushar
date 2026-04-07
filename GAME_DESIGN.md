# Game Design: **Chrono Heist: Neon Loop**

A fast-paced, replayable **single-player action strategy game** where the player performs timed heists in a cyberpunk city that resets every 12 in-game minutes.

## 1) Core Pitch
- **Genre:** Action-stealth + light roguelite planning
- **Camera:** Top-down 2.5D
- **Platform:** PC web build (good fit for this repo's React/Vite stack as a prototype)
- **Fantasy:** "Steal impossible tech before time rewinds, then use knowledge from previous loops to perfect the next run."

## 2) Player Experience Goals
- Feel clever for learning guard patterns across loops.
- Feel intense time pressure without overwhelming controls.
- Always make progress through permanent unlocks and discovered intel.

## 3) Core Gameplay Loop
1. **Plan** loadout and route (30–60 sec).
2. **Infiltrate** target building while avoiding patrols/cameras.
3. **Steal** one or more objective items.
4. **Extract** before loop timer ends.
5. **Rewind** and spend rewards on upgrades/intel.
6. Repeat with harder targets and modifiers.

## 4) Controls (Prototype-Friendly)
- `WASD` / Arrow keys: move
- `Shift`: dash (short cooldown)
- `E`: interact (hack, open, steal)
- `Space`: gadget (e.g., EMP)
- `Tab`: mini-map overlay

## 5) Systems
### A. Time Loop System
- Every mission has a visible countdown (e.g., 12:00).
- On timeout, player is rewound to mission start.
- Knowledge persists (player memory + discovered intel cards).

### B. Detection & Stealth
- Guards have vision cones + hearing radius.
- Cameras can be disabled with EMP or terminal hacks.
- Alert states: `Idle -> Suspicious -> Alert -> Lockdown`.

### C. Risk/Reward
- Optional side-vaults increase score but consume time.
- Extract early for safer progress, or greed for bigger rewards.

### D. Meta Progression
- Permanent unlock currencies:
  - **Credits** (gear unlocks)
  - **Insight** (intel upgrades: reveal patrol paths, safe shortcuts)
- Player power growth is moderate; skill and route optimization remain key.

## 6) Content Scope (MVP)
- 1 playable district map (modular rooms)
- 3 heist targets
- 4 enemy archetypes (guard, drone, elite, turret)
- 3 gadgets (EMP, decoy, smoke)
- 8 upgrades
- 20–30 minute first complete run target

## 7) Art & Audio Direction
- Neon/cyberpunk palette with clear contrast for readability.
- Minimal geometric props for quick production.
- Dynamic soundtrack layers:
  - Calm ambient while hidden
  - Percussive layer when detected
  - High-intensity extraction cue under 60s remaining

## 8) Monetization / Distribution (Optional)
- If released as a premium indie: one-time purchase.
- If free web prototype: optional cosmetic supporter pack only (no pay-to-win).

## 9) Technical Plan (for this codebase)
1. Build a single-screen playable prototype in React + TypeScript.
2. Render map + entities with HTML canvas.
3. Implement deterministic guard paths and loop reset.
4. Add stealth detection, objective pickup, and extraction zones.
5. Add simple upgrade screen between loops.

## 10) Milestone Plan
- **Week 1:** Movement, map, timer, reset loop
- **Week 2:** Guards, vision cones, detection states
- **Week 3:** Objectives, extraction, scoring
- **Week 4:** Upgrades, polish, balancing, playtest

## 11) Success Metrics
- New players complete first successful heist within 3–5 loops.
- Average session length > 15 minutes.
- Players report "I got better by learning the map" in playtest feedback.

---

## Quick Start Build Prompt (for immediate implementation)
"Create a top-down canvas game called Chrono Heist with player movement, 12-minute countdown, guard patrols with cone detection, one objective item, extraction zone, and full mission reset on timer expiration. Use TypeScript in this Vite React project."


## 12) What to do next for Multiplayer (Worldwide Online)

To turn this into a real-time global multiplayer game, implement in this order:

### Phase A — Backend foundation (first)
1. **Choose server stack:**
   - Authoritative game server in **Node.js + Colyseus** (fast start) or **Go/Rust** (high scale).
   - Keep React client as renderer/input layer only.
2. **Create region-based deployments:**
   - Regions: `us-east`, `us-west`, `eu-central`, `ap-southeast`.
   - Use a global load balancer and route players to lowest-latency region.
3. **Use authoritative simulation:**
   - Server is source of truth for position, detection, loot, mission state.
   - Clients send input; server validates and broadcasts snapshots.

### Phase B — Real-time networking
1. **Transport:** WebSocket first, WebRTC data channels optional later.
2. **Tick rate:**
   - Server simulation at 20–30 ticks/sec.
   - Client interpolation + prediction to hide latency.
3. **State sync model:**
   - Delta snapshots (only changed entities).
   - Interest management so players only receive nearby updates.

### Phase C — Persistence & account systems
1. **Identity:** Firebase Auth (already present in project) for login tokens.
2. **Database split:**
   - PostgreSQL: accounts, inventory, progression, purchases.
   - Redis: sessions, matchmaking queues, short-lived room state.
3. **Cloud storage:** object store for cosmetics/assets metadata.

### Phase D — Matchmaking and game modes
1. Start with **4-player co-op heist rooms** (lowest complexity).
2. Add matchmaking queues by region + skill band.
3. Add reconnection support (grace window 60–120 sec).

### Phase E — Anti-cheat & security
1. Never trust client position, damage, cooldowns, or economy values.
2. Sign and validate auth tokens on game server.
3. Add rate limiting + DDoS/WAF protections at edge.
4. Log suspicious inputs (speed hacks, impossible actions).

### Phase F — Observability and live operations
1. Metrics: concurrent users, p95 latency, packet loss, match start time, crash rate.
2. Dashboards + alerts per region.
3. Blue/green deploys and canary rollouts for server updates.

## 13) Recommended Production Architecture
- **Client:** React/TypeScript game client (Canvas/WebGL)
- **Gateway:** Global Anycast/Load Balancer
- **Realtime:** Regional authoritative game servers
- **Services:** Matchmaking service + party service + chat service
- **Data:** PostgreSQL + Redis + object storage
- **Auth:** Firebase Auth / OAuth provider
- **Infra:** Kubernetes (regional clusters) + autoscaling
- **CDN:** Static asset delivery close to players

## 14) 30-60-90 Day Execution Plan
### First 30 days
- Build one multiplayer room with movement sync, mission objective sync, and extraction sync.
- Add regional deployment in one region (US) with metrics.

### Days 31–60
- Add matchmaking, parties, reconnect, and progression persistence.
- Open second and third regions (EU + APAC).

### Days 61–90
- Add anti-cheat checks, load testing, and live operations runbooks.
- Run closed beta and tune tick rate/networking parameters.

## 15) MVP Multiplayer Technical Targets
- Room size: 4 players
- End-to-end latency target: <120 ms for same-region players
- Server tick: 20 Hz minimum
- Match start time: <20 seconds p95
- Crash-free sessions: >99.5%
