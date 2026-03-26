---
name: auto
description: Autonomous build loop with Karpathy ratcheting, GAN evaluator, and session chaining. Iterates story groups until all features pass or stopping criteria met.
disable-model-invocation: true
argument-hint: "[--mode full|lean|solo] [--group GROUP_ID]"
context: fork
---

# Auto Skill

Autonomous build loop implementing Karpathy's ratcheting pattern with GAN-style generator-evaluator separation, agent teams for parallel execution, sprint contracts for verifiable done-criteria, self-healing with failure-driven learning, and session chaining for multi-context-window builds.

---

## SECTION 1: Usage, Prerequisites, and Agent Delegation

### Usage

```
/auto
/auto --mode lean
/auto --mode solo
/auto --group D
```

- `--mode` controls which ratchet gates are enforced. Default: `full`.
- `--group` resumes or targets a specific dependency group. If omitted, picks the next unfinished group from the dependency graph.

### Prerequisites

Before `/auto` can run, the following must exist:

- `specs/stories/` — approved story files with acceptance criteria.
- `specs/design/` — approved architecture artifacts including `api-contracts.md` and `component-map.md`.
- `.claude/program.md` — project constraints and conventions.
- `features.json` — feature tracking file (created by `/spec`).
- `specs/stories/dependency-graph.md` — group ordering and dependencies.
- `claude-progress.txt` — session tracking file (created by `/build` phase 4).

If any prerequisite is missing, stop and report what is absent. Do not proceed with partial context.

### Agent Delegation

**Critical rule: /auto orchestrates but NEVER implements code directly.**

- `/auto` is the orchestrator. It reads state, makes decisions, spawns agents, and manages the loop.
- Code generation is delegated to the **generator** agent (via `/implement` or direct agent spawn).
- Code verification is delegated to the **evaluator** agent (via `/evaluate` or direct agent spawn).
- Design critique is delegated to the **design-critic** agent.
- `/auto` never writes application code, tests, or configuration files itself.

---

## SECTION 2: Context Recovery (Step 1 of Every Iteration)

At the start of EVERY iteration — including the first — read these files in order:

1. **`.claude/program.md`** — Constraints may have changed mid-run. Re-read every iteration. Never cache.
2. **`.claude/state/learned-rules.md`** — Accumulated project rules. Inject verbatim into ALL agent prompts spawned this iteration.
3. **`claude-progress.txt`** — Read the LAST session block (the block after the final `=== Session` marker). Extract: `current_group`, `groups_completed`, `groups_remaining`, `last_commit`, `next_action`.
4. **`features.json`** — Current pass/fail state for all features. Determines what work remains.
5. **`specs/stories/dependency-graph.md`** — Pick the next unfinished group. A group is "unfinished" if any of its stories' features are not passing in `features.json`. Respect dependency ordering: do not start a group whose upstream dependencies have failing features.

If `claude-progress.txt` indicates a `current_group` that is not yet complete, resume that group. Otherwise, select the next unfinished group in dependency order.

---

## SECTION 3: Sprint Contract Negotiation (Steps 2-3)

Sprint contracts define the verifiable done-criteria for a group. Two-step propose-approve process using generator and evaluator agents.

### Step 2 — Generator Proposes Contract

Spawn generator as a subagent with this prompt:

> Read stories [list IDs for this group], `specs/design/api-contracts.md`, `specs/design/component-map.md`. Propose a sprint contract for group {ID}. Include: api_checks, playwright_checks, design_checks, architecture_checks, features list. Write the contract to `sprint-contracts/{group}.json`.

The generator produces a draft contract based on the story acceptance criteria and the architecture design.

### Step 3 — Evaluator Approves Contract

Spawn evaluator as a subagent with this prompt:

> Read the proposed sprint contract at `sprint-contracts/{group}.json`. Review each check against the story acceptance criteria and API contracts. Add any missing checks. Remove any checks that do not trace to an acceptance criterion. Write the final contract to the same path.

Rules:
- **No back-and-forth.** The evaluator has final say. The generator does not get to dispute.
- **Contract is immutable after negotiation.** Once the evaluator writes the final version, no one edits it.
- **Skip in Solo mode.** In Solo mode, the generator works directly without contracts or evaluator verification.

