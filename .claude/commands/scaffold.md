---
name: scaffold
description: Initialize a new project with the Claude Harness Engine v1 scaffold.
---

# /scaffold — Project Initialization

When the user runs this command, follow these steps exactly:

## Step 1: Gather Project Info

Ask the user two questions (one at a time):
1. "What are you building?" (brief description for CLAUDE.md)
2. "What's your tech stack?" with presets:
   - A) Python (FastAPI) + React (Vite) + PostgreSQL
   - B) Python (FastAPI) + Next.js + PostgreSQL
   - C) Node (Express) + React (Vite) + PostgreSQL
   - D) Custom (I'll specify)

## Step 2: Generate project-manifest.json

Based on their answers, write `project-manifest.json` to the project root. Fill in:
- name: from their description
- stack.backend: language, version, framework, package_manager, linter, typechecker, test_runner
- stack.frontend: same fields
- stack.database: primary, secondary
- stack.deployment: method ("docker-compose"), services list
- evaluation: api_base_url, ui_base_url, health_check, design_score_threshold (7), design_max_iterations (5), test_corpus_dir
- execution: default_mode ("full"), max_self_heal_attempts (3), max_auto_iterations (50), coverage_threshold (80), session_chaining (true), agent_team_size ("auto"), teammate_model ("sonnet")

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

## Step 4: Create Output Directories

```bash
mkdir -p specs/brd specs/stories specs/design/mockups specs/design/amendments specs/reviews specs/test_artefacts sprint-contracts e2e
```

## Step 5: Generate CLAUDE.md

Write CLAUDE.md tailored to chosen stack. Include:
- Project description (from step 1)
- Commands section (backend test, lint, format, typecheck — from manifest)
- Frontend commands (from manifest)
- Full-stack Docker command
- Architecture rules (layered, one-way deps)
- Code style (from manifest tools)
- Testing philosophy
- SDLC pipeline commands table (all /commands)
- Agent roles table
- Quality principles (6)
- Git workflow (branch naming, conventional commits)

### CLAUDE.md Template

```markdown
# {PROJECT_NAME}

{PROJECT_DESCRIPTION}

## Commands

### Backend
- **Test:** `cd backend && {TEST_RUNNER} -v`
- **Lint:** `cd backend && {LINTER} .`
- **Format:** `cd backend && {LINTER} format .`
- **Type-check:** `cd backend && {TYPECHECKER}`

### Frontend
- **Test:** `cd frontend && {FRONTEND_TEST_RUNNER} run`
- **Lint:** `cd frontend && {FRONTEND_LINTER} .`
- **Type-check:** `cd frontend && {FRONTEND_TYPECHECKER}`
- **Build:** `cd frontend && npm run build`

### Full Stack
- **Start all services:** `docker compose up -d --build`
- **Stop all services:** `docker compose down`
- **View logs:** `docker compose logs -f`

## Architecture

This project follows a layered, one-way dependency architecture:

```
UI → API → Services → Repositories → DB
```

Rules:
- Dependencies flow in one direction only (no circular imports)
- Each layer may only import from the layer directly below it
- Business logic lives in Services, not in API handlers or Repositories
- Database models are separate from API schemas

## Code Style

### Backend ({BACKEND_LANG})
- Linter: {LINTER} (auto-fix with `{LINTER} --fix`)
- Type checker: {TYPECHECKER} (strict mode)
- Formatter: {LINTER} format
- All public functions must have type annotations
- Docstrings required for modules, classes, and public functions

### Frontend (TypeScript)
- Linter: {FRONTEND_LINTER}
- Type checker: {FRONTEND_TYPECHECKER} (strict mode)
- No `any` types — use `unknown` with guards if necessary
- Components are functional with hooks; no class components

## Testing Philosophy

- Write tests first when fixing bugs (regression tests)
- Unit tests for all business logic (Services layer)
- Integration tests for API endpoints
- E2E tests for critical user journeys via Playwright
- Coverage threshold: 80% (enforced by CI)
- Tests live adjacent to the code they test

## SDLC Pipeline Commands

| Command       | Description                                      |
|---------------|--------------------------------------------------|
| `/brd`        | Generate Business Requirements Document          |
| `/spec`       | Convert BRD into user stories                    |
| `/design`     | Create UI/UX mockups and architecture diagrams   |
| `/build`      | Implement a feature group end-to-end             |
| `/test`       | Run full test suite and report coverage          |
| `/review`     | Security, performance, and code quality review   |
| `/evaluate`   | Score the build against the design rubric        |
| `/deploy`     | Package and deploy via Docker Compose            |
| `/auto`       | Run the full pipeline autonomously               |
| `/scaffold`   | Initialize a new project with the harness        |

## Agent Roles

| Agent            | Responsibility                                   |
|------------------|--------------------------------------------------|
| Planner          | Breaks BRD into sprint contracts and stories     |
| Generator        | Implements features from story specs             |
| Evaluator        | Scores UI against design rubric (Karpathy loop)  |
| Design Critic    | Reviews design quality and suggests improvements |
| UI Designer      | Creates mockups and design tokens                |
| Test Engineer    | Writes and runs automated tests                  |
| Security Reviewer| Audits for vulnerabilities and secrets           |

## Quality Principles

1. **Correctness first** — code must pass all tests before merging
2. **Type safety** — no implicit any; strict mode always on
3. **Layered architecture** — enforce one-way dependency boundaries
4. **Test coverage** — maintain ≥ 80% coverage at all times
5. **Security by default** — no secrets in code; input validation everywhere
6. **Iterative improvement** — use the Karpathy ratchet to improve incrementally

## Git Workflow

### Branch Naming
- Features: `feat/{story-id}-short-description`
- Fixes: `fix/{issue-id}-short-description`
- Chores: `chore/short-description`

### Conventional Commits
```
feat: add user authentication endpoint
fix: resolve race condition in order processing
chore: update dependencies to latest versions
test: add coverage for payment service
docs: update API documentation
refactor: extract validation logic to service layer
```
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
