# Contributing to Ledger

Thank you for taking the time to contribute! Whether it's a bug report, a new feature, or a documentation fix — all contributions are welcome.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Features](#suggesting-features)
  - [Submitting a Pull Request](#submitting-a-pull-request)
- [Development Setup](#development-setup)
- [Project Conventions](#project-conventions)
  - [Branch Naming](#branch-naming)
  - [Commit Messages](#commit-messages)
  - [Code Style](#code-style)
- [File Structure Guide](#file-structure-guide)

---

## Code of Conduct

Be respectful, constructive, and kind. This is a personal project open to the community — keep the environment welcoming for everyone.

---

## How to Contribute

### Reporting Bugs

Before opening an issue, please:

1. Search [existing issues](../../issues) to avoid duplicates.
2. Reproduce the bug in the latest version.

When filing a bug report, include:

- **Steps to reproduce** — exact steps that trigger the bug
- **Expected behaviour** — what you expected to happen
- **Actual behaviour** — what actually happened
- **Browser + OS** — e.g. Chrome 125 on Windows 11
- **Screenshots** — if the bug is visual

### Suggesting Features

Open an issue with the prefix `[Feature]` in the title. Describe:

- The problem it solves (or the UX law it improves)
- How you'd expect it to work
- Any alternatives you've considered

### Submitting a Pull Request

1. **Fork** the repository and create your branch from `main`.
2. **Install dependencies** — `npm install`
3. **Make your changes** — keep them focused and minimal.
4. **Type-check** — `npm run check` must pass with zero errors.
5. **Test manually** — run `npm run dev` and verify the affected pages work.
6. **Commit** using the [commit message format](#commit-messages) below.
7. **Open a PR** against `main` with a clear title and description.

---

## Development Setup

```bash
# Clone your fork
git clone https://github.com/your-username/ledger.git
cd ledger

# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:5173

# Type checking (run before committing)
npm run check
```

### Recommended VS Code Extensions

The project includes `.vscode/extensions.json`. When you open the folder VS Code will prompt you to install:

- **Svelte for VS Code** — syntax highlighting, IntelliSense
- **Tailwind CSS IntelliSense** — class autocompletion

---

## Project Conventions

### Branch Naming

| Type | Pattern | Example |
|---|---|---|
| Bug fix | `fix/<short-description>` | `fix/budget-ring-overflow` |
| New feature | `feat/<short-description>` | `feat/recurring-transactions` |
| Documentation | `docs/<short-description>` | `docs/update-readme` |
| Refactor | `refactor/<short-description>` | `refactor/store-cleanup` |

### Commit Messages

Follow the [Conventional Commits](https://www.conventionalcommits.org) format:

```
<type>(<scope>): <short summary>

[optional body]
```

**Types:** `feat` · `fix` · `docs` · `style` · `refactor` · `test` · `chore`

**Examples:**

```
feat(budgets): add copy-budgets-from-last-month button
fix(quickadd): prevent duplicate save on double-tap
docs(readme): add Netlify deployment instructions
refactor(store): simplify refreshAll using Promise.all
```

### Code Style

- **TypeScript** — strict mode, no `any` unless absolutely necessary
- **Svelte 5 Runes** — use `$state`, `$derived`, `$effect` instead of stores
- **No comments** unless the *why* is non-obvious
- **No dead code** — remove unused imports, variables, functions
- **Tailwind** — utility classes in the template, CSS variables for design tokens
- **No new dependencies** without discussion — keep the bundle lean

---

## File Structure Guide

| File / Folder | What goes here |
|---|---|
| `src/lib/db/schema.ts` | Dexie table definitions and TypeScript types |
| `src/lib/db/queries.ts` | All database read/write helpers |
| `src/lib/db/sync.svelte.ts` | Turso Cloud sync logic |
| `src/lib/stores/app.svelte.ts` | Shared reactive state (one class, all pages) |
| `src/lib/utils.ts` | Pure helper functions (dates, currency, etc.) |
| `src/lib/components/` | Reusable UI components |
| `src/routes/` | One folder per page — SvelteKit file-based routing |
| `src/routes/layout.css` | Global CSS, design tokens (`@theme {}`) |

---

## Questions?

Open a [GitHub Discussion](../../discussions) or an issue tagged `question`. Happy to help.
