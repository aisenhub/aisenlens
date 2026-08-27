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
pnpm install
pnpm dev
pnpm build
pnpm dev:desktop
pnpm sync:mobile
```

Use `pnpm open:android` or `pnpm open:ios` after syncing mobile assets. Android Studio is required for Android builds; Xcode on macOS is required for iOS builds.

## Deployment

Vercel deploys the Web application from the repository root with `pnpm --filter @aisenlens/web build`. Keep the Vercel project Root Directory empty and use `apps/web/dist` as its output directory.

## Documentation

- [Project architecture](docs/PROJECT_ARCHITECTURE.md)
- [Operations and Supabase constraints](docs/OPERATIONS.md)
- [AisenShot Scene Engine architecture](docs/AISENSHOT_SCENE_ENGINE_PLAN.md)
- [AisenShot Scene Engine implementation plan](docs/AISENSHOT_SCENE_ENGINE_IMPLEMENTATION_PLAN.md)
- [SEO and discoverability plan](docs/SEO_DISCOVERABILITY_PLAN.md)