---

## SECTION 4: Agent Team Execution (Step 4)

Spawn the generator agent to create and manage a Claude Code agent team for the current group.

### Team Structure

- **1 teammate per story**, maximum **5 concurrent teammates**.
- If the group has more than 5 stories, batch: run the first 5, then the remainder after all complete.
- File ownership is assigned from `specs/design/component-map.md`. Each teammate owns specific files and may not edit files outside their assignment without coordinator approval.

### Teammate Spawn Prompt Requirements

Every teammate prompt must include:

1. The story's full acceptance criteria.
2. The file ownership list for that story from `component-map.md`.
3. All learned rules from `.claude/state/learned-rules.md` (verbatim).
4. Quality principles from `.claude/skills/code-gen/SKILL.md`.
5. Instruction to **message teammates** before modifying any shared type or interface file.
6. Instruction to **present a plan and await approval** before writing code.

### Teammate Coordination

- Before editing a shared type definition, the teammate must message affected teammates describing the change.
- If two teammates claim the same file, escalate to the orchestrator for resolution.

### Solo Mode

In Solo mode, the generator works directly without spawning a team. It implements all stories sequentially, following the same quality principles and plan-approval workflow.

### Model Tiering (cost optimization)

Use the least powerful model that can handle each role:

| Role | Recommended Model | Why |
|------|------------------|-----|
| /auto orchestrator | opus | Judgment, coordination, architectural decisions |
| Evaluator | opus | Must be skeptical, catch subtle issues |
| Design critic | opus | Subjective visual judgment |
| Generator (lead) | sonnet | Coordination, file assignment |
| Generator teammates | sonnet | Mechanical implementation from specs |
| Security reviewer | sonnet | Pattern matching against known vulnerabilities |

Configure teammate model in `project-manifest.json` → `execution.teammate_model`.
The orchestrator and evaluator always use the most capable model available.

---

## SECTION 5: Ratchet Gate (Step 5)

After the agent team completes, run the ratchet gate. The ratchet is monotonic: progress never regresses. Six sub-gates, mode-dependent:

| Gate | Full | Lean | Solo |
|------|------|------|------|
| 1. Unit tests (pytest, vitest) | Yes | Yes | Yes |
| 2. Lint + types (ruff, mypy, tsc) | Yes | Yes | Yes |
| 3. Coverage >= baseline | Yes | Yes | Yes |
| 4. Architecture (files exist, schema validation) | Yes | Yes | No |
| 5. Evaluator (API + Playwright vs running Docker) | Yes | Yes | No |
| 6. Design critic (vision scoring, GAN loop) | Yes | No | No |

### Fast Lane (trivial changes)

Skip gates 4-6 (architecture, evaluator, design critic) for commits that ONLY contain:
- Lint/format fixes (ruff auto-fix, eslint --fix)
- Documentation updates (.md files only)
- Type annotation fixes (no logic changes)
- Learned rules updates

Detection: If `git diff --name-only` shows only .md files, or if the commit message starts with `fix: lint` or `docs:`, skip the evaluator. Gates 1-3 (tests + lint + coverage) always run.

This prevents the expensive evaluator from blocking trivial housekeeping changes.

### Gate 1 — Unit Tests

```bash
cd backend && uv run pytest -x -q && cd ..
cd frontend && npm test && cd ..
```

Both must pass with zero failures. The `-x` flag stops at first failure for fast feedback.

### Gate 2 — Lint + Types

```bash
# Backend
uv run ruff check . && uv run mypy src/
# Frontend
npm run lint && npm run typecheck
```

All four commands must exit with code 0.

### Gate 3 — Coverage >= Baseline

```bash
uv run pytest --cov=src --cov-report=term-missing -q | grep "^TOTAL" | awk '{print $NF}'
```

Compare the result with `.claude/state/coverage-baseline.txt`. The new coverage percentage must be **greater than or equal to the baseline AND >= 80% (hard floor)**. If it drops below either threshold, the gate FAILS — even if all tests pass.

