# Llama Bomba (Web MVP)

A web-first Zuma-style puzzle game prototype. Aim and shoot colored orbs to clear the advancing chain before it reaches the temple.

## Run Locally
- Serve the app: `make web` then open http://localhost:8000
- Controls: mouse to aim, click or Space to shoot, Left/Right arrows to fine-tune aim.

## Tests
- Core logic tests (Node): `make web-test`
- What’s covered: path sampling, spacing/order enforcement, insertion side, matches/chain reactions.

## Structure
- `web/` — Browser code and assets
  - `index.html`, `styles.css`, `game.js`
  - `core.js` — platform-agnostic game logic (ES module)
  - `config.js` — gameplay + level config
  - `tests/` — Node-based tests
- `Makefile` — `web`, `web-test`, `dev`, `test`, `lint`, `fmt`
- `AGENTS.md` — contributor guide

## Design Principles
- Separation of concerns: core logic isolated from rendering/input
- Config-driven: no hard-coded gameplay values
- Event-driven: `EventBus` emits `match_cleared`; scoring reacts in `game.js`

## Next Steps
- Touch controls + responsive canvas
- Event-driven audio adapter (shoot/match/lose)
- Multiple levels + progression and star ratings
- Power-ups (Slow, Bomb) via strategies and events
