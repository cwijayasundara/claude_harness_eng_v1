# Claude Harness Engine v1 — Architecture Reference

Quick reference for architecture, agents, hooks, state, and sprint contracts.
Copied into target projects by `/scaffold`.

Based on:
- [Anthropic: Harness Design for Long-Running Apps](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)

---

## System Architecture

```
+---------------------------------------------------------------------+
|                        HUMAN INTERFACE                                |
|                                                                      |
|  program.md           CLAUDE.md            project-manifest.json     |
|  (Karpathy bridge)    (table of contents)  (stack + eval config)     |
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
|                             Agent Teams  Playwright   Vision Score   |
|                             (parallel     MCP + API    (GAN loop,   |
|                              stories)    + Docker logs  weighted)    |
|                                                                      |
|  Support: /fix-issue  /refactor  /improve  /lint-drift  /deploy      |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                     AGENT LAYER (7 agents)                           |
|  planner / generator / evaluator / design-critic /                   |
|  security-reviewer / ui-designer / test-engineer                     |
|                                                                      |
|  Model tiering: Opus for judgment (orchestrator, evaluator, critic)  |
|                 Sonnet for execution (generator teammates)           |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                   ENFORCEMENT LAYER (12 hooks)                       |
|  All hooks include remediation instructions ("Fix: ...")             |
|                                                                      |
|  Security: scope-directory | protect-env | detect-secrets            |
|  Quality:  lint-on-save | typecheck | check-architecture             |
|            check-function-length | check-file-length                 |
|  Gates:    pre-commit-gate | sprint-contract-gate                    |
|  Teams:    teammate-idle-check                                       |
|  Info:     task-completed                                            |
+--------+------------------+--------------------+--------------------+
         |                  |                    |
         v                  v                    v
+---------------------------------------------------------------------+
|                       STATE LAYER                                    |
|  program.md | iteration-log.md | learned-rules.md | failures.md     |
|  coverage-baseline | features.json | claude-progress.txt             |
|  sprint-contracts/ | eval-scores.json                               |
+---------------------------------------------------------------------+
```

---

## Karpathy Ratchet Loop

```
Start /auto --mode {full|lean|solo|turbo}
    |
    v
Read program.md + learned-rules.md + claude-progress.txt + features.json
    |
    v
Pick next unfinished group from dependency graph
    |
    v
Negotiate sprint contract (Generator proposes -> Evaluator finalises)
    |
    v
Spawn agent team (1 teammate per story, file ownership from component-map)
    |
    v
Ratchet Gate ---------------------------------------------------------------+
    Gate 1: Unit tests pass (pytest / vitest)              [all modes]      |
    Gate 2: Lint + types clean (ruff / mypy / tsc)         [all modes]      |
    Gate 3: Coverage >= 80% floor AND >= baseline          [all modes]      |
    Gate 4: Architecture alignment (files, schemas)        [full/lean]      |
    Gate 5: Evaluator verdict (API + Playwright + logs)    [full/lean]      |
    Gate 6: Design critic (weighted, max 10 iterations)    [full only]      |
    |                                                                       |
   PASS                                                                   FAIL
    |                                                                       |
    v                                                           Self-heal (max 3)
git commit, update features.json +                                          |
claude-progress.txt + iteration-log.md                          Diagnose -> Classify
    |                                                           -> Docker logs
    v                                                           -> Targeted fix
Fast lane: skip gates 4-6 for                                  -> Re-run gate
lint-only / doc-only commits                                                |
    |                                                           3rd fail: revert
    v                                                           + learn rule
Next group                                                      + escalate
    |
    v
All groups done -> docker compose down -v -> DONE
```

### Execution Modes

| Mode | Cost | Gates | Agent Teams | Evaluator | Design Critic |
|------|------|-------|-------------|-----------|---------------|
| **Full** | $100-300 | All 6 | Yes | Per group | Per group (10 iter) |
| **Lean** | $30-80 | 1-5 | Yes | Per group | Skipped |
| **Solo** | $5-15 | 1-3 | No | Skipped | Skipped |
| **Turbo** | $30-50 | 1-3 per commit, 4-6 at end | No | Once at end | Once at end |

---

## Agent Roles

| Agent | Role | Model | Spawned By |
|-------|------|-------|------------|
| planner | BRD, specs, architecture, feature list, schemas | Opus | `/brd`, `/spec`, `/design` |
| generator | Code + tests, spawns agent teams, proposes sprint contracts | Sonnet | `/implement`, `/auto` |
| evaluator | Runs app, verifies contracts (API + Playwright + Docker logs) | Opus | `/evaluate`, `/auto` |
| design-critic | GAN scoring (4 weighted criteria, max 10 iterations, pivot on stagnation) | Opus | `/auto` (frontend) |
| security-reviewer | OWASP vulnerability scan | Sonnet | `/review`, `/auto` |
| ui-designer | React+Tailwind mockups from stories and API contracts | Sonnet | `/design` |
| test-engineer | Test plan, Playwright E2E test files, data fixtures | Sonnet | `/test` |

---

## Three-Layer Verification