**Coverage policy (ref: "AI is forcing us to write good code" by Steve Krenzel):**
- **Floor: 80%.** No commit may drop below this. The ratchet gate BLOCKS.
- **Target: 100%.** Every line the agent wrote must be verified by a test. At 100%, any uncovered line is an unambiguous signal of missing verification.
- **TDD enforced:** Tests are written BEFORE implementation. The generator and teammates must follow the red-green-refactor cycle: write failing test → implement → verify pass → commit.

### Gate 4 — Architecture Checks

Spawn evaluator to verify `architecture_checks` from the sprint contract:
- All files in `files_must_exist` must be present on disk.
- Schema validation against `specs/design/api-contracts.schema.json` if specified.

### Gate 5 — Evaluator (API + Playwright)

Spawn evaluator with the full sprint contract. The evaluator runs:
- All `api_checks` against the live Docker stack.
- All `playwright_checks` against the running UI.

The evaluator writes its report to `specs/reviews/evaluator-report.md`.

### Gate 6 — Design Critic (Full Mode Only)

Spawn design-critic on every page listed in the sprint contract's `design_checks`. The critic screenshots each page, scores visual fidelity, and returns PASS/FAIL per check. See SECTION 9 for the full GAN loop if scores are below threshold.

---

## SECTION 6: PASS/FAIL Handling (Steps 6-7)

### On PASS (All Gates Clear)

Execute these steps in order:

1. **Commit:** `git add -A && git commit -m "feat: implement group {group}"`
2. **Update features.json:** Set `passes: true` for all features in this group's sprint contract.
3. **Update claude-progress.txt:** Append a new session block (see SECTION 10 for format).
4. **Update iteration-log.md:** Append entry with group ID, timestamp, verdict, and summary.
5. **Update coverage-baseline.txt:** Write the new coverage percentage (ratchet up).
6. **Next group:** Return to SECTION 2 (context recovery) for the next iteration.

### On FAIL — Self-Healing Loop (Max 3 Attempts)

Do not immediately revert. Attempt targeted self-healing first.

**Attempt 1-3:**

1. **Diagnose:** Read the evaluator report (`specs/reviews/evaluator-report.md`) for specific failure details. Identify the exact check that failed and the error output.

2. **Classify** the failure into one of 10 categories:

| Category | Signal | Auto-Fix Strategy |
|----------|--------|-------------------|
| Lint/format | ruff/eslint error output | `ruff check --fix && ruff format` |
| Type error | mypy/tsc error with file:line | Fix the type annotation at the specified location |
| Test failure | pytest/vitest assertion error | Fix the production code, NOT the test |
| Import error | ImportError / ModuleNotFoundError | Fix the import path or `__init__.py` |
| Coverage drop | Coverage % below baseline | Add tests for the specific uncovered lines |
| API check fail | HTTP 500/404/wrong schema | Read `docker compose logs backend --tail=50`, identify root cause from stack trace, fix service/router |
| Playwright fail | Element not found / assertion error | Read the selector, fix the component |
| Design score low | Score below threshold | Apply the critique text, regenerate the UI |
| Docker fail | Container exit code / won't start | Read `docker compose logs`, fix config or deps |
| Architecture drift | Schema mismatch / missing file | Read the schema, fix the response or create the file |

3. **Spawn generator** to apply the targeted fix. The generator prompt must include:
   - The specific failure from the evaluator report.
   - The category and auto-fix strategy.
   - All learned rules.
   - Instruction to fix ONLY the failing issue — no other changes.

4. **Re-run the failed gate** (not all gates — just the one that failed).

5. **3rd failure — hard stop for this group:**
   - Revert changes: `git checkout -- .`
   - Log the failure to `.claude/state/failures.md` with group ID, failure category, all three attempt summaries.
   - Extract a learned rule (see SECTION 12).
   - Mark the group as BLOCKED in `claude-progress.txt`.
   - Escalate to the user with a summary.
   - Continue to the next unblocked group.

---

## SECTION 7: Docker Stack Management

`/auto` is responsible for the Docker stack lifecycle. The evaluator does NOT start or stop Docker.

