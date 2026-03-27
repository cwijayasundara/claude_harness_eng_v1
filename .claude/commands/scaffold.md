---
name: scaffold
description: Initialize a new project with the Claude Harness Engine v1 scaffold.
---

# /scaffold — Project Initialization

When the user runs this command, follow these steps exactly:

## Step 1: Gather Project Info

Ask the user these questions (one at a time):
1. "What are you building?" (brief description for CLAUDE.md)
2. "What's your tech stack?" with presets:
   - A) Python (FastAPI) + React (Vite) + PostgreSQL
   - B) Python (FastAPI) + Next.js + PostgreSQL
   - C) Node (Express) + React (Vite) + PostgreSQL
   - D) Custom (I'll specify)
3. "What type of project is this?" (for design calibration):
   - A) Consumer-facing app (high design bar)
   - B) Internal tool / dashboard (functional focus)
   - C) API-only / backend service (no UI scoring)
4. "How will the evaluator reach the running app?" (verification mode):
   - A) Docker Compose (default — app runs in containers)
   - B) Local dev servers (app runs via npm/uvicorn/etc.)
   - C) Stub / mock server (no runnable backend — serverless or external-only)
5. "Install complementary official Claude Code plugins?" (recommended: Yes)
   - `code-review` — Automated PR review with confidence scoring
   - `commit-commands` — `/commit`, `/commit-push-pr` git workflows
   - `security-guidance` — Real-time security pattern checking on edits
   - `pr-review-toolkit` — Specialized PR review agents (comments, tests, errors, types)
   - A) Yes, install all four (recommended)
   - B) Let me pick which ones
   - C) No, skip official plugins

## Step 2: Generate project-manifest.json

Based on their answers, write `project-manifest.json` to the project root. Fill in:
- name: from their description
- stack.backend: language, version, framework, package_manager, linter, typechecker, test_runner
- stack.frontend: same fields
- stack.database: primary, secondary
- stack.deployment: method ("docker-compose"), services list
- evaluation: api_base_url, ui_base_url, health_check, design_score_threshold (7), design_max_iterations (10), test_corpus_dir
- execution: default_mode ("full"), max_self_heal_attempts (3), max_auto_iterations (50), coverage_threshold (80), session_chaining (true), agent_team_size ("auto"), teammate_model ("sonnet")
- verification: mode, health_check, and mode-specific config (see below)

### Verification Config (based on question 4)

**If Docker (A):**
```json
"verification": {
  "mode": "docker",
  "health_check": { "url": "http://localhost:3000/health", "retries": 5, "backoff_seconds": 2 },
  "docker": { "compose_file": "docker-compose.yml", "services": ["backend", "frontend"] }
}
```

**If Local (B):**
```json
"verification": {
  "mode": "local",
  "health_check": { "url": "http://localhost:3000/health", "retries": 5, "backoff_seconds": 2 },
  "local": { "backend_url": "http://localhost:8000", "frontend_url": "http://localhost:3000", "start_commands": [] }
}
```

**If Stub (C):**
```json
"verification": {
  "mode": "stub",
  "health_check": { "url": "http://localhost:4000/health", "retries": 5, "backoff_seconds": 2 },
  "stub": { "schema_source": "specs/design/api-contracts.schema.json", "auto_generate_mock_server": true }
}
```

### Generate calibration-profile.json (based on question 3)

**If Consumer-facing app (A):**
```json
{
  "scoring": {
    "weights": { "design_quality": 1.5, "originality": 1.5, "craft": 1.5, "functionality": 1.0 },
    "threshold": 8,
    "per_criterion_minimum": 5
  },
  "iteration": {
    "max_iterations": 10,
    "plateau_window": 3,
    "plateau_delta": 0.3,
    "pivot_after_plateau": true
  }
}
```

**If Internal tool (B):**
```json
{
  "scoring": {
    "weights": { "design_quality": 0.75, "originality": 0.5, "craft": 0.5, "functionality": 1.5 },
    "threshold": 6,
    "per_criterion_minimum": 4
  },
  "iteration": {
    "max_iterations": 5,
    "plateau_window": 3,
    "plateau_delta": 0.3,
    "pivot_after_plateau": false
  }
}
```

**If API-only (C):** Do not create `calibration-profile.json` (no UI scoring needed).

