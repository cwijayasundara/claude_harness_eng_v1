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
- **4 execution modes** — Full ($100-300), Lean ($30-80), Solo ($5-15), Turbo ($30-50)

## Quick Start

```bash
# 1. Clone the harness
git clone <repo-url> ~/claude-harness-engine

# 2. Start Claude Code with the harness as a plugin
claude --plugin-dir ~/claude-harness-engine/.claude

# 3. Create and enter your project directory
mkdir my-app && cd my-app

# 4. Scaffold the project
/claude-harness-engine:scaffold
# Choose your stack, project type, and verification mode

# 5. Run the full pipeline
/build
# Phases 1-3 (BRD, spec, design) require your approval
# Phases 4-8 run autonomously via /auto
```

## How It Works

The `/auto` loop picks the next unfinished group from the dependency graph, negotiates a sprint contract between generator and evaluator, spawns an agent team, and runs a 6-gate ratchet. On PASS it commits and moves on. On FAIL it self-heals up to 3 times, then reverts, extracts a learned rule, and escalates.

Edit `program.md` while `/auto` is running to steer mid-build.

See `design.md` for full architecture reference (system diagram, agent roles, hooks, state files, sprint contract format).

## Commands

| Command | Purpose |
|---------|---------|
| `/scaffold` | Initialize project with harness |
| `/brd` | Socratic interview -> BRD |
| `/spec` | BRD -> stories + dependency graph + features.json |
| `/design` | Architecture + schemas + mockups |
| `/build` | Full 8-phase pipeline |
| `/auto` | Autonomous ratcheting loop |
| `/implement` | Code generation with agent teams |
| `/evaluate` | Run app, verify sprint contract |
| `/review` | Evaluator + security review |
| `/test` | Test plan + Playwright E2E generation |
| `/deploy` | Docker Compose + init.sh |
| `/fix-issue` | GitHub issue workflow |
| `/refactor` | Quality-driven refactoring |
| `/improve` | Feature enhancement |
| `/lint-drift` | Entropy scanner for pattern drift |

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
