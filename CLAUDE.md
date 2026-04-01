# Claude Harness Engine v1

A Claude Code plugin scaffold for autonomous long-running application development.

## What This Is

A GAN-inspired harness combining Karpathy ratcheting + Anthropic/OpenAI harness engineering best practices:
- Generator-Evaluator architecture (no self-evaluation bias)
- Agent teams for parallel story execution
- Session chaining for multi-context-window builds
- Three-layer evaluation (API + Playwright + Vision with weighted scoring)
- Superpowers integration (brainstorming, TDD, debugging, verification at key stages)
- 4 execution modes: Full, Lean, Solo, Turbo

## Installation

1. Clone: `git clone <repo-url> ~/claude-harness-engine`
2. Load as plugin: `claude --plugin-dir ~/claude-harness-engine/.claude`
3. Scaffold a project: `/claude-harness-engine:scaffold`

## Commands

| Command | Purpose |
|---------|---------|
| `/scaffold` | Initialize project with harness |
| `/brd` | Socratic interview -> BRD |
| `/spec` | BRD -> stories + dependency graph + features.json |
| `/design` | Architecture + schemas + mockups |
| `/build` | Full 8-phase pipeline |
| `/auto` | Autonomous ratcheting loop (4 modes) |
| `/implement` | Code generation with agent teams |
| `/evaluate` | Run app, verify sprint contract |
| `/review` | Evaluator + security review |
| `/test` | Test plan + Playwright E2E |
| `/deploy` | Docker Compose + init.sh |
| `/fix-issue` | GitHub issue workflow |
| `/refactor` | Quality-driven refactoring |
| `/improve` | Feature enhancement |
| `/lint-drift` | Entropy scanner for pattern drift |

## Agents (7)

| Agent | Role | Model |
|-------|------|-------|
| planner | BRD, specs, architecture, feature list | Opus |
| generator | Code + tests, spawns agent teams | Sonnet |
| evaluator | Runs app, verifies sprint contracts | Opus |
| design-critic | GAN scoring (4 weighted criteria, max 10 iter) | Opus |
| security-reviewer | OWASP vulnerability scan | Sonnet |
| ui-designer | React+Tailwind mockups | Sonnet |
| test-engineer | Test plans + Playwright E2E | Sonnet |

## Superpowers Integration

The harness integrates with the [Superpowers](https://github.com/obra/superpowers) plugin at these pipeline stages:

| Stage | Skill | Purpose |
|---|---|---|
| `/brd`, `/design` | `brainstorming` | Explore alternatives before committing |
| `/implement`, `/refactor` | `writing-plans` | Structured plans before code |
| `/implement` (teammates) | `test-driven-development` | Red-green-refactor in every agent |
| `/fix-issue`, `/auto` (heal) | `systematic-debugging` | Root cause analysis before fixing |
| `/auto` (done), evaluator | `verification-before-completion` | Evidence before claiming PASS |

## Key Files

- `.claude/program.md` — Karpathy human-agent bridge (edit to steer /auto)
- `.claude/settings.json` — Hook config, permissions, enabled plugins
- `design.md` — Full architecture reference (copied to target projects)
- `README.md` — Installation and usage guide
