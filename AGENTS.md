# Agent Instructions

This file contains durable instructions for coding agents working in this repository. Project facts,
architecture, commands, and historical plans live in `docs/`; read them only when the task needs them.
This separation keeps the agent context small and prevents old plans from masquerading as current rules.

## 1. Context routing

- For architecture, data, module boundaries, or source layout, read `docs/architecture/PROJECT_ARCHITECTURE.md`.
- For commands, UI conventions, feature workflow, or module research, read `docs/development/DEVELOPMENT_GUIDE.md`.
- For deployment, domains, environment variables, or release verification, read `docs/operations/OPERATIONS.md`.
- For SEO or public-page indexing, read `docs/seo/SEO_DISCOVERABILITY_PLAN.md`.
- For current backlog, read `docs/development/DEVELOPMENT_TODO.md`.
- Treat `docs/archive/` as historical context only. Do not use an archived plan as a current requirement
  without reconciling it with the active docs and source.
- Read the smallest relevant set of documents for the task. Do not require a full repository map before
  a typo fix or other narrow change.

## 2. Before changing code

- Inspect the current tree, affected files, relevant package scripts, and existing implementation.
- Use `rg`/`rg --files` for searches.
- Check `git status --short` and preserve unrelated user changes.
- For a major architectural change, explain the reason and likely impact before editing.
- Modify the existing implementation; do not create duplicate paths or rewrite the application from scratch.

## 3. Safe editing and data handling

- Use `apply_patch` for text edits. Do not use shell redirection, ad-hoc scripts, or Python to write files
  when a patch is sufficient.
- Never run destructive commands such as `git reset --hard`, `git checkout --`, broad recursive deletion,
  or workspace-wide cleanup unless the user explicitly requests that exact operation.
- Never delete, clear, or silently migrate user project data as a workaround. Do not call
  `indexedDB.deleteDatabase`, `localStorage.clear`, or equivalent cleanup operations without explicit scope.
- Preserve current behavior unless the request asks for a behavior change. Do not add compatibility layers,
  fallback paths, or migration code solely for obsolete project formats.

## 4. UI and implementation discipline

- Follow the UI/component reuse order in `docs/development/DEVELOPMENT_GUIDE.md`.
- Reuse existing components before adding dependencies or new primitives.
- Keep business logic in feature modules and services, not generic UI components or the application shell.
- Use TypeScript and React functional components with explicit useful types and modular responsibilities.
- Do not change the framework, package manager, global design system, or build system without an explicit request.
- Do not introduce unrelated refactors, dependency upgrades, redesigns, or platform work.

## 5. New-module research

Before designing or implementing a new product module:

1. Research mature public solutions, browser APIs, or maintained libraries.
2. Write the AisenLens proposal and decision boundary.
3. Inspect only relevant local reference files, prioritizing OpenReel before OpenCut.
4. Record confirmed findings and the AisenLens decision in `reference-projects/REFERENCE_PROJECT_INDEX.md`.
5. Implement only after the decision is recorded.

Do not proactively read, copy, or migrate reference-project code. Do not treat assumptions as verified facts.

## 6. Verification

- Use the repository's existing scripts and package manager.
- Run validation proportionally to the change. For UI/component changes, run the documented build gate;
  for release-boundary changes, run the relevant release gate.
- Fix failures caused by the change; do not weaken tests, disable checks, add `any`/`@ts-ignore`, or hide
  warnings merely to obtain a pass.
- Report commands, exit codes, meaningful warnings, and any unverified scope accurately.
- Update the relevant active documentation when architecture, data, commands, routes, or deployment facts change.

## 7. External systems and Git

- Do not infer permission to change Vercel, DNS, Supabase, production data, or third-party settings.
  Perform such mutations only when the user explicitly authorizes them.
- Commit and push only when the user requests it or the active task explicitly authorizes it. Keep commits
  focused and use the requested branch; do not rewrite shared history.
- Before a commit, run `git diff --check` and inspect the staged diff. After a push, verify local HEAD and
  the remote branch agree.

## 8. Environment policy

- Install custom-path software under `D:\APP\Codex\<tool-name>`; do not install into `C:\` or a default path
  when a custom path is available.
- Store tool caches under `E:\AppData\<tool-name>`, not directly in `E:\AppData`.
- Do not expose secrets in source, frontend variables, documentation examples, commits, or command output.

## 9. Completion

Continue through the requested scope until the stated completion criteria are met. If blocked, exhaust safe
in-scope diagnostics and alternatives, then report the concrete blocker and the smallest required decision.
Do not claim completion from a build alone when browser, data, deployment, or rollback evidence is still pending.
