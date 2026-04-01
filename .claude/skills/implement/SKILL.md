---
name: implement
description: Generate production code and tests for a story group using agent teams for parallel execution.
argument-hint: "[group-id]"
context: fork
agent: generator
---

# Implement Skill

Generate production-quality code and tests for all stories in a dependency group, using a Claude Code agent team for parallel execution.

---

## Usage

```
/implement C
```

Implements all stories in group C. The group ID corresponds to a node in `specs/stories/dependency-graph.md`.

---

## Prerequisites

Before running `/implement`, verify:

- `specs/stories/dependency-graph.md` exists and lists groups with story assignments.
- `specs/design/component-map.md` exists and maps each story to the files it owns.
- All stories in the target group have acceptance criteria written.
- All upstream groups are already implemented and passing evaluation.

If any prerequisite is missing, stop and report what is absent. Do not proceed with partial context.

---

## Execution Steps

### Step 0 — Write Implementation Plan with Superpowers

Before loading code or spawning agents, invoke `superpowers:writing-plans` to produce a structured implementation plan for this group. The plan identifies task decomposition, dependencies, and risk areas. This feeds into the teammate spawn prompts and prevents ad-hoc implementation.

### Step 1 — Load Quality Principles

Read `.claude/skills/code-gen/SKILL.md` in full. These six principles (small modules, static typing, functions under 50 lines, explicit error handling, no dead code, self-documenting names) apply to every line of code produced. Inject the full text into every teammate prompt.

### Step 2 — Load Dependency Graph

Read `specs/stories/dependency-graph.md`. Identify:
- Which stories belong to the requested group.
- Which groups must be complete before this group (upstream dependencies).
- The total story count for this group.

Abort if upstream groups are not yet evaluated as PASS.

### Step 3 — Load Component Map

Read `specs/design/component-map.md`. For each story in the group, extract:
- The list of files the story owns (may create or modify).
- Any shared interface or type files that multiple stories reference.

This ownership map is the single source of truth for file assignments during parallel execution.

### Step 4 — Load Learned Rules

Read `.claude/state/learned-rules.md`. Inject ALL rules verbatim into every teammate spawn prompt. Learned rules include anti-pattern code examples and better approach code — teammates must study these before writing code, not just read the rule text. Rules represent project-specific decisions made during previous sprints (naming conventions, library choices, API patterns). Skipping this step causes regressions.

### Step 5 — Spawn Agent Team (Multiple Stories)

If the group contains **2 or more stories**, spawn a Claude Code agent team:

- Create **1 teammate per story**, up to a maximum of **5 concurrent teammates**.
- If the group has more than 5 stories, batch them: first 5 stories run, then the remainder after all complete.
- Each teammate spawn prompt must include:
  - The story's acceptance criteria (full text).
  - The file ownership list from component-map.md for that story.
  - All learned rules from `.claude/state/learned-rules.md`.
  - All six quality principles from `.claude/skills/code-gen/SKILL.md`.
  - Instruction to follow `superpowers:test-driven-development` — write failing tests before implementation code (red-green-refactor cycle).
  - Instruction to **message teammates** before modifying any shared type or interface file.
  - Instruction to **await plan approval** before writing any code (present the plan, wait for confirmation).

- Teammates must coordinate on shared types:
  - Before editing a type definition used by another story's files, send a message to the affected teammate describing the change.
  - Teammate receiving the message must acknowledge before the edit proceeds.

- If two teammates claim ownership of the same file, escalate to the orchestrator (this agent). Do not merge partial changes. Resolve ownership, then continue.

### Step 6 — Use Generator Directly (Single Story)

If the group contains exactly **1 story**, do not spawn a team. Execute the story using the generator agent directly:

- Present a plan (files to create/modify, type definitions, test strategy).
- Await approval.
- Implement code, then write tests.

### Step 7 — Validation Gate

After all teammates (or the generator) complete:

1. Run the full test suite: `npm test` or `pytest` (whichever applies to the project).
2. Run the linter: `npm run lint` or `ruff check .`.
3. Run the type checker: `tsc --noEmit` or `mypy .`.

All three must pass with zero errors before proceeding. If any fails, return the failure output to the responsible teammate for a fix, then re-run the validation gate.

### Step 8 — Code Review

Spawn the `code-reviewer` agent on the set of changed files:

- Pass the list of modified files and the story acceptance criteria.
- The reviewer emits findings at three severity levels: **BLOCK**, **WARN**, **INFO**.
- **BLOCK** findings must be fixed. Spawn the responsible teammate to address the finding, re-run tests, re-run the reviewer. Maximum **3 retry cycles**.
- **WARN** findings are logged but do not block merge.
- **INFO** findings are optional improvements.

If the reviewer still emits BLOCK findings after 3 retries, escalate to the user with a summary of the unresolved issues.

---

## Rules

- Every file produced must trace to a story in the current group. No story, no code.
- Code is written first; tests are written after, against the public interface.
- No speculative code ("might need later"). If it is not in an acceptance criterion, it does not exist.
- Teammates may not edit files outside their ownership assignment without coordinator approval.
- Plan approval is mandatory before any teammate begins coding. Skipping this step is not a time-saver — it causes conflicts and rework.

---

## Gotchas

- **Teammates editing the same file:** Prevent this with the ownership map. If it happens anyway, stop both teammates, resolve ownership, reconcile changes manually.
- **Skipping plan approval:** Leads to scope creep, missed acceptance criteria, and merge conflicts. Always require the plan step.
- **Deferring test coverage:** Tests are written in the same sprint cycle, not later. "I'll add tests in the next sprint" is not acceptable.
- **Vibe coding without acceptance criteria:** Every function must trace to an acceptance criterion. If the criterion does not exist, do not write the code — write the criterion first.
- **Ignoring learned rules:** Failing to inject `.claude/state/learned-rules.md` recreates decisions the team has already made, causing style and pattern drift.
