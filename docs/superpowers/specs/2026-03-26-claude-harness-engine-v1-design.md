# Claude Harness Engine v1 — Design Specification

## Overview

A Claude Code scaffolding harness for autonomous long-running application development, implementing best practices from Anthropic's "Harness Design for Long-Running Application Development" and "Effective Harnesses for Long-Running Agents". Combines Karpathy's autoresearch ratcheting pattern with a GAN-inspired Generator-Evaluator architecture, agent teams for parallel story execution, session chaining for multi-context-window builds, and layered evaluation (API + Playwright + Vision).

### Problem Statement

Existing harnesses (including forge_v2) suffer from three failure modes:

1. **Self-evaluation bias** — When agents evaluate their own work, they rationalize flaws and declare "done" prematurely. Code reviewers that only read code (not run it) talk themselves into accepting "display-only" features.
2. **Context window exhaustion** — Complex applications (30+ stories, 10+ groups) exceed a single context window. Without session chaining, progress is lost and work restarts.
3. **Architecture drift** — Generated code silently diverges from designed API contracts and data models. By group F of a 10-group build, the code no longer matches the architecture spec.

### Solution

A three-agent core (Planner, Generator, Evaluator) where:
- The **Evaluator** runs the application and verifies against sprint contracts — it doesn't read code, it tests behavior
- **Session chaining** via `features.json` + `claude-progress.txt` enables builds spanning hours across many context windows
- **Machine-readable architecture schemas** (OpenAPI/JSON Schema) make architecture enforceable, not advisory
- **Agent teams** execute story groups in parallel, coordinated via shared task lists and messaging

---

## 1. System Architecture

```
+---------------------------------------------------------------------+
|                        HUMAN INTERFACE                                |
|                                                                      |
|  program.md           CLAUDE.md            project-manifest.json     |
|  (Karpathy bridge)    (harness rules)      (stack + eval config)     |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                      ORCHESTRATION LAYER                             |
|                                                                      |
|  /build --> /brd -> /spec -> /design -> /implement -> /evaluate      |
|                                              |              |        |
|                                              v              v        |
|                                         /auto (Karpathy ratchet)     |
|                                              |                       |
|                                  +-----------+-----------+           |
|                                  v           v           v           |
|                             Generator   Evaluator   Design-Critic    |
|                                  |           |           |           |
|                             Agent Teams  Playwright   Vision Scoring  |
|                             (parallel     MCP +        (GAN loop)    |
|                              stories)    API tests                   |
|                                                                      |
|  Support: /fix-issue  /refactor  /improve  /deploy                   |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                     AGENT LAYER (7 agents)                           |
|                                                                      |
|  CORE THREE:                                                         |
|    planner        -> Specs, architecture, feature list               |
|    generator      -> Code + tests (spawns agent teams per group)     |
|    evaluator      -> API tests, Playwright interaction, verdict      |
|                                                                      |
|  SPECIALISTS:                                                        |
|    design-critic  -> Frontend GAN scoring (4 criteria, N iterations) |
|    security-reviewer -> Vulnerability audit                          |
|    ui-designer    -> React/Tailwind mockups (design phase)           |
|    test-engineer  -> E2E Playwright test generation                  |
|                                                                      |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                   ENFORCEMENT LAYER (12 hooks)                       |
|                                                                      |
|  Security:  scope-directory | protect-env | detect-secrets           |
|  Quality:   lint-on-save | typecheck | check-function-length         |
|             check-file-length                                        |
|  Gates:     pre-commit-gate | sprint-contract-gate (NEW)             |
|  Teams:     teammate-idle-check (NEW)                                |
|  Info:      task-completed                                           |
|                                                                      |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                       STATE LAYER                                    |
|                                                                      |
|  FROM FORGE V2 (retained):                                          |
|    program.md          -> Karpathy human-agent bridge                |
|    iteration-log.md    -> Append-only history                        |
|    learned-rules.md    -> Monotonic defensive rules                  |
|    failures.md         -> Raw failure data for pattern extraction    |
|    coverage-baseline   -> Ratchet never drops                        |
|                                                                      |
|  NEW (from articles):                                                |
|    features.json       -> 200+ features with steps + pass/fail       |
|    claude-progress.txt -> Session chaining context for recovery      |
|    sprint-contracts/   -> Per-group negotiated done-criteria         |
|    eval-scores.json    -> Design critique scores over time           |
|                                                                      |
+---------------------------------------------------------------------+
```