### Startup

Before the first evaluator check (Gate 5) of the entire `/auto` run:

```bash
bash init.sh
```

Then verify the stack is healthy:

```bash
curl --retry 10 --retry-delay 3 --retry-all-errors -sf http://localhost:8000/health
```

If the health check fails after all retries, record a Docker failure and enter self-healing.

### Between Groups

The Docker stack stays running between groups. After each group's code changes, run incremental rebuilds as needed:

```bash
docker compose up -d --build
```

Wait for the health check to pass before running the evaluator.

### Worktree Isolation (recommended for parallel execution)

When running multiple groups concurrently or when the generator and evaluator need isolation:
1. Use Claude Code's `--worktree` isolation flag when spawning evaluator agents
2. Each worktree gets its own Docker stack on different ports
3. Configure via `project-manifest.json` port overrides
4. Teardown worktree Docker stack after evaluation completes

This prevents the generator and evaluator from interfering with each other's state.
For sequential execution (default), a shared Docker stack is fine.

### Teardown

On completion (all groups done or stopping criteria met):

```bash
docker compose down -v
```

---

## SECTION 8: Architecture Amendment Detection

After each agent team completes (before the ratchet gate):

1. Check `specs/design/amendments/` for new files that were not present at the start of this iteration.
2. If new amendment files are found:
   - Read each amendment file to understand the architectural change.
   - Spawn a planner agent to update affected architecture artifacts (`api-contracts.md`, `component-map.md`, schema files).
   - Commit the amendment: `git add specs/design/ && git commit -m "refactor: update api-contracts for {change description}"`
3. Proceed to the ratchet gate with the updated architecture.

Amendments are a signal that the implementation discovered a design gap. They must be incorporated before evaluation, not deferred.

---

## SECTION 9: GAN Design Loop (Frontend Groups Only, Full Mode)

After the main ratchet gate passes, if the current group contains UI stories (stories with `playwright_checks` or `design_checks` in the sprint contract):

### Iteration Loop (Max 5 Iterations)

1. **Spawn design-critic:** Navigate to each page listed in the contract's `design_checks`. Take screenshots. Score visual fidelity, layout consistency, spacing, color token usage, and responsive behavior. Return scores and critique text per page.

2. **Check threshold:** If the average score across all pages meets or exceeds the threshold defined in `project-manifest.json` field `design_score_threshold` (default: 7/10), the GAN loop passes. Proceed to PASS handling.

3. **Below threshold — send critique to generator:** Spawn generator with:
   - The design-critic's scores and critique text for each page.
   - The specific UI components that need improvement.
   - The design tokens and layout specifications from `specs/design/`.
   - All learned rules.

4. **Generator iterates on UI code.** The generator edits only the frontend files flagged by the critic.

5. **Re-screenshot, re-score.** Spawn design-critic again on the updated pages.

6. **Repeat** up to 5 total iterations.

7. **5th iteration still below threshold:**
   - Log the failure to `.claude/state/failures.md` with all 5 iteration scores and critiques.
   - Extract a learned rule (see SECTION 12).
   - Escalate to the user: "Design quality for group {group} did not reach threshold after 5 GAN iterations. Scores: [list]. Proceeding to next group."
   - Do NOT revert the code — the ratchet gate already passed. The design issue is cosmetic, not functional.

---

## SECTION 10: Session Chaining

`claude-progress.txt` is the memory bridge between context windows. Each iteration appends a new session block.

### Format

```
=== Session {N} ===
date: {ISO 8601}
mode: {full|lean|solo}
groups_completed: [A, B, C]
groups_remaining: [D, E, F]
current_group: D (extraction)
current_stories: [E4-S1, E4-S2]
sprint_contract: sprint-contracts/group-D.json
last_commit: {hash} "{message}"
features_passing: 47 / 203
coverage: 82%
learned_rules: 6
blocked_stories: none
next_action: Run evaluator against group D
```

### Rules

