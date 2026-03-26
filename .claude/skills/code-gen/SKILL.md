# Code Generation Skill

Reference skill for generator teammates. Read this before writing any code.

---

## Six Quality Principles

### 1. Small Modules — One File, One Responsibility
- Each file must have a single, clearly named responsibility.
- **Warning threshold:** 200 lines — add a comment noting the file is growing large.
- **Block threshold:** 300 lines — do not submit. Split before opening a PR.
- If you hit 300 lines, decompose into sub-modules and re-export from an index file.

### 2. Static Typing — Annotate Everything
- Every function parameter, return value, and variable must have an explicit type.
- **TypeScript:** Zero `any`. Use `unknown` + type guard if the shape is truly unknown.
- **Python:** Full type hints on all functions. Use `TypeVar`, `Generic`, `Protocol` where appropriate.
- Type aliases for domain concepts (`UserId = str`, `type OrderId = string`).

### 3. Functions Under 50 Lines
- If a function body exceeds 50 lines, decompose it into named sub-functions.
- Each sub-function should be testable in isolation.
- Use descriptive names that read as a sentence: `validateOrderItems`, `buildPaymentPayload`.
- Avoid deeply nested control flow — extract branches into named helpers.

### 4. Explicit Error Handling
- Define typed error classes per domain (e.g., `class OrderNotFoundError extends AppError`).
- Never use bare `except Exception` or `catch (e: any)`.
- All error paths must be covered by tests.
- Propagate errors up with context; do not swallow silently.
- In TypeScript: use `Result<T, E>` or typed throws with JSDoc `@throws`.

### 5. No Dead Code
- Every line of code must trace to a user story or a technical requirement.
- Do not leave commented-out code in PRs.
- Remove unused imports, variables, and parameters immediately.
- If code is speculative ("might need later"), do not include it.

### 6. Self-Documenting — Names Over Comments
- Variable and function names should make comments unnecessary.
- Types act as documentation — a well-typed function signature is its own doc.
- Use comments only for non-obvious decisions (algorithm choice, regulatory constraints).
- Avoid `// TODO` in submitted code — file a story instead.

---

## Code Patterns

### Test Structure: Arrange → Act → Assert
```
// Arrange
const order = buildOrder({ status: "pending" });
// Act
const result = processOrder(order);
// Assert
expect(result.status).toBe("confirmed");
```

### Typed Error Classes
```typescript
class DomainError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
class OrderNotFoundError extends DomainError {
  constructor(orderId: OrderId) {
    super(`Order ${orderId} not found`, "ORDER_NOT_FOUND");
  }
}
```

### Naming Conventions
- **Files:** `kebab-case.ts` for TypeScript, `snake_case.py` for Python.
- **Functions/methods:** `camelCase` (TS), `snake_case` (Python).
- **Types/classes:** `PascalCase` in both languages.
- **Constants:** `UPPER_SNAKE_CASE`.
- **Booleans:** prefix with `is`, `has`, `can`, `should`.

---

## Testing Rules — TDD Mandatory

**"Coverage isn't about bug prevention — it's about guaranteeing the agent has double-checked the behavior of every line of code it wrote."** — Steve Krenzel

1. **Tests FIRST, then code (TDD):**
   - Write a failing test that defines expected behavior
   - Run it — verify it fails for the right reason
   - Write the minimum code to make it pass
   - Run it — verify it passes
   - Refactor if needed, re-run tests
   - Commit
2. **100% meaningful coverage** — every branch, every error path. At 100%, any uncovered line is an immediate signal of missing verification. The ratchet gate BLOCKS below 80%.
3. **Only mock external boundaries:** databases, third-party APIs, file I/O, clocks.
4. **Never mock business logic** — if you mock a service to test another service, you are hiding bugs.
5. **Realistic test data** — use domain-representative values (real-looking emails, valid UUIDs, plausible amounts). Never `"foo"`, `123`, or `"test"`.
6. Test names describe behavior: `"returns 404 when order does not exist"`, not `"test order"`.

---

## Parallel Execution

- **File ownership:** consult `component-map.md` before touching any file.
- **Plan approval required** before starting parallel work.
- **Shared interfaces:** message teammates before changing a type or API contract that crosses boundaries.
- **Task sizing:** aim for 5–6 discrete tasks per teammate per sprint cycle.
- **Conflicts:** if two teammates need the same file, one blocks; do not merge partial changes.

---

## Gotchas (Things That Cause Review Failures)

- Importing upward across layers (UI importing from repository layer)
- Functions exceeding 50 lines without decomposition
- Untyped values — `any`, missing return types, unannotated parameters
- Broad exception catches without re-raise or typed handling
- Mocking business logic in unit tests
- Generic test data (`"test"`, `0`, `null` as stand-ins for real domain values)
- Commented-out code in the submitted diff
- Missing error-path test coverage
- Teammates editing the same file in the same sprint without coordination
