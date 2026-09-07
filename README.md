# AisenLens

AisenLens is a pnpm workspace with a single shared React/Vite renderer and platform-specific shells.

## Workspace layout

```text
apps/
  web/       Shared React application and Vite build
  desktop/   Electron shell that packages apps/web/dist
  mobile/    Capacitor Android and iOS shells that sync apps/web/dist
supabase/    Supabase migrations and functions
```

## Development

```bash
corepack pnpm install
corepack pnpm dev
corepack pnpm build
corepack pnpm verify:web
corepack pnpm scene-engine:verify:core
corepack pnpm scene-engine:verify:web-preview
corepack pnpm dev:desktop
corepack pnpm sync:mobile
```

Use the pnpm version pinned in `package.json` through Corepack. For Web features
that connect to Supabase, copy `apps/web/.env.example` to `apps/web/.env.local`
and provide the public Supabase URL and anonymous key; do not commit that file.

Use `pnpm open:android` or `pnpm open:ios` after syncing mobile assets. Android Studio is required for Android builds; Xcode on macOS is required for iOS builds.

`scene-engine:verify:core` runs the native, baseline/SIMD WASM, TypeScript,
contract, and parity checks without changing the normal Web build workflow.
`scene-engine:verify:web-preview` runs the production Worker/WASM smoke at the
non-root `/aisenlens/` path. It uses `apps/web/test/test.mov` by default; choose
another repository-local video with `AISENLENS_SCENE_FIXTURE`, for example
`$env:AISENLENS_SCENE_FIXTURE='apps/web/test/test03.mov'; corepack pnpm scene-engine:verify:web-preview`.
Current feature validation scope is Web; Desktop and Mobile remain optional
platform checks.

`verify:web` is the release gate for the Web application. It runs TypeScript
checking, lint, core logic tests, platform adapter checks, the exclusive-frame
export boundary test, and the production build in one command.

## Deployment

Vercel deploys the Web application from the repository root with `pnpm --filter @aisenlens/web build`. Keep the Vercel project Root Directory empty and use `apps/web/dist` as its output directory.

## Documentation

- [Project architecture](docs/PROJECT_ARCHITECTURE.md)
- [Web audit and remediation record](docs/WEB_AUDIT_2026-09-07.md)
- [Operations and Supabase constraints](docs/OPERATIONS.md)
- [AisenShot documentation index](docs/auto-shot/README.md)
- [AisenShot Scene Engine architecture](docs/auto-shot/ARCHITECTURE.md)
- [AisenShot Scene Engine implementation plan](docs/auto-shot/IMPLEMENTATION_PLAN.md)
- [AisenShot automatic scene control design](docs/auto-shot/CONTROL_SYSTEM.md)
- [SEO and discoverability plan](docs/SEO_DISCOVERABILITY_PLAN.md)
