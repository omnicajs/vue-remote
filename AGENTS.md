# AGENTS.md

## Goals
- Avoid clarification loops by proposing a concrete interpretation when details
  are missing.
- Default to the language of the user's initial message unless they explicitly
  request a different language.
- Match the tone and formality of the user's initial message unless they
  explicitly ask for a change.
- Treat a language switch in the user's message as an explicit request to
  respond in that language.
- If a message is mixed-language, reply in the dominant language unless the
  user specifies otherwise.
- Run `yarn lint` before handoff or commit preparation only when changed files
  include code covered by eslint rules (for example `*.js`, `*.ts`, `*.vue`,
  and similar source files). Do not run `yarn lint` for markdown-only changes
  (for example `*.md`).
- Use the smallest relevant test set for the changed area, and expand to broader
  test runs only when signals suggest regression risk.

## Reporting
- Keep handoff reports natural and outcome-focused: describe what was done.
- Do not proactively list skipped optional steps/checks unless the user
  explicitly asks.
- Always mention blockers, failed required checks, or other omissions that can
  affect correctness, safety, or reproducibility.

## Purpose
This file defines practical instructions for working in the
`@omnicajs/vue-remote` repository, with a focus on test execution and commit
workflow.

## Repository Structure
- This project is a single-package repository (`@omnicajs/vue-remote`).
- Source code lives under `src/`, mainly in:
  - `src/dom/**` for transport/tree logic;
  - `src/vue/**` for Vue bindings and host/remote adapters.
- Documentation site source lives in `web/**` (Astro + Starlight).
- Astro docs operational guide is `docs/ASTRO.md`.
- Tests are split by level:
  - `tests/unit/**`,
  - `tests/integration/**`,
  - `tests/e2e/**`.
- Tooling stack: Vite, Vitest, ESLint, Playwright.

## Local Environment Prerequisites
- Node version is `>=18.0.0` (see `engines.node` in `package.json`).
- Lockfile format is Yarn Classic (`yarn lockfile v1`).
- Install dependencies with:
```bash
yarn install
```
- Docker-based install path is available via:
```bash
make node_modules
```

## Running Tests

### Local Path
- Run unit and integration tests:
```bash
yarn test
```
- Run coverage:
```bash
yarn test:coverage
```
- Run e2e tests:
```bash
yarn e2e:build
yarn e2e:serve
yarn e2e:test
```

### Docker/Makefile Path
- Unit and integration tests:
```bash
make tests
```
- E2E tests:
```bash
make e2e
```

## Related Commands
- Build package:
```bash
yarn build
# or
make build
```
- Run eslint:
```bash
yarn lint
```
- Build docs site:
```bash
yarn docs:build
```
- Start docs site locally:
```bash
yarn docs:dev
```
- Show available make recipes:
```bash
make help
```

## Important Project Rules
- Commit messages follow Conventional Commits.
- Prefer behavior-oriented tests through public host/remote APIs over brittle
  implementation-coupled checks.
- Never edit `yarn.lock` manually.

## Commit Workflow
- Default commit message language is English (unless explicitly requested
  otherwise).
- Commit style is Conventional Commits.
- Write commit subjects as historical facts (not intentions).
- Start commit subject description with an uppercase letter.
- Keep commit subject description concise.
- Move long details to commit body; lists in body are allowed for enumerations.
- Use past/perfective wording; prefer passive voice for changelog-friendly
  phrasing.
Examples: `Added ...`, `Removed ...`, `Refactored ...`, `Fixed ...`.
- Respect commitlint limits from `commitlint.config.ts`:
  `header-max-length=200`, `body-max-line-length=200`,
  `footer-max-line-length=200`.
- Split commits by logical change.
- Keep `yarn.lock` updates in a dedicated commit with no other files.
- Commit message for `yarn.lock`-only commit must be exactly:
  `chore: Updated yarn.lock`.
- Exception for intentional dependency updates (`yarn up`, `yarn add`,
  `yarn remove`, etc.):
  after rebase conflict resolution rerun the original dependency command and
  recreate separate `chore: Updated yarn.lock` commit.
- For commit tasks, use the local skill:
  `skills/commit-workflow/SKILL.md`.
- For `yarn.lock` merge/rebase conflict resolution, use the local skill:
  `skills/yarn-lock-conflict-resolution/SKILL.md`.
- For coverage deficit analysis and recovery strategy, use the local skill:
  `skills/coverage-recovery/SKILL.md`.
- For documentation/website visual analysis and screenshot capture via Make
  recipes, use the local skill:
  `skills/screenshot-recipes/SKILL.md`.
