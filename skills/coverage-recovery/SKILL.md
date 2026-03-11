---
name: coverage-recovery
description: Use this skill when coverage is below target or when uncovered code in src/ must be analyzed and resolved with minimal artificial tests.
---

# Coverage Recovery

## When To Use
Use this skill when the user asks to:
- increase test coverage;
- analyze uncovered lines/branches;
- enforce strict thresholds;
- explain why specific uncovered paths remain.

## Source Of Truth
- `AGENTS.md`
- `Makefile` recipe `make tests-all-coverage`
- `package.json` script `test:all:coverage`
- `vitest.config.ts`
- `vitest.playwright.ts`
- test suites under `tests/unit/**` and `tests/integration/**`

## Principles
- Coverage is a quality signal, not a vanity metric.
- Evaluate the merged signal from unit/integration plus browser e2e coverage, not
  a single suite in isolation.
- Start from real public API behavior (`src/dom/**`, `src/vue/**`).
- Prefer fixing architecture/redundancy over adding synthetic tests for dead
  code.
- Choose not only the right scenario, but also the right test level that gives a
  stable feedback signal.
- Use classic `vitest` for deterministic unit/integration scenarios and
  `vitest` + Playwright for browser-only behavior, integration seams, and DOM
  flows that are not trustworthy in jsdom alone.
- Defensive branches should be tested with controlled failure scenarios.
- Do not loop endlessly on non-resolvable cases: escalate with concrete options.

## Workflow
1. Collect facts.
```bash
make tests-all-coverage
```
2. Read uncovered details, not only percentages.
Use:
- `coverage/coverage-final.json`
- JSON reports under `coverage/vitest/**` and `coverage/playwright/**`
- merged reports under `coverage/**`
3. Classify uncovered paths:
- `real usage gap` (missed product scenario),
- `defensive path` (degraded input/runtime failure),
- `dead/redundant path` (likely removable),
- `architecture smell` (hard-to-test design).
4. Choose the smallest reliable test level before writing tests:
- `vitest.config.ts` for logic and integration scenarios that are stable outside
  a real browser;
- `vitest.playwright.ts` for real browser behavior, eventing, rendering, and
  transport flows that need Playwright to stay trustworthy.
5. Resolve in this order:
- add/adjust tests for real public API scenarios,
- add controlled break/failure tests for defensive branches,
- simplify/remove dead branches,
- propose architecture refactor for smell cases.
6. Re-run checks.
```bash
yarn lint
make tests-all-coverage
```

## Controlled Failure Patterns
- Invalid `postMessage` payload shape from remote side.
- Missing receiver/provider/channel references in host lifecycle.
- Partial tree update payloads (missing ids/props/children).
- Serialization edge cases for function/event proxies.

## Stop Condition (No Cognitive Loop)
If progress stalls after reasonable attempts:
1. Stop brute-force test additions.
2. Report exact uncovered locations, attempted scenario, attempted test level,
   and why the signal is still unstable or non-natural.
3. Offer user options:
- keep defensive branch as-is and accept uncovered path,
- refactor architecture to make behavior testable,
- remove redundant branch if behavior is impossible by construction,
- introduce a different verification strategy if neither classic `vitest` nor
  `vitest` + Playwright can cover the behavior with a stable and correct signal.

If available test levels are insufficient, say so explicitly and propose
concrete alternatives instead of guessing:
- extract logic into a lower-level unit that can be covered deterministically;
- add a higher-level browser/e2e scenario around the public API;
- add a small seam/fake/test hook if the production design currently blocks
  reliable verification.

The final decision on controversial refactors belongs to the user.