| Layer | What | How | Mode |
|-------|------|-----|------|
| **1. API** | Endpoints return correct status + schema | `curl` against running Docker + `jsonschema` validation + Docker log reading on failure | Full, Lean |
| **2. Playwright** | UI works as user expects | Playwright MCP: navigate, click, fill, assert (getByRole, not CSS) | Full, Lean |
| **3. Vision** | UI has distinctive, quality design | Screenshots scored on 4 weighted criteria; pivot after 2 stagnant iterations | Full only |

### Design Scoring (weighted)

| Criterion | Weight | What it measures |
|-----------|--------|-----------------|
| Design Quality | 1.5x | Coherent visual identity, color palette, layout |
| Originality | 1.5x | Distinctive vs template defaults |
| Craft | 0.75x | Typography hierarchy, spacing, alignment |
| Functionality | 0.75x | User can understand and complete tasks |

Formula: `(DQ * 1.5 + O * 1.5 + C * 0.75 + F * 0.75) / 4.5`
Threshold: configurable (default 7). Calibration examples in `evaluation/references/scoring-examples.md`.

---

## Hook Execution Order

All hooks include **remediation instructions** ("Fix: ...") to guide agents toward corrections.

| Hook | Trigger | Behavior |
|------|---------|----------|
| `scope-directory.js` | Edit/Write | Block — writes outside project |
| `protect-env.js` | Edit/Write | Block — .env modifications (allows .env.example) |
| `detect-secrets.js` | Edit/Write | Block — API keys, tokens, PII |
| `lint-on-save.js` | Edit/Write | Auto-fix — reads manifest for tool (ruff/eslint) |
| `typecheck.js` | Edit/Write | Warn — reads manifest (mypy/tsc) |
| `check-architecture.js` | Edit/Write | Block — upward layer imports |
| `check-function-length.js` | Edit/Write | Warn — functions over 50 lines |
| `check-file-length.js` | Edit/Write | Warn 200, Block 300 lines |
| `pre-commit-gate.js` | Bash (git commit) | Block — full architecture scan |
| `sprint-contract-gate.js` | Bash (git commit) | Block — evaluator verdict required |
| `teammate-idle-check.js` | TeammateIdle | Block — no tests = no idle |
| `task-completed.js` | TaskCompleted | Info — architecture scan + /review reminder |

---

## State Files

| File | Growth | Purpose |
|------|--------|---------|
| `program.md` | Edited by human | Karpathy bridge — edit to steer `/auto` mid-run |
| `iteration-log.md` | Append-only | Full history: stories, verdicts, coverage, commits |
| `learned-rules.md` | Monotonic (never deleted) | Defensive rules from past failures |
| `failures.md` | Append-only | Raw failure data for pattern extraction |
| `coverage-baseline.txt` | Ratcheted upward | Never drops; floor is 80% |
| `features.json` | Updated per evaluation | Granular pass/fail with failure_layer and timestamps |
| `claude-progress.txt` | Appended per session | Session chaining recovery context |
| `sprint-contracts/` | One file per group | Negotiated done-criteria; immutable after negotiation |
| `eval-scores.json` | Appended per critique | Design scores over time |

---

## Sprint Contract Format

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
        "steps": ["Navigate to /upload", "Upload file", "Click submit", "Verify success"]
      }
    ],
    "performance_checks": [
      {
        "endpoint": "/documents/upload",
        "method": "POST",
        "max_response_time_ms": 500
      }
    ],
    "design_checks": {
      "pages": ["/upload", "/documents/{id}"],
      "min_score": 7,
      "criteria": ["design_quality", "originality", "craft", "functionality"]
    },
    "architecture_checks": {
      "files_must_exist": ["backend/src/api/upload_router.py"],
      "schema_validation": true
    }
  }
}
```

---

## Quality Principles

1. **TDD mandatory** — Write failing tests FIRST, then implement. Red-green-refactor.
2. **100% meaningful coverage** — Every line verified by a test. 80% hard floor. (ref: Steve Krenzel)
3. **Small modules** — One file = one responsibility. Warn 200, block 300 lines.
4. **Static typing** — Zero `any` in TypeScript. Full annotations in Python.
5. **Functions under 50 lines** — Decompose into named, testable subfunctions.
6. **Explicit error handling** — Typed error classes, no bare exceptions.
7. **No dead code** — Every line traces to a story. Run `/lint-drift` to detect.
8. **Self-documenting** — Good names over comments, types as documentation.

---

## Pipeline Commands

| Command | Purpose | Human Gate? |
|---------|---------|-------------|
| `/brd` | Socratic interview -> BRD | Yes |
| `/spec` | BRD -> stories + dependency graph + features.json | Yes |
| `/design` | Architecture + schemas + mockups | Yes |
| `/implement` | Code generation with agent teams | No |
| `/evaluate` | Run app, verify sprint contract | No |
| `/review` | Evaluator + security review | No |
| `/test` | Test plan + Playwright E2E generation | No |
| `/deploy` | Docker Compose + init.sh | No |
| `/build` | Full 8-phase pipeline | Phases 1-3 |
| `/auto` | Autonomous ratcheting loop | No (reads program.md) |
| `/fix-issue` | GitHub issue workflow | No |
| `/refactor` | Quality-driven refactoring | No |
| `/improve` | Feature enhancement | No |
| `/lint-drift` | Entropy scanner for pattern drift | No |
