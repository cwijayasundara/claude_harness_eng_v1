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
- **Entropy scanner** — `/lint-drift` detects pattern drift in agent-generated code
- **Flexible tech stack** — Python, Node, any frontend via `project-manifest.json`
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
# Choose your stack: Python+React, Python+Next.js, Node+React, or Custom

# 5. Run the full pipeline
/build
# Phases 1-3 (BRD, spec, design) require your approval
# Phases 4-8 run autonomously via /auto
```

## How It Works

### The Pipeline

```
/brd ──> /spec ──> /design ──> /auto ──────────────────────> DONE
  |        |         |           |
  v        v         v           v
 BRD    Stories   Architecture  Karpathy Ratchet Loop:
 (human  + deps    + schemas     Pick group -> Contract ->
  gate)  + features  + mockups    Agent team -> Ratchet gate ->
         (human     (human        PASS: commit, next group
          gate)      gate)        FAIL: self-heal (3x) -> learn
```

### The Karpathy Ratchet

The `/auto` loop implements Karpathy's autoresearch pattern:

1. **Read** `program.md` (human can edit mid-run to steer), `learned-rules.md`, `claude-progress.txt`, `features.json`
2. **Pick** next unfinished group from dependency graph
3. **Negotiate** sprint contract between generator and evaluator
4. **Spawn** agent team (1 teammate per story, parallel execution)
5. **Ratchet gate** — 6 sub-gates, all must pass:
   - Tests pass | Lint clean | Coverage >= 80% baseline
   - Architecture valid | Evaluator runs app | Design critic scores UI
6. **PASS** → commit, update state, next group
7. **FAIL** → self-heal (diagnose from Docker logs → targeted fix → re-gate)
8. **3rd fail** → revert, extract learned rule, escalate to human

Progress is **monotonic**: coverage never drops, tests never break, learned rules never deleted.

### Generator-Evaluator (GAN Pattern)

```
Generator                          Evaluator
(writes code)                      (runs the app)
     |                                  |
     |── Proposes sprint contract ─────>|
     |<── Evaluator finalizes ──────────|
     |                                  |
     |── Implements code + tests ──────>|
     |                                  |── Starts Docker
     |                                  |── curl API endpoints
     |                                  |── Playwright browser tests
     |                                  |── Validates response schemas
     |                                  |── Reads Docker logs on failure
     |<── VERDICT: PASS or FAIL ────────|
     |                                  |
     |── (if FAIL) self-heal fix ──────>|
     |<── re-evaluate ─────────────────|
```

The generator **cannot evaluate its own work**. The evaluator **cannot write code**. This separation prevents the "looks done but isn't" problem.

### Design Critic (GAN Loop for UI)

For frontend groups, after the main ratchet passes:

1. Design critic takes screenshots (navigates interactively first)
2. Scores against 4 **weighted** criteria:
   - Design Quality (1.5x), Originality (1.5x), Craft (0.75x), Functionality (0.75x)
3. If below threshold → sends specific critique to generator
4. Generator iterates (refine if improving, **pivot** if stagnant for 2 iterations)
5. Max 10 iterations in Full mode

### Execution Modes

| Mode | When to Use | Cost | Evaluator |
|------|-------------|------|-----------|
| **Full** | Production apps, complex requirements | $100-300 | Per group + design critic |
| **Lean** | Backend-heavy, internal tools | $30-80 | Per group, no design critic |
| **Solo** | Bug fixes, small features | $5-15 | Skipped |
| **Turbo** | Well-specified + capable model | $30-50 | Once at end |

### Steering Mid-Run

Edit `program.md` while `/auto` is running — it re-reads every iteration:

```markdown
## Constraints
- Skip the delete functionality for now
- Do not add pagination
- Stop after group D, I want to review
```

## What Gets Scaffolded

```
your-project/
├── .claude/
│   ├── agents/          7 agent definitions
│   ├── skills/          18 skills (task + reference)
│   ├── hooks/           12 enforcement hooks (with remediation instructions)
│   ├── state/           Iteration log, learned rules, failures, coverage baseline
│   ├── templates/       Sprint contract, features, init.sh, Docker, Playwright
│   ├── architecture.md  Layered architecture rules
│   ├── program.md       Karpathy human-agent bridge
│   └── settings.json    Hook config + permissions
├── project-manifest.json  Stack + evaluation config
├── features.json          Feature tracking (session chaining)
├── claude-progress.txt    Session recovery context
├── init.sh                Dev environment bootstrap
├── specs/                 BRD, stories, design, reviews, test artifacts
├── sprint-contracts/      Per-group negotiated done-criteria
├── backend/               Generated backend code
├── frontend/              Generated frontend code
└── e2e/                   Playwright E2E tests
```

## Individual Commands

| Command | Purpose |
|---------|---------|
| `/scaffold` | Initialize project with harness |
| `/brd` | Socratic interview → BRD |
| `/spec` | BRD → stories + dependency graph + features.json |
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

## Quality Enforcement

- **TDD mandatory** — Tests first, then implementation
- **100% coverage target, 80% floor** — Every line the agent wrote is verified
- **12 hooks** — All with "Fix:" remediation instructions
- **Layered architecture** — Types → Config → Repository → Service → API → UI
- **Functions < 50 lines, files < 300 lines** — Enforced by hooks
- **Entropy scanner** — `/lint-drift` catches pattern drift in agent-generated code

## Based On

- [Anthropic: Harness Design for Long-Running Application Development](https://www.anthropic.com/engineering/harness-design-long-running-apps) — Generator-evaluator GAN architecture, design scoring, sprint contracts
- [Anthropic: Effective Harnesses for Long-Running Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) — Feature list, session chaining, init.sh bootstrap
- [OpenAI: Harness Engineering](https://openai.com/index/harness-engineering/) — Progressive disclosure, remediation instructions, entropy control, observability, model tiering
- [Steve Krenzel: AI is Forcing Us to Write Good Code](https://bits.logic.inc/p/ai-is-forcing-us-to-write-good-code) — 100% coverage as verification, not just testing
- [Claude Code Agent Teams](https://code.claude.com/docs/en/agent-teams) — Shared task lists, teammate messaging, plan approval

## Requirements

- Claude Code v2.1.32+ (agent teams support)
- Node.js 18+ (for hooks)
- Docker + Docker Compose (for evaluation)
- Python 3.12+ / Node.js 20+ (for generated projects)

## License

MIT