Preset mappings:
- A) backend: python/3.12/fastapi/uv/ruff/mypy/pytest, frontend: typescript/react/vite/npm/eslint/tsc/vitest, db: postgresql
- B) backend: python/3.12/fastapi/uv/ruff/mypy/pytest, frontend: typescript/nextjs/16/npm/eslint/tsc/vitest, db: postgresql
- C) backend: javascript/node/express/npm/eslint/tsc/jest, frontend: typescript/react/vite/npm/eslint/tsc/vitest, db: postgresql

## Step 3: Copy Scaffold Files

Copy from plugin source ($CLAUDE_PLUGIN_DIR or detect from this file's location):
```bash
cp -r $PLUGIN_SOURCE/agents/ .claude/agents/
cp -r $PLUGIN_SOURCE/skills/ .claude/skills/
cp -r $PLUGIN_SOURCE/hooks/ .claude/hooks/
cp -r $PLUGIN_SOURCE/state/ .claude/state/
cp -r $PLUGIN_SOURCE/templates/ .claude/templates/
cp $PLUGIN_SOURCE/architecture.md .claude/architecture.md
cp $PLUGIN_SOURCE/program.md .claude/program.md
cp $PLUGIN_SOURCE/settings.json .claude/settings.json
```

### Add Official Plugins to settings.json (based on question 5)

After copying settings.json, add the `enabledPlugins` block based on the user's answer:

**If Yes (all four) or selected plugins:**
Add to the project's `.claude/settings.json`:
```json
"enabledPlugins": {
  "code-review@claude-plugins-official": true,
  "commit-commands@claude-plugins-official": true,
  "security-guidance@claude-plugins-official": true,
  "pr-review-toolkit@claude-plugins-official": true
}
```

If the user chose "Let me pick," only include the plugins they selected.

**If No:** Do not add `enabledPlugins` to settings.json.

These plugins are complementary to the harness and do not conflict:
- `code-review` — PR review (our harness does sprint evaluation, not PR review)
- `commit-commands` — git workflows (our harness manages commits in `/auto`, but manual commits need this)
- `security-guidance` — real-time edit-time security patterns (XSS, eval, unsafe HTML) that complement our `detect-secrets` hook
- `pr-review-toolkit` — specialized PR agents for after the harness finishes building

**Do NOT install** these official plugins (they conflict with harness functionality):
- `feature-dev` — competes with our `/brd` -> `/spec` -> `/design` -> `/implement` pipeline
- `frontend-design` — competes with our `ui-designer` + `design-critic` GAN loop
- `hookify` — dynamically generated hooks could interfere with our purpose-built hooks

## Step 4: Create Output Directories

```bash
mkdir -p specs/brd specs/stories specs/design/mockups specs/design/amendments specs/reviews specs/test_artefacts sprint-contracts e2e
```

## Step 5: Generate CLAUDE.md

Write CLAUDE.md tailored to chosen stack. This is a slim table of contents (~60 lines) that
directs agents to the right reference files via progressive disclosure. Do not inline full rules
here — agents discover details by reading the referenced skill files.

### CLAUDE.md Template

```markdown
# {project-name}

{description from user input}

## Quick Reference

**Backend:** `cd backend && uv run pytest -x -q` | `uv run ruff check --fix .` | `uv run mypy src/`
**Frontend:** `cd frontend && npm test` | `npm run lint` | `npm run typecheck`
**Full stack:** Start backend + frontend (see init.sh)

## Architecture

Strict layered architecture: Types → Config → Repository → Service → API → UI.
One-way dependencies only. See `.claude/architecture.md` for full rules.

## Where to Find Things

| What | Where |
|------|-------|
| Architecture rules | `.claude/architecture.md` |
| Quality principles | `.claude/skills/code-gen/SKILL.md` |
| Testing patterns | `.claude/skills/testing/SKILL.md` |
| Evaluation rubric | `.claude/skills/evaluation/SKILL.md` |
| Sprint contract format | `.claude/skills/evaluation/references/contract-schema.json` |
| Playwright patterns | `.claude/skills/evaluation/references/playwright-patterns.md` |
| Human control knobs | `.claude/program.md` |
| Session recovery | `claude-progress.txt` |
| Feature tracking | `features.json` |
| Learned rules | `.claude/state/learned-rules.md` |

## Pipeline Commands

| Command | Purpose |
|---------|---------|
| `/brd` | Socratic interview → BRD |
| `/spec` | BRD → stories + features.json |
| `/design` | Architecture + schemas + mockups |
| `/build` | Full 8-phase pipeline |
| `/auto` | Autonomous ratcheting loop |
| `/implement` | Code gen with agent teams |
| `/evaluate` | Run app, verify contract |
| `/review` | Evaluator + security review |
| `/test` | Test plan + Playwright E2E |
| `/deploy` | Docker Compose + init.sh |

## Code Style

- TDD mandatory: test first, then implement
- 100% meaningful coverage target, 80% floor
- Functions < 50 lines, files < 300 lines
- Static typing everywhere (zero `any`)
- See `.claude/skills/code-gen/SKILL.md` for full rules

## Git

Branch: `<type>/<description>` (e.g., `feat/user-auth`)
Commits: conventional format (`feat:`, `fix:`, `refactor:`, `test:`, `docs:`)
```

## Step 6: Generate design.md

Architecture reference document (~200-300 lines):
- System architecture ASCII diagram
- Karpathy ratchet loop diagram
- Agent roles table (7 agents)
- Hook execution order (12 hooks)
- State files description
- Sprint contract format summary
- Quality principles (6)

### design.md Template

```markdown
# Claude Harness Engine v1 — Design Reference

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        User / CI                            │
└─────────────────────┬───────────────────────────────────────┘
                      │ slash commands
┌─────────────────────▼───────────────────────────────────────┐
│                   Orchestrator (Claude)                      │
│  /brd → /spec → /design → /build → /test → /evaluate        │
└──┬──────────┬──────────┬──────────┬──────────┬──────────────┘
   │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼
Planner   Generator  Evaluator  Test Eng  Security Rev
   │          │          │          │          │
   └──────────┴──────────┴──────────┴──────────┘
                         │
              ┌──────────▼──────────┐
              │     State Layer      │
              │  features.json       │
              │  claude-progress.txt │
              │  learned-rules.md    │
              │  failures.md         │
              │  iteration-log.md    │
              └──────────────────────┘
```

## Karpathy Ratchet Loop

```
        ┌──────────────────────────────────┐
        │         Build Feature            │
        └──────────────┬───────────────────┘
                       │
        ┌──────────────▼───────────────────┐
        │       Evaluate vs Design         │◄──────────┐
        └──────────────┬───────────────────┘           │
                       │                               │
              score ≥ threshold?                       │
                  /         \                          │
                Yes           No                       │
                 │             │                       │
        ┌────────▼──┐  ┌───────▼────────┐             │
        │  Proceed  │  │  Design Critic  │             │
        └───────────┘  │  suggests fix   │             │
                       └───────┬─────────┘             │
                               │                       │
                       ┌───────▼─────────┐             │
                       │  Generator      │─────────────┘
                       │  applies fix    │  (max 5 iterations)
                       └─────────────────┘
```

## Agent Roles

| Agent            | File                          | Responsibility                         |
|------------------|-------------------------------|----------------------------------------|
| Planner          | `.claude/agents/planner.md`   | Sprint planning, story breakdown       |
| Generator        | `.claude/agents/generator.md` | Feature implementation                 |
| Evaluator        | `.claude/agents/evaluator.md` | Design scoring (Karpathy loop)         |
| Design Critic    | `.claude/agents/design-critic.md` | Design quality review              |
| UI Designer      | `.claude/agents/ui-designer.md`   | Mockups, design tokens             |
| Test Engineer    | `.claude/agents/test-engineer.md` | Test authoring and execution       |
| Security Reviewer| `.claude/agents/security-reviewer.md` | Vulnerability auditing         |

## Hook Execution Order

| # | Hook                  | File                               | Trigger                        |
|---|-----------------------|------------------------------------|--------------------------------|
| 1 | protect-env           | `hooks/protect-env.js`             | Any file write                 |
| 2 | detect-secrets        | `hooks/detect-secrets.js`          | Pre-commit                     |
| 3 | scope-directory       | `hooks/scope-directory.js`         | File access                    |
| 4 | lint-on-save          | `hooks/lint-on-save.js`            | File save (.py, .ts)           |
| 5 | typecheck             | `hooks/typecheck.js`               | File save (.py, .ts)           |
| 6 | check-function-length | `hooks/check-function-length.js`   | File save                      |
| 7 | check-file-length     | `hooks/check-file-length.js`       | File save                      |
| 8 | check-architecture    | `hooks/check-architecture.js`      | File save                      |
| 9 | sprint-contract-gate  | `hooks/sprint-contract-gate.js`    | Pre-build                      |
|10 | pre-commit-gate       | `hooks/pre-commit-gate.js`         | Pre-commit                     |
|11 | task-completed        | `hooks/task-completed.js`          | Post-task                      |
|12 | teammate-idle-check   | `hooks/teammate-idle-check.js`     | Periodic                       |

## State Files

| File                  | Purpose                                              |
|-----------------------|------------------------------------------------------|
| `features.json`       | Feature registry with status tracking                |
| `claude-progress.txt` | Session progress and current pipeline position       |
| `learned-rules.md`    | Accumulated rules from past failures (ratchet memory)|
| `failures.md`         | Failure log for pattern analysis                     |
| `iteration-log.md`    | Evaluator iteration history per feature              |
| `eval-scores.json`    | Design scores per component per iteration            |
| `coverage-baseline.txt` | Test coverage baseline for regression detection   |

## Sprint Contract Format

A sprint contract (`sprint-contracts/{group-id}.json`) defines a unit of work:

```json
{
  "contract_id": "group-01",
  "group_name": "Authentication",
  "stories": ["auth-01", "auth-02", "auth-03"],
  "acceptance_criteria": [...],
  "dependencies": [],
  "estimated_complexity": "medium",
  "approved": false
}
```

The sprint-contract-gate hook blocks `/build` until `approved: true`.

## Quality Principles

1. **Correctness first** — all tests must pass before a feature is considered done
2. **Type safety** — strict typing enforced by hooks on every save
3. **Layered architecture** — one-way dependency boundaries enforced by check-architecture hook
4. **Test coverage** — coverage gate enforced at ≥ 80%; regressions block merges
5. **Security by default** — secrets detection runs on every commit; env files are protected
6. **Iterative improvement** — Karpathy ratchet ensures quality only moves forward
```

## Step 7: Generate init.sh

Read init-sh.template, replace placeholders based on manifest:
- {{BACKEND_INSTALL}}: e.g. `cd backend && uv sync && cd ..`
- {{FRONTEND_INSTALL}}: e.g. `cd frontend && npm ci && cd ..`
- {{DOCKER_COMPOSE_CMD}}: `docker compose up -d --build`
- {{HEALTH_CHECKS}}: curl commands for each service URL from manifest

Write to `init.sh` and `chmod +x init.sh`.

Placeholder mappings by preset:
- A/B (uv): `{{BACKEND_INSTALL}}` → `cd backend && uv sync && cd ..`
- C (npm): `{{BACKEND_INSTALL}}` → `cd backend && npm ci && cd ..`
- All presets: `{{FRONTEND_INSTALL}}` → `cd frontend && npm ci && cd ..`
- Health checks: use `api_base_url` and `ui_base_url` from manifest evaluation section

## Step 8: Initialize Git

```bash
git init
```

Write `.gitignore`:
```
.env
.env.local
.env.production
node_modules/
__pycache__/
*.pyc
.coverage
htmlcov/
dist/
build/
.venv/
*.egg-info/
.mypy_cache/
.ruff_cache/
playwright-report/
test-results/
```

## Step 9: Initialize State Files

```bash
echo '[]' > features.json
```

Write `claude-progress.txt`:
```
=== Session 0 ===
date: {ISO 8601 now}
mode: full
groups_completed: []
groups_remaining: []
current_group: none
current_stories: []
sprint_contract: none
last_commit: none
features_passing: 0 / 0
coverage: 0%
learned_rules: 0
blocked_stories: none
next_action: Run /brd to start
```

## Step 10: Report

Print:
```
✓ Claude Harness Engine v1 scaffolded successfully.

Installed:
  7 agents      → .claude/agents/
  17 skills     → .claude/skills/
  12 hooks      → .claude/hooks/
  5 templates   → .claude/templates/
  5 state files → .claude/state/

Next steps:
  1. Run /brd to create your Business Requirements Document
  2. Or run /build to execute the full pipeline
```