---

## 2. Agents

### 2.1 Planner

Combines forge_v2's brd-creator, spec-writer, and architect. Owns the entire planning phase to reduce handoff mismatches.

- **Role:** Expand user prompts into BRD, decompose into stories with dependency graph, design system architecture, generate feature list, produce machine-readable schemas
- **Tools:** Read, Write, Glob, Grep, Bash
- **Spawned by:** `/brd`, `/spec`, `/design`, `/build`
- **Outputs:** `specs/brd/`, `specs/stories/`, `specs/design/`, `features.json`, `api-contracts.schema.json`, `data-models.schema.json`, `component-map.md`

### 2.2 Generator

The implementer. Only agent with `Agent` tool for spawning agent teams.

- **Role:** Implement code + tests from stories, spawn agent teams for parallel execution, negotiate sprint contracts with evaluator
- **Tools:** Read, Write, Edit, Glob, Grep, Bash, Agent
- **Spawned by:** `/implement`, `/auto`
- **Outputs:** `backend/`, `frontend/`, `sprint-contracts/`
- **Key rule:** Never self-evaluate. Write code, hand off to evaluator.
- **Agent teams:** The generator uses Claude Code's `TeamCreate` tool (part of the Agent Teams system) to spawn teammates. This is a Claude Code built-in — not a custom tool. It requires `CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1` in settings.json. The generator tells Claude Code to "create an agent team" in natural language, specifying teammate count, file ownership, and model. See [Claude Code Agent Teams docs](https://code.claude.com/docs/en/agent-teams).
- **Hard dependency:** Agent teams require Claude Code v2.1.32+. This harness cannot run outside Claude Code (e.g., raw API calls) because it depends on agent teams, shared task lists, teammate messaging, and TeammateIdle hooks.

### 2.3 Evaluator

The skeptic. Runs the application and verifies against sprint contracts. Tuned to be hard to satisfy.

- **Role:** Start Docker stack, run API checks (httpx), drive browser (Playwright MCP), verify sprint contract criteria, validate responses against architecture schemas, issue verdict
- **Tools:** Read, Write, Glob, Grep, Bash, Playwright MCP
- **Spawned by:** `/evaluate`, `/auto`
- **Outputs:** `specs/reviews/evaluator-report.md`, `features.json` (passes field only)
- **Key rule:** Execute every check. Never assume. Never talk yourself into accepting. If a check fails, it fails.

### 2.4 Design Critic

GAN counterpart for frontend quality. Uses Claude's vision to score screenshots.

- **Role:** Take screenshots of UI pages, score against 4 criteria (design quality, originality, craft, functionality), provide specific actionable critique
- **Tools:** Read, Write, Bash, Playwright MCP
- **Spawned by:** `/auto` (frontend groups only, after Playwright checks pass)
- **Outputs:** `eval-scores.json`, critique text sent to generator
- **Scoring:** Each criterion 1-10. Average must meet threshold (configurable, default 7). Max 5 iterations.

### 2.5 Security Reviewer

Retained from forge_v2.

- **Role:** Scan for injection, auth bypass, secrets in code, SSRF, path traversal
- **Tools:** Read, Write, Grep, Glob, Bash
- **Spawned by:** `/review`, `/auto` (after group passes evaluator)
- **Outputs:** `specs/reviews/security-review.md`

### 2.6 UI Designer

Creates mockups during design phase.