- **Append, never overwrite.** Each session block is added after the previous one. The file is an append-only log.
- **Read the LAST block** for recovery. When context recovery (SECTION 2) reads this file, it parses only the final session block to determine current state.
- **Session number increments monotonically.** Parse the last session number and add 1.
- **`next_action` is critical.** This field tells a fresh context window exactly what to do first. Be specific: "Run evaluator against group D" is good. "Continue" is not.
- **Include `blocked_stories`** if any stories failed 3 consecutive self-heal attempts. Format: `[E4-S3 (import error), E5-S1 (docker fail)]`.

---

## SECTION 11: Stopping Criteria

OR logic with priority (check in order):

1. **Hard stop:** An architecture violation that self-healing cannot fix, OR the total iteration count exceeds 50. Stop the entire `/auto` run. Report status and hand off to the user.

2. **Escalate (per-story):** A story fails 3 consecutive self-heal iterations. Mark it BLOCKED. Log to `failures.md`. Extract learned rule. Skip to the next group. Do NOT stop the entire run.

3. **Coverage gate:** Coverage drops below the baseline AFTER a successful commit. This overrides the pass — revert the commit (`git revert HEAD --no-edit`), log the regression, and re-enter self-healing for coverage.

4. **Success:** All features in `features.json` have `passes: true` AND coverage >= baseline threshold. Print:
   ```
   === BUILD COMPLETE ===
   Features passing: {N}/{N}
   Coverage: {X}%
   Groups completed: [list]
   Blocked stories: [list or "none"]
   Learned rules: {count}
   Total iterations: {count}
   ```
   Then run `docker compose down -v` and exit.

---

## SECTION 12: Failure-Driven Learning

Learned rules are the harness's long-term memory. They prevent the same mistake from recurring across iterations and context windows.

### When to Extract a Rule

Extract a new rule when the same error type (by category from SECTION 6) appears **2 or more times** in `.claude/state/failures.md`. Check after every failure entry.

### Rule Format

Append to `.claude/state/learned-rules.md`:

```markdown
## Rule {N}: {descriptive title}

- **Source:** Group {group}, Story {story}, Iteration {iter}
- **Pattern:** {what went wrong — the repeated error signature}
- **Rule:** {the concrete instruction to prevent recurrence}
- **Applied in:** {list of agents/skills that must follow this rule}
```

### Injection

- Rules are injected verbatim into ALL future agent prompts: generator teammates, evaluator, design-critic, planner.
- Include the full text of every rule, not just titles or references.
- Rules are NEVER deleted. The rule set is monotonically growing — it is a ratchet on institutional knowledge.
- If `learned-rules.md` does not exist yet, create it with a header: `# Learned Rules\n\nRules extracted from failure patterns during autonomous build.\n`

---

## SECTION 13: Gotchas

- **Not reading `program.md` each iteration:** Constraints can change mid-run (e.g., a human updates program.md while /auto is running). Always re-read at the start of every iteration.
- **Retrying the same approach after failure:** The self-healing loop must classify the failure and apply a DIFFERENT fix strategy. If attempt 1 failed with a type error fix, attempt 2 must try a different approach (e.g., restructure the function signature, not just change the annotation).
- **Reverting too eagerly:** Self-heal first (3 attempts). Only revert after the 3rd failure. Premature revert wastes working code.
- **Reverting too broadly:** `git checkout -- .` reverts everything. After the 3rd failure, only the current group's files should be reverted. Use the file ownership list from `component-map.md` to scope the revert: `git checkout -- {file1} {file2} ...`
- **Ignoring failure log patterns:** Check `failures.md` for recurring patterns BEFORE spawning the generator. If the same error has appeared before, inject the relevant learned rule into the generator prompt proactively.
- **Autonomous drift:** Every code change must trace to a story in the current group. If the generator introduces code that does not map to any acceptance criterion, reject it. No speculative features.
- **No human check-in:** Cap at 50 total iterations. After 50 iterations, stop and present a status report regardless of completion state. Long autonomous runs without human oversight risk compounding errors.
- **Not injecting learned rules:** Every agent prompt must include the full text of all learned rules. This is the most common cause of repeated failures. If you spawn an agent without learned rules, you are guaranteeing a preventable regression.
