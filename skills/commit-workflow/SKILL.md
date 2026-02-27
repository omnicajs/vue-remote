---
name: commit-workflow
description: Use this skill when creating git commits in this repository. It standardizes commit splitting, Conventional Commit type/scope selection, English commit message text, and commitlint constraints.
---

# Commit Workflow

## When To Use
Use this skill when the user asks to:
- create one or more commits;
- split changes into separate commits;
- choose commit messages/scopes/types;
- validate commit formatting before committing.

## Source Of Truth
- `AGENTS.md`
- `commitlint.config.js`

## Required Rules
- Commit format: Conventional Commits.
- Message language: English by default.
- Subject style: describe completed historical change, not intention.
- Start commit subject description with an uppercase letter.
- Keep commit subject description concise.
- Put long details into commit body; lists in body are allowed for enumerations.
- Use past/perfective wording; prefer passive voice to fit changelog style.
Examples: `Added ...`, `Removed ...`, `Refactored ...`, `Fixed ...`.
- Allowed types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`,
  `refactor`, `revert`, `style`, `test`.
- Scope is optional, but when used it must reflect the touched area.
Recommended scopes by paths:
  - `dom` for `src/dom/**`,
  - `host` for `src/dom/host/**` or `src/vue/host/**`,
  - `remote` for `src/dom/remote/**` or `src/vue/remote/**`,
  - `vue` for shared Vue-level changes in `src/vue/**`,
  - `tests` for `tests/**`,
  - `build` for toolchain and config files,
  - `deps` for dependency updates.
- Avoid synthetic scopes unrelated to the changed files.
- Do not mix unrelated changes in one commit.
- Always commit `yarn.lock` changes in a dedicated commit with no other files.
- For a `yarn.lock`-only commit, use exact header: `chore: Updated yarn.lock`.
- Exception for intentional dependency updates (`yarn up`, `yarn add`,
  `yarn remove`, etc.):
  after rebase conflict resolution rerun the original dependency command and
  recreate separate `chore: Updated yarn.lock` commit.
- Do not amend/rewrite history unless explicitly requested.

## Commitlint Constraints
- Header max length: `200`
- Body line max length: `200`
- Footer line max length: `200`
- `subject-case: never` (avoid case-constrained templates; use natural English
  wording)

## Workflow
1. Inspect pending changes:
```bash
git status --short
git diff
```
2. Group files by logical intent.
If `yarn.lock` is changed, split it into a separate commit and keep other files
out of that commit.
3. Choose commit type and optional scope from touched area.
4. Compose English commit header:
```text
<type>(<scope>): <Short description>
```
If scope is not needed:
```text
<type>: <Short description>
```
Style rule for `<Short description>`:
start with an uppercase letter and use completed historical phrasing in
past/perfective form, preferably passive voice.
5. Stage only target files:
```bash
git add <files>
```
6. Create commit (non-interactive):
```bash
git commit -m "<type>(<scope>): <Description>"
```
7. Verify result:
```bash
git show --name-status --oneline -n 1
```

## Practical Patterns
- DOM fix:
`fix(dom): Channel event normalization was fixed`
- Remote API improvement:
`feat(remote): Remote tree mounting hooks were added`
- Test-only update:
`test(tests): Host receiver edge cases were covered`
- Build/config change:
`build: Vitest coverage setup was updated`
- Yarn lock refresh:
`chore: Updated yarn.lock`