- **Role:** Generate self-contained React+Tailwind HTML mockups from stories and API contracts
- **Tools:** Read, Write, Glob, Grep, Bash
- **Spawned by:** `/design` (concurrent with planner's architecture work)
- **Outputs:** `specs/design/mockups/`

### 2.7 Test Engineer

Generates E2E test suites.

- **Role:** Generate test plan, test cases mapped to acceptance criteria, Playwright E2E test files, test data fixtures
- **Tools:** Read, Write, Edit, Glob, Grep, Bash
- **Spawned by:** `/test`
- **Outputs:** `specs/test_artefacts/`, `e2e/`

---

## 3. Three-Layer Verification Stack

All three layers must pass before a sprint contract is "done".

### Layer 1: API Verification

For each endpoint in the sprint contract, the evaluator uses `curl` or `python -c "import httpx; ..."` via the **Bash tool** to hit the RUNNING server (not a library import — shell commands against localhost):
- Verify status codes match contract
- Validate response body against `api-contracts.schema.json` (evaluator runs `python -c` with jsonschema validation)
- Test error cases (bad data → 422, missing resource → 404)
- Verify data persistence (POST then GET, confirm data matches)

### Layer 2: Playwright Interaction

For each UI story in the sprint contract, the evaluator uses Playwright MCP:
- Navigate to page, verify renders
- Fill forms, submit, verify success feedback
- Check data persists (refresh page, data still there)
- Test error states (invalid input, network failure)
- Selectors: `getByRole()`, `getByLabel()`, `getByText()` — never CSS classes
- Waits: `expect(locator).toBeVisible()` — never `waitForTimeout()`

### Layer 3: Visual/Design Critique (frontend groups only)

Design critic takes screenshots and scores:
- **Design quality** — Coherent visual identity (colors, typography, layout)
- **Originality** — Custom decisions vs template defaults
- **Craft** — Typography hierarchy, spacing, color harmony
- **Functionality** — Can user understand and complete tasks?

If average score < threshold, critique sent to generator for iteration (GAN loop, max 5 cycles).

---

## 4. Sprint Contracts

Negotiated between generator and evaluator before each group's implementation.

### Negotiation Protocol

The sprint contract negotiation is a two-step propose-approve exchange orchestrated by the `/auto` skill:

1. **Generator proposes:** `/auto` spawns the generator as a subagent with the prompt: "Read stories [IDs] and their acceptance criteria. Read api-contracts.md and component-map.md. Propose a sprint contract listing all API checks, Playwright checks, and architecture checks needed to verify this group is done. Write the contract to sprint-contracts/{group}.json."
2. **Evaluator reviews:** `/auto` spawns the evaluator as a subagent with the prompt: "Read the proposed sprint contract at sprint-contracts/{group}.json. Read the stories' acceptance criteria. Is this contract sufficient to verify the group is done? If checks are missing, add them. If checks are untestable, flag them. Write the final contract back to sprint-contracts/{group}.json."
3. **No back-and-forth.** The evaluator has final say. If the evaluator adds checks, they stand. This keeps negotiation to exactly 2 agent calls per group (one generator, one evaluator) rather than an unbounded loop.
4. **Contract is immutable after negotiation.** Neither agent may modify it during implementation. If implementation reveals the contract is wrong, the architecture amendment process (Section 6) is used.

### Format

```json
{
  "group": "C",
  "stories": ["E3-S1", "E3-S2", "E3-S3"],
  "contract": {
    "api_checks": [
      {
        "method": "POST",
        "path": "/documents/upload",
        "setup": "upload test file as multipart",
        "expect": { "status": 201, "body_contains": ["document_id"] },
        "schema_ref": "#/paths/~1documents~1upload/post/response/201"
      }
    ],
    "playwright_checks": [
      {
        "description": "Upload a document end-to-end",
        "steps": [
          "Navigate to /upload",
          "Upload file via file input",
          "Click submit button",
          "Wait for success feedback",
          "Verify document appears in list"
        ]
      }
    ],
    "design_checks": {
      "pages": ["/upload", "/documents/{id}"],
      "min_score": 7,
      "criteria": ["design_quality", "originality", "craft", "functionality"]
    },
    "architecture_checks": {
      "files_must_exist": [
        "backend/src/api/upload_router.py",
        "backend/src/service/upload_service.py",
        "frontend/src/components/upload/UploadPage.tsx"
      ],
      "schema_validation": true
    }
  }
}
```

---

## 5. Agent Teams & Story Groups

### How Stories + Sprint Contracts + Agent Teams work together

1. `/spec` creates stories with dependency graph and parallel groups
2. `/auto` picks next unfinished group
3. Generator + evaluator negotiate sprint contract for the group
4. Generator spawns Claude Code agent team:

```
Lead: generator (coordinates, doesn't code)
|-- Teammate A (story 1) -> distinct files from component-map.md
|-- Teammate B (story 2) -> distinct files
+-- Teammate C (story 3) -> distinct files

Rules:
- Each teammate owns distinct files (no overlapping edits)
- Plan approval required before coding
- Teammates message each other about shared types/interfaces
- 5-6 tasks per teammate
- Full test suite runs after all teammates complete
```

5. Ratchet gate runs (all 6 sub-gates)
6. PASS → commit group, update state, next group
7. FAIL → self-heal (max 3) → revert + learn rule → escalate

### Agent Team Configuration

- Team size: auto (based on stories in group, 1 teammate per story, max 5)
- Teammate model: configurable (default: sonnet for cost efficiency)
- Plan approval: always required
- File ownership: derived from `component-map.md`
- Idle check: `teammate-idle-check.js` hook verifies tests exist

---

## 6. System Architecture Design & Code Alignment

### Architecture Artifacts (produced by `/design`)

```
specs/design/
|-- system-design.md              # High-level components + diagrams
|-- api-contracts.md              # Human-readable endpoint specs
|-- api-contracts.schema.json     # Machine-readable OpenAPI spec (NEW)
|-- data-models.md                # Human-readable models
|-- data-models.schema.json       # Machine-readable JSON Schema (NEW)
|-- folder-structure.md           # Exact file tree with layer assignments
|-- component-map.md              # Stories -> files mapping (NEW)
|-- deployment.md                 # Docker, env vars, migrations
+-- mockups/                      # UI mockups (HTML)
```

### Enforcement Flow

- **Generator reads:** component-map.md (file ownership), api-contracts.md (endpoints), data-models.md (types), folder-structure.md (layers)
- **Evaluator verifies:** api-contracts.schema.json (response shapes), data-models.schema.json (entity structures), folder-structure.md (files exist), component-map.md (expected files created)
- **Hooks verify:** layer imports are one-way (check-architecture), full scan before commit (pre-commit-gate)

### Architecture Amendment Process

If the generator discovers the architecture needs adjustment during implementation:

1. **Generator writes amendment proposal** to `specs/design/amendments/{group}-{n}.md` with: what needs to change, why, and which schema files are affected. The generator does NOT modify architecture files directly.
2. **`/auto` detects the amendment file** (checks `specs/design/amendments/` after each agent team completes). If found, it spawns the planner as a subagent with the prompt: "Read amendment proposal at {path}. Update the architecture artifacts (`.md` + `.schema.json`) accordingly. Commit the changes."
3. **Planner updates** `api-contracts.md`, `api-contracts.schema.json`, `data-models.md`, `data-models.schema.json`, `component-map.md` as needed.
4. Amendment committed: `refactor: update api-contracts for ParseOptions`
5. Generator implements against updated contract
6. Evaluator verifies against updated schema

This file-based handoff avoids needing direct agent-to-agent messaging between generator and planner (which would require them to be in the same team).

---

## 7. The `/auto` Loop — Karpathy Ratchet + GAN Evaluator

### Per-Iteration Steps

1. **Context recovery:** Read program.md, learned-rules.md, claude-progress.txt, features.json, dependency-graph.md
2. **Pick next group** from dependency graph (first unfinished)
3. **Negotiate sprint contract:** Generator + evaluator agree on done criteria, save to `sprint-contracts/{group}.json`
4. **Spawn agent team:** Generator creates team with 1 teammate per story, file ownership from component-map.md, learned rules injected into all prompts
5. **Ratchet gate (expanded):**
   - Gate 1: Unit tests pass (pytest, vitest)
   - Gate 2: Lint + types clean (ruff, mypy, tsc — read from manifest)
   - Gate 3: Coverage >= baseline
   - Gate 4: Architecture alignment (files exist, responses match schemas)
   - Gate 5: Evaluator verdict (API + Playwright against running Docker stack)
   - Gate 6: Design critic score (frontend groups only, GAN loop if below threshold)
6. **PASS:** git commit, update features.json + claude-progress.txt + iteration-log.md + coverage-baseline
7. **FAIL:** Self-heal loop (max 3):
   - Diagnose: read evaluator report for specific failure
   - Classify: API fail / Playwright fail / design score / test / lint / coverage / Docker
   - Targeted fix: generator fixes specific failure
   - Re-run gate
   - 3rd fail: revert, log to failures.md, extract learned rule, escalate
8. **State updates:** Update program.md Current Focus
9. **Check stopping criteria:** All features pass / 3 consecutive failures / coverage drop / max iterations

### Self-Healing Categories

| Category | Signal | Auto-fix |
|----------|--------|----------|
| Lint/format | ruff/eslint fails | `ruff check --fix && ruff format` |
| Type error | mypy/tsc | Fix annotation |
| Test failure | pytest/vitest fails | Fix code, not test |
| Import error | ImportError | Fix layer/init |
| Coverage drop | below baseline | Add tests for uncovered lines |
| API check fail | Evaluator: 500/404/wrong schema | Read error, fix service/router |
| Playwright fail | Evaluator: element not found/wrong state | Read selector, fix component |
| Design score low | Critic: score < threshold | Apply critique, regenerate UI |
| Docker fail | Container won't start | Read logs, fix config/deps |
| Architecture drift | Response doesn't match schema | Read schema, fix response shape |

### Session Chaining

For builds spanning multiple context windows:
- Each window starts by reading 4 files (~500 tokens): claude-progress.txt, features.json, git log, learned-rules.md
- Progress file records exact resumption point
- Features.json tracks granular pass/fail per feature
- No wasted work rebuilding context

#### `claude-progress.txt` Format Specification

```
=== Session {N} ===
date: {ISO 8601 timestamp}
mode: {full|lean|solo}
groups_completed: [{comma-separated group IDs}]
groups_remaining: [{comma-separated group IDs}]
current_group: {group ID} ({group description})
current_stories: [{comma-separated story IDs}]
sprint_contract: sprint-contracts/{group}.json
last_commit: {short hash} "{commit message}"
features_passing: {N} / {total}
coverage: {N}%
learned_rules: {N}
blocked_stories: [{comma-separated or "none"}]
next_action: {what /auto should do next}
```

Each field is a key-value pair on its own line. The `=== Session {N} ===` header is appended (not overwritten) so the file serves as a session history. The agent reads only the LAST session block for recovery.

### Stopping Criteria Precedence

Stopping criteria are evaluated as OR — ANY one triggers a halt. In case of conflict:

1. **Hard stop (immediate):** Architecture violation hooks can't fix, or max iterations exceeded
2. **Escalate to human:** A story fails 3 consecutive iterations → halt with BLOCKED status
3. **Coverage gate:** Coverage drops below threshold after a commit → halt (this overrides "all features pass" because a coverage regression means something was deleted or broken)
4. **Success:** All features in features.json pass AND coverage >= threshold → halt with SUCCESS status

The priority order means: if all features pass but coverage dropped, the harness halts with a FAIL, not SUCCESS.

### Docker Stack Management

The evaluator needs a running application. Docker lifecycle is managed as follows:

- **Startup:** `/auto` runs `bash init.sh` before the first evaluator check of each iteration. `init.sh` uses `docker compose up -d --build` which is incremental — only rebuilds changed services.
- **Health gate:** After startup, evaluator runs health checks with retry: `curl --retry 10 --retry-delay 3 --retry-all-errors -sf $url`. URLs come from `project-manifest.json` (`api_base_url` + `health_check`, `ui_base_url`). If health checks fail after all retries → Docker fail category in self-healing.
- **Between groups:** Docker stack stays running. No teardown between groups. Services are rebuilt only if code changed (`docker compose up -d --build` handles this).
- **Port conflicts:** `project-manifest.json` defines ports. If a port is in use, `init.sh` runs `docker compose down` first, then `up`. This is a sequential fallback, not the default.
- **Teardown:** Docker is torn down only on `/auto` completion (all groups done or stopping criteria met): `docker compose down -v`.
- **Evaluator does NOT start Docker itself.** The `/auto` orchestrator starts it. The evaluator assumes services are healthy when it runs.

### GAN Design Loop (frontend groups)

After main ratchet passes, if group contains UI stories:
1. Design critic takes screenshots of contract-listed pages
2. Scores against 4 criteria (1-10 each)
3. If average < threshold → sends specific critique to generator
4. Generator iterates on UI code
5. Re-screenshot, re-score
6. Max 5 iterations. If still below → log failure, extract rule, escalate.

---

## 8. Feature List System

### Format

```json
[
  {
    "id": "F001",
    "category": "functional",
    "story": "E3-S1",
    "group": "C",
    "description": "Upload endpoint accepts PDF, DOCX, PNG, JPG, TIFF",
    "steps": [
      "POST /documents/upload with sample file",
      "Verify 201 response with document_id",
      "Verify file stored in upload directory",
      "POST with .exe file -> verify 415 rejection"
    ],
    "passes": false,
    "last_evaluated": null,
    "failure_reason": null,
    "failure_layer": null
  }
]
```

### Rules

- Generated by `/spec` from acceptance criteria
- Each acceptance criterion maps to 1+ features with testable steps
- Agents may ONLY modify: `passes`, `last_evaluated`, `failure_reason`, `failure_layer`
- `failure_layer` is one of: `"api"`, `"playwright"`, `"design"`, `"unit_test"`, `"lint"`, `"docker"`, or `null`
- Features cannot be removed, and `id`, `description`, `steps` cannot be edited — prevents the generator from "passing" by deleting hard tests
- Evaluator updates fields after verifying against running app
- `last_evaluated` is ISO 8601 timestamp of last evaluation run

---

## 9. Skills

### Task Skills (10)

| Skill | Agent(s) | Purpose | Human Gate? |
|-------|----------|---------|-------------|
| `/brd` | planner | Socratic interview -> BRD | Yes |
| `/spec` | planner | BRD -> stories + dependency graph + features.json | Yes |
| `/design` | planner + ui-designer (concurrent) | Architecture + schemas + mockups | Yes |
| `/implement` | generator (+ agent teams) | One group, code + tests | No |
| `/evaluate` | evaluator | Run app, verify sprint contract | No |
| `/review` | evaluator + security-reviewer (concurrent) | Full evaluation + security | No |
| `/test` | test-engineer | Test plan + Playwright E2E generation | No |
| `/deploy` | planner | Docker Compose + init.sh generation | No |
| `/build` | orchestrates all | Full pipeline, phases 1-3 human-gated | Phases 1-3 |
| `/auto` | orchestrates generator/evaluator/critic | Karpathy ratchet loop | No |

### Support Skills (3, no agent binding)

| Skill | Purpose |
|-------|---------|
| `/fix-issue [#n]` | GitHub issue -> branch -> fix -> test -> PR |
| `/refactor [path]` | Quality-driven refactoring with ratchet |
| `/improve [desc]` | Feature enhancement with story requirement |

### Reference Skills (4)

| Skill | Read By | Content |
|-------|---------|---------|
| `code-gen` | generator, teammates | Quality principles, patterns, testing rules |
| `architecture` | planner, generator | Layered design, API patterns, folder templates |
| `evaluation` | evaluator, design-critic | Sprint contract format, scoring rubric, Playwright patterns |
| `testing` | test-engineer, evaluator | Test strategy, Playwright selectors, fixture patterns |

---

## 10. Hooks

### Configuration

12 hooks total. Security hooks block (exit 2). Quality hooks warn or block. Gate hooks block on commit.

**Retained from forge_v2:**
- `scope-directory.js` — Block writes outside project
- `protect-env.js` — Block .env modifications
- `detect-secrets.js` — Scan for API keys, PII
- `lint-on-save.js` — Auto-fix (reads manifest for tool)
- `typecheck.js` — Type validation (reads manifest)
- `check-architecture.js` — Block upward layer imports (reads manifest for layer config)
- `check-function-length.js` — Warn >50 lines
- `check-file-length.js` — Warn 200, block 300
- `pre-commit-gate.js` — Full architecture scan before commit
- `task-completed.js` — Architecture scan + /review reminder

**New:**
- `sprint-contract-gate.js` — Block commit if group's sprint contract evaluator verdict != PASS
- `teammate-idle-check.js` — Verify tests exist before teammate goes idle (TeammateIdle hook)

### Hook-Stack Flexibility

`lint-on-save.js` and `typecheck.js` read `project-manifest.json` to determine which tools to run. This means the same hook works for Python (ruff), TypeScript (tsc), or any future stack.

---

## 11. `project-manifest.json`

Generated per project during `/scaffold` or `/brd`. Tells hooks and agents what tools to use.

```json
{
  "name": "my-project",
  "stack": {
    "backend": {
      "language": "python",
      "version": "3.12",
      "framework": "fastapi",
      "package_manager": "uv",
      "linter": "ruff",
      "typechecker": "mypy",
      "test_runner": "pytest"
    },
    "frontend": {
      "language": "typescript",
      "framework": "nextjs",
      "version": "16",
      "package_manager": "npm",
      "linter": "eslint",
      "typechecker": "tsc",
      "test_runner": "vitest"
    },
    "database": {
      "primary": "postgresql",
      "secondary": null
    },
    "deployment": {
      "method": "docker-compose",
      "services": ["backend", "frontend", "db"]
    }
  },
  "evaluation": {
    "api_base_url": "http://localhost:8000",
    "ui_base_url": "http://localhost:3000",
    "health_check": "/health",
    "design_score_threshold": 7,
    "design_max_iterations": 5,
    "test_corpus_dir": "test-corpus/"
  },
  "execution": {
    "default_mode": "full",
    "max_self_heal_attempts": 3,
    "max_auto_iterations": 50,
    "coverage_threshold": 80,
    "session_chaining": true,
    "agent_team_size": "auto",
    "teammate_model": "sonnet"
  }
}
```

---

## 12. Execution Modes

### Full Mode (default)

All agents, agent teams, sprint contracts, evaluator, design critic GAN loop.
- Cost: ~$100-300
- Duration: 2-8 hours
- Best for: Production apps, complex requirements, external API integrations
- **Skill behavior:** All skills operate normally. `/auto` runs full ratchet gate (all 6 sub-gates). `/evaluate` runs all 3 verification layers. Sprint contracts negotiated per group.

### Lean Mode

Agent teams and evaluator, but no design critic GAN loop. API + Playwright verification only.
- Cost: ~$30-80
- Duration: 1-3 hours
- Best for: Backend-heavy apps, internal tools, admin dashboards
- **Skill behavior:**
  - `/auto` runs ratchet gates 1-5 only (skips gate 6: design critic)
  - `/evaluate` runs Layer 1 (API) + Layer 2 (Playwright) only (skips Layer 3: vision scoring)
  - Sprint contracts omit `design_checks` section
  - Agent teams still used for parallel story execution
  - `max_self_heal_attempts` reduced to 2

### Solo Mode

Single generator agent, no teams, no evaluator. Tests + lint ratchet only.
- Cost: ~$5-15
- Duration: 15-45 minutes
- Best for: Bug fixes, small features, prototyping
- **Skill behavior:**
  - `/auto` runs ratchet gates 1-3 only (tests + lint + coverage). No evaluator, no architecture schema validation, no design critic.
  - `/evaluate` is a no-op (prints "Solo mode: skipping evaluator. Run tests manually.")
  - `/implement` uses generator directly (no agent team, no `TeamCreate`)
  - Sprint contracts not generated. Stories executed sequentially.
  - `/review` runs security-reviewer only (no evaluator)
  - Session chaining still active (features.json + progress file still updated)

### Token-Saving Strategies

- Evaluator caching: each group verified once, not re-run
- Incremental Docker rebuilds: only changed services
- Feature list delta: only read failing features
- Learned rules compression: summarize after 20+ rules
- Selective design critic: only on groups with UI stories
- Teammate model: Sonnet for execution, Opus for judgment

---

## 13. File Structure

```
.claude/
|-- agents/                          # 7 agent definitions
|   |-- planner.md
|   |-- generator.md
|   |-- evaluator.md
|   |-- design-critic.md
|   |-- security-reviewer.md
|   |-- ui-designer.md
|   +-- test-engineer.md
|
|-- skills/                          # 10 task + 3 support + 4 reference = 17 skills
|   |-- brd/SKILL.md
|   |-- spec/SKILL.md
|   |-- design/SKILL.md
|   |-- implement/SKILL.md
|   |-- evaluate/SKILL.md           # NEW
|   |-- review/SKILL.md
|   |-- test/SKILL.md
|   |-- deploy/SKILL.md
|   |-- build/SKILL.md
|   |-- auto/SKILL.md
|   |-- fix-issue/SKILL.md
|   |-- refactor/SKILL.md
|   |-- improve/SKILL.md
|   |-- code-gen/SKILL.md           # Reference
|   |-- architecture/SKILL.md       # Reference
|   |-- evaluation/                  # Reference (NEW)
|   |   |-- SKILL.md
|   |   +-- references/
|   |       |-- contract-schema.json
|   |       |-- scoring-rubric.md
|   |       +-- playwright-patterns.md
|   +-- testing/                     # Reference
|       |-- SKILL.md
|       +-- references/
|
|-- hooks/                           # 12 enforcement hooks
|   |-- scope-directory.js
|   |-- protect-env.js
|   |-- detect-secrets.js
|   |-- lint-on-save.js
|   |-- typecheck.js
|   |-- check-architecture.js
|   |-- check-function-length.js
|   |-- check-file-length.js
|   |-- pre-commit-gate.js
|   |-- sprint-contract-gate.js      # NEW
|   |-- teammate-idle-check.js       # NEW
|   +-- task-completed.js
|
|-- state/
|   |-- iteration-log.md
|   |-- learned-rules.md
|   +-- failures.md
|
|-- templates/
|   |-- sprint-contract.json
|   |-- features-template.json
|   |-- init-sh.template
|   |-- docker-compose.template.yml
|   +-- playwright.config.template.ts
|
|-- architecture.md
|-- program.md
|-- settings.json
|
|-- .claude-plugin/
|   +-- plugin.json
+-- commands/
    +-- scaffold.md

# Project root (created by /scaffold)
|-- CLAUDE.md
|-- design.md
|-- project-manifest.json
|-- features.json
|-- claude-progress.txt
|-- init.sh
|
|-- specs/
|   |-- brd/
|   |-- stories/
|   |-- design/
|   |   +-- mockups/
|   |-- reviews/
|   +-- test_artefacts/
|
|-- sprint-contracts/
|-- backend/
|-- frontend/
+-- e2e/
```

---

## 14. Scaffold Command

### `/scaffold` Steps

1. Detect plugin source via `$CLAUDE_PLUGIN_DIR`
2. Ask user: "What are you building?" (brief description)
3. Ask user: "What's your tech stack?" or offer presets
4. Generate `project-manifest.json` from answers
5. Copy scaffold to project: agents, skills, hooks, state, templates, config
6. Create output directories: specs/, sprint-contracts/
7. Generate `CLAUDE.md` tailored to chosen stack
8. Generate `design.md` (architecture reference)
9. Generate `init.sh` from manifest (install deps, start Docker, health checks)
10. Initialize git with `.gitignore`
11. Initialize `features.json` (empty array)
12. Initialize `claude-progress.txt`: "Session 0: Project scaffolded. Next: /brd"
13. Report: "Installed 7 agents, 17 skills, 12 hooks, 5 templates. Run /brd to start."

---

## 15. Quality Principles

Retained from forge_v2, enforced by hooks and code reviewer:

1. **Small modules** — One file = one responsibility. Warn at 200 lines, block at 300.
2. **Static typing** — Type-annotate everything. Zero `any` in TypeScript.
3. **Functions under 50 lines** — Decompose into named subfunctions.
4. **Explicit error handling** — Typed error classes, no bare exceptions.
5. **No dead code** — Every line traces to a story.
6. **Self-documenting** — Good names over comments, types as documentation.

---

## 16. Key Differences from Forge v2

| Aspect | Forge v2 | Harness Engine v1 |
|--------|----------|-------------------|
| Agents | 8 equal agents | 3 core + 4 specialists |
| Evaluation | Code reviewer reads code | Evaluator runs app (API + Playwright + Vision) |
| Frontend quality | UI mockup templates | GAN loop with 4 gradable criteria |
| Tech stack | Fixed (Python/React) | Configurable via project-manifest.json |
| Long-running | Single context window | Session chaining (features.json + progress file) |
| Work units | Stories only | Stories + sprint contracts wrapping groups |
| Architecture enforcement | Advisory docs only | Machine-readable schemas, evaluator validates |
| Agent teams | Agent tool only | Full Claude Code agent teams with shared tasks |
| Ratchet gate | Tests + lint | Tests + lint + coverage + architecture + evaluator + critic |
| Self-healing | 7 error categories | 10 error categories (+ API, Playwright, Docker, design) |
| Execution modes | One mode | Full / Lean / Solo |

---

## Sources

- [Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Generator-evaluator GAN architecture, design scoring criteria, sprint contracts, cost analysis
- [Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Feature list system, session chaining, init.sh bootstrap, progress files
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — Shared task lists, teammate messaging, plan approval, TeammateIdle hooks
- [Claude Code Forge v2](https://github.com/cwijayasundara/claude_code_forge_v2) — Karpathy ratcheting pattern, program.md, learned-rules, self-healing, hooks, layered architecture
