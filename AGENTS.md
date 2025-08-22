# Repository Guidelines

## Project Structure & Module Organization
- Root docs: `coding_abstraction_prompt.md`, `llama_zuma_prd.md` capture product and prompt design. Keep product specs and research notes in the root or a future `docs/` folder.
- When adding code, organize by feature:
  - `src/` — agent logic, tools/integrations, and utilities.
  - `prompts/` — reusable prompt templates and variants (e.g., `prompts/agent_name__v1.md`). Include a short README per prompt.
  - `tests/` — unit/integration tests mirroring `src/` paths.
  - `assets/` — non-code artifacts (images, diagrams).

## Build, Test, and Development Commands
- No build tooling is configured yet. Prefer Make targets or package scripts once added. Examples to standardize on:
  - `make dev` — run the local app/agent with hot-reload.
  - `make test` — run all tests with coverage.
  - `make lint` / `make fmt` — run linters/formatters.
- If using a language package manager, expose the same via scripts (e.g., `npm run test`, `uv run pytest`).

## Coding Style & Naming Conventions
- Filenames: code uses `snake_case.py`, docs use `kebab-case.md`, prompts use `agent_name__vX.Y.md`.
- Indentation: follow language defaults (Python 4 spaces; JS/TS 2 spaces). Keep lines ≤ 100 chars.
- Prefer formatter + linter (e.g., `ruff`/`black` for Python, `eslint`/`prettier` for JS/TS). Commit only formatted code.

## Testing Guidelines
- Place tests in `tests/` mirroring `src/` structure.
- Naming: Python `test_*.py`; JS/TS `*.spec.ts|js`.
- Aim for meaningful coverage on core agent flows (tool calling, prompt routing, error paths). Include minimal fixtures; prefer deterministic tests.

## Commit & Pull Request Guidelines
- Commits: use Conventional Commits (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`). Keep messages imperative and scoped.
- PRs: include summary, rationale, linked issues, and screenshots for UX changes. Add test plan and risk/rollback notes. Keep PRs small and focused.

## Security & Configuration Tips
- Never commit secrets or API keys. Use `.env.local` (gitignored) and add `.env.example` for required vars.
- Prefer per-environment configs and secret stores (e.g., GitHub Actions secrets) for CI.

## Agent-Specific Instructions
- For each prompt in `prompts/`, include: goal, inputs, outputs, guardrails, and evaluation notes. Example header:
  - `# agent_name v1.0 — goal: classify support tickets`
- Version prompts explicitly (`__v1`, `__v1.1`) and record changes in a short changelog within the file.
