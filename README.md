# Claude Harness Engine v1

> GAN-inspired harness for autonomous long-running application development with Claude Code

A Claude Code plugin scaffold that implements best practices from [Anthropic](https://www.anthropic.com/engineering/harness-design-long-running-apps) and [OpenAI](https://openai.com/index/harness-engineering/) harness engineering research. Combines Karpathy's autoresearch ratcheting with a Generator-Evaluator architecture, agent teams, session chaining, and three-layer verification.

## Features

- **Generator-Evaluator architecture** — Separate agents prevent self-evaluation bias
- **Karpathy ratcheting** — Monotonic progress; code only gets better, never worse
- **Agent teams** — Parallel story execution with shared task lists and messaging
- **Session chaining** — Builds span hours across multiple context windows
- **Three-layer evaluation** — API tests + Playwright browser interaction + Vision scoring
- **Sprint contracts** — Generator and evaluator negotiate "done" criteria before coding
- **TDD mandatory** — Tests first, 100% meaningful coverage target, 80% hard floor
- **Self-healing** — 10 error categories with targeted fixes before reverting
- **Superpowers integration** — Brainstorming, systematic debugging, TDD, and verification workflows at key pipeline stages
- **4 execution modes** — Full ($100-300), Lean ($30-80), Solo ($5-15), Turbo ($30-50)

## Installation

### Option 1: Per-session (CLI flag)

```bash
# Clone the harness
git clone https://github.com/cwijayasundara/claude_harness_eng_v1.git ~/claude-harness-engine

# Start Claude Code with the plugin loaded
claude --plugin-dir ~/claude-harness-engine/.claude
```

### Option 2: Permanent (user settings)

Add to `~/.claude/settings.json` (merge with existing settings):

```json
{
  "extraKnownMarketplaces": {
    "local-harness": {
      "source": "directory",
      "path": "~/claude-harness-engine/.claude"
    }
  },
  "enabledPlugins": {
    "claude-harness-engine@local-harness": true
  }
}
```

Then just run `claude` from any directory — the harness skills are always available.

## Plugin Structure

The plugin is loaded from the `.claude/` directory. Claude Code auto-discovers components by convention:

```
.claude/
  .claude-plugin/
    plugin.json          ← Manifest (name, version, description only)
  skills/                ← Auto-discovered skill directories
  agents/                ← Auto-discovered agent definitions
  commands/              ← Auto-discovered commands
  hooks/                 ← Hook scripts
  settings.json          ← Permissions and hook config
```

**Important:** `plugin.json` should only contain metadata (`name`, `version`, `description`, `author`). Do NOT add explicit `skills`/`agents`/`commands` path fields — Claude Code discovers these automatically.

## Quick Start

```bash
# 1. Navigate to (or create) your project directory
mkdir my-app && cd my-app

# 2. Scaffold the project (use plugin namespace)
/claude-harness-engine:scaffold
# Choose your stack, project type, and verification mode

# 3. Run the full pipeline
/claude-harness-engine:build
# Phases 1-3 (BRD, spec, design) require your approval
# Phases 4-8 run autonomously via /auto
```

> **Note:** When loaded as a plugin, all commands are namespaced: `/claude-harness-engine:<command>`. When working inside a scaffolded project (which has its own `.claude/skills/`), you can use the short form: `/scaffold`, `/build`, etc.

## How It Works

The `/auto` loop picks the next unfinished group from the dependency graph, negotiates a sprint contract between generator and evaluator, spawns an agent team, and runs a 6-gate ratchet. On PASS it commits and moves on. On FAIL it self-heals up to 3 times, then reverts, extracts a learned rule, and escalates.

Edit `program.md` while `/auto` is running to steer mid-build.

See `design.md` for full architecture reference (system diagram, agent roles, hooks, state files, sprint contract format).

## Commands

| Command | Purpose |
|---------|---------|
| `scaffold` | Initialize project with harness |
| `brd` | Socratic interview -> BRD |
| `spec` | BRD -> stories + dependency graph + features.json |
| `design` | Architecture + schemas + mockups |
| `build` | Full 8-phase pipeline |
| `auto` | Autonomous ratcheting loop |
| `implement` | Code generation with agent teams |
| `evaluate` | Run app, verify sprint contract |
| `review` | Evaluator + security review |
| `test` | Test plan + Playwright E2E generation |
| `deploy` | Docker Compose + init.sh |
| `fix-issue` | GitHub issue workflow |
| `refactor` | Quality-driven refactoring |
| `improve` | Feature enhancement |
| `lint-drift` | Entropy scanner for pattern drift |

> Prefix with `/claude-harness-engine:` when using as a plugin (e.g., `/claude-harness-engine:brd`). Use `/command` shorthand when inside a scaffolded project.

## Superpowers Integration

The harness integrates with the [Superpowers](https://github.com/obra/superpowers) plugin to augment key pipeline stages with structured developer workflows:

| Pipeline Stage | Superpowers Skill | What It Does |
|---|---|---|
| `/brd`, `/design` | `brainstorming` | Explores alternatives and hidden assumptions before committing to a direction |
| `/implement`, `/refactor` | `writing-plans` | Produces structured plans reviewed before code is written |
| `/implement` (teammates) | `test-driven-development` | Red-green-refactor cycle enforced in every agent prompt |
| `/fix-issue` | `systematic-debugging` | Root cause analysis before proposing fixes |
| `/auto` (self-healing) | `systematic-debugging` | Diagnoses failures before each fix attempt |
| `/auto`, `/evaluate` | `verification-before-completion` | Evidence-based checks before claiming PASS |

Superpowers is enabled automatically when scaffolding a project. The harness works without it, but with it agents explore before committing, debug before fixing, and verify before declaring success.

## Plugins

The scaffold configures these complementary plugins in `.claude/settings.json`:

| Plugin | Purpose | Conflict? |
|---|---|---|
| `superpowers` | Developer workflow patterns (TDD, debugging, planning) | No |
| `code-review` | PR review with confidence scoring | No |
| `commit-commands` | `/commit`, `/commit-push-pr` git workflows | No |
| `security-guidance` | Real-time XSS/eval/unsafe-code detection | No |
| `pr-review-toolkit` | Specialized PR review agents | No |

Plugins that conflict with harness functionality (`feature-dev`, `frontend-design`, `hookify`) are explicitly excluded by `/scaffold`.

## Requirements

- Claude Code v2.1.32+ (agent teams support)
- Node.js 18+ (for hooks)
- Docker + Docker Compose (for evaluation)
- Python 3.12+ / Node.js 20+ (for generated projects)

## Based On

- [Anthropic: Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/)
- [Steve Krenzel: AI is Forcing Us to Write Good Code](https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code)

## License

MIT
