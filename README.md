# AisenLens

> 文档状态：2026-09-14 已完成全仓库文档审计。当前线上公开站为
> [lens.aisenhub.com](https://lens.aisenhub.com)，产品站为
> [app.lens.aisenhub.com](https://app.lens.aisenhub.com)；完整的文档现状、验证证据和未完成验收见
> [docs/DOCUMENTATION_STATUS.md](docs/DOCUMENTATION_STATUS.md)。

AisenLens is a pnpm workspace with two independent React/Vite web release units and platform-specific shells.

## Workspace layout

```text
apps/
  webhome/   Public marketing, tutorials, legal pages, and SEO build
  webapp/    Product projects, editor, media, analysis, and export build
  desktop/   Electron shell that packages apps/webapp/dist
  mobile/    Capacitor Android and iOS shells that sync apps/webapp/dist
```

## Development

```bash
corepack pnpm install
corepack pnpm dev:webapp
corepack pnpm dev:webhome
corepack pnpm build:web
corepack pnpm verify:web
corepack pnpm scene-engine:verify:core
corepack pnpm scene-engine:verify:web-preview
corepack pnpm dev:desktop
corepack pnpm sync:mobile
```

Use the pnpm version pinned in `package.json` through Corepack. AisenLens is
local-first and does not require an account or cloud credentials; keep
`apps/webapp/.env.example` as the empty local configuration template.

Use `pnpm open:android` or `pnpm open:ios` after syncing mobile assets. Android Studio is required for Android builds; Xcode on macOS is required for iOS builds.

`scene-engine:verify:core` runs the native, baseline/SIMD WASM, TypeScript,
contract, and parity checks without changing the normal Web build workflow.
`scene-engine:verify:web-preview` runs the production Worker/WASM smoke at the
non-root `/aisenlens/` path. It uses `apps/webapp/test/test.mov` by default; choose
another repository-local video with `AISENLENS_SCENE_FIXTURE`, for example
`$env:AISENLENS_SCENE_FIXTURE='apps/webapp/test/test03.mov'; corepack pnpm scene-engine:verify:web-preview`.
Current feature validation scope is Web; Desktop and Mobile remain optional
platform checks.

`verify:web` is the combined release gate. It runs `verify:webhome`,
`verify:webapp`, and `verify:web-boundaries`; each release unit also has its
own build, typecheck, and lint commands.

## Deployment

The public site is built with `pnpm --filter @aisenlens/webhome build` into
`apps/webhome/dist`. The product site is built with
`pnpm --filter @aisenlens/webapp build` into `apps/webapp/dist`. Each app has
its own `vercel.json`.

Current production domains:

- Public, indexable content: `https://lens.aisenhub.com`
- Product renderer, `noindex`: `https://app.lens.aisenhub.com`

On 2026-09-14 both domains and their `/projects` boundary were checked with
HTTP requests. This confirms reachability, titles and indexing directives; it
does not replace the pending browser smoke for project creation, media import,
editor refresh/recovery, auto-shot and export. Vercel dashboard settings and
rollback deployment IDs remain operational evidence maintained in
`docs/OPERATIONS.md`, not in source code.

## Documentation

- [Project architecture](docs/PROJECT_ARCHITECTURE.md)
- [Web audit and remediation record](docs/WEB_AUDIT_2026-09-07.md)
- [AisenShot documentation index](docs/auto-shot/README.md)
- [AisenShot Scene Engine architecture](docs/auto-shot/ARCHITECTURE.md)
- [AisenShot Scene Engine implementation plan](docs/auto-shot/IMPLEMENTATION_PLAN.md)
- [AisenShot automatic scene control design](docs/auto-shot/CONTROL_SYSTEM.md)
- [SEO and discoverability plan](docs/SEO_DISCOVERABILITY_PLAN.md)
- [Documentation status and source-of-truth index](docs/DOCUMENTATION_STATUS.md)
