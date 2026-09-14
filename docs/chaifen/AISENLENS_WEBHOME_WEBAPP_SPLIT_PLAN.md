# AisenLens `webhome` / `webapp` 拆分实施计划

> 审查对象：`aisenhub/aisenlens`  
> 审查分支：`main`  
> 审查基线提交：`c12382b461cf8895a8364e00b355d74992d62326`（2026-09-10）  
> 方案日期：2026-09-14  
> 目标：将公开网站与产品编辑器拆成两个可独立构建、独立部署的 Web 应用，同时让 `webapp` 成为 Electron / Capacitor 的唯一前端 renderer。

## 当前状态补充（2026-09-14）

本文是拆分前的详细设计与执行背景，以下事实优先于正文中仍保留的历史假设：

- 代码拆分已完成，当前使用 `apps/webhome` 与 `apps/webapp`；`apps/web`、
  `@aisenlens/web` 和 `apps/web/dist` 只表示拆分前基线。
- 公开站 [`https://lens.aisenhub.com`](https://lens.aisenhub.com) 与产品站
  [`https://app.lens.aisenhub.com`](https://app.lens.aisenhub.com) 已完成线上 HTTP、标题和
  robots 只读核查。完整浏览器产品 smoke、线上 Worker/WASM 和 rollback deployment anchor
  仍未完成。
- 站点所有者确认项目从未有生产数据，`PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`。
  不执行旧 origin backup/restore，不实现旧格式兼容、迁移 UI 或清库逻辑。
- 当前产品没有 Auth、登录、密码重置、Support 或 Feedback 路由；正文中相关内容是原方案
  的条件分支，不应作为当前实现或当前上线阻塞项。

后续阅读本文件时，当前架构和运行事实以 [docs/OPERATIONS.md](../OPERATIONS.md)、
[docs/PROJECT_ARCHITECTURE.md](../PROJECT_ARCHITECTURE.md) 与
[docs/DOCUMENTATION_STATUS.md](../DOCUMENTATION_STATUS.md) 为准。

---

## 1. 结论先行

建议最终把仓库调整为：

```text
aisenlens/
├─ apps/
│  ├─ webhome/       # 官网、SEO 内容、教程、术语、更新日志、协议等
│  ├─ webapp/        # 项目库、编辑器、登录、用户中心、反馈/支持等产品功能
│  ├─ desktop/       # Electron shell，只打包 webapp/dist
│  └─ mobile/        # Capacitor shell，只同步 webapp/dist
├─ packages/
│  └─ scene-engine/  # 继续作为 webapp 的独立底层引擎
├─ scripts/
├─ supabase/
├─ tests/
├─ package.json
├─ pnpm-workspace.yaml
└─ pnpm-lock.yaml
```

部署上建议保持 **一个 GitHub monorepo + 两个 Vercel Project**：

```text
GitHub: aisenhub/aisenlens
        │
        ├── Vercel Project: aisenlens-webhome
        │     Root Directory: apps/webhome
        │     Production Domain: https://lens.aisenhub.com
        │
        └── Vercel Project: aisenlens-webapp
              Root Directory: apps/webapp
              Production Domain: https://app.lens.aisenhub.com
```

其中：

- 当前已经部署的网站 Vercel Project，最终改造成 `webhome`。
- 新建第二个 Vercel Project 部署 `webapp`。
- `desktop` 不再消费旧的 `apps/web/dist`，而是只消费 `apps/webapp/dist`。
- `mobile` 同样改为只消费 `apps/webapp/dist`。
- 不建议把 `webhome` 与 `webapp` 拆成两个 Git 仓库；目前 pnpm workspace 已经非常适合这种“一仓库、多应用、独立部署”的结构。

这能直接实现两个目标：

1. 官网未来加入大量教程、图片、静态内容后，不会进入 `webapp` 的前端构建产物和运行依赖。
2. `webapp` 成为真正独立的产品 renderer，以后 Electron、Capacitor，甚至其他桌面壳都只需要打包这一份应用。

---

## 2. 当前项目审查结果

### 2.1 当前 `apps/web` 同时承担两类完全不同的职责

当前路由把以下内容全部放在同一个 React/Vite 应用中：

公开网站：

- `/`
- `/features/*`
- `/tutorials`
- `/tutorials/*`
- `/glossary`
- `/changelog`
- `/terms`
- `/privacy`

产品应用：

- `/projects`
- `/app`
- `/reset-password`
- `/support`
- `/feedback`
- 登录 / 注册
- 用户中心
- 设置
- 项目管理
- IndexedDB 项目数据
- 自动分镜
- Scene Engine / WASM
- 媒体解码
- 时间线
- 分析
- 导出

`App.tsx` 目前直接维护公开页面与应用页面的路由映射，而 `AppPages.tsx` 同时 lazy-load 官网页面、项目库和编辑器。

虽然页面级 lazy loading 已经避免了“所有编辑器代码一次性下载”，但从工程边界上仍然是同一个应用、同一个依赖树、同一个发布单元。

---

### 2.2 当前首页应用入口仍存在编辑器级依赖耦合

当前 `App.tsx` 会直接 import：

- `AuthModal`
- `UserCenterModal`
- `LiteSettingsModal`
- `useAppSession`
- 项目类型
- 营销 SEO
- 编辑器页面状态

这意味着公开网站 shell 本身仍然知道大量产品层概念。

例如 `LiteSettingsModal` 本质上属于编辑器设置，却由顶层应用直接加载。

这正是这次拆分应该消除的依赖方向：

```text
当前：

Marketing
   ↘
    App Shell ─── Auth
       │
       ├──── Project
       ├──── Editor
       └──── Marketing / SEO

目标：

webhome
  └── Marketing / SEO / Docs

webapp
  ├── Auth
  ├── Project
  ├── Editor
  ├── Analysis
  ├── Media
  ├── Export
  └── Scene Engine
```

最终 `webhome` 不应该 import：

- `features/editor`
- `features/project`
- `features/auto-shot`
- `features/media`
- `features/export`
- `packages/scene-engine`
- IndexedDB project repository
- Electron/Capacitor 相关适配逻辑

---

### 2.3 当前 Electron 已经把 Web renderer 当成独立静态产物打包

现有 Electron 架构本身是正确方向：

```text
Electron main
    ↓
apps/web/dist/index.html
```

`apps/desktop/package.json` 目前：

```json
{
  "build:renderer": "pnpm --filter @aisenlens/web build"
}
```

并把：

```text
../web/dist
```

作为 `extraResources` 打进安装包。

所以拆分以后只需要把 renderer 来源统一改成：

```text
apps/webapp/dist
```

而不是重新设计桌面端。

这也是为什么本方案推荐：

> **把现有 `apps/web` 改名为 `apps/webapp`，而不是改名为 `webhome`。**

因为当前绝大多数真正的产品代码本来就属于 `webapp`。

---

### 2.4 当前 Capacitor 也消费同一个 Web build

当前：

```ts
webDir: "../web/dist"
```

拆分后应改为：

```ts
webDir: "../webapp/dist"
```

因此最终可以形成非常清晰的平台关系：

```text
                      ┌── Browser / Vercel
                      │
apps/webapp ─ build ──┼── Electron
                      │
                      └── Capacitor

apps/webhome ─ build ─── Browser / Vercel only
```

---

## 3. 建议的页面归属

### 3.1 `webhome`

推荐把所有公开、可索引、内容型页面放进 `webhome`：

| 路由 | 归属 | 说明 |
|---|---|---|
| `/` | webhome | 首页 |
| `/features/auto-shot` | webhome | 产品能力介绍 |
| `/features/frame-analysis` | webhome | 产品能力介绍 |
| `/features/reports` | webhome | 产品能力介绍 |
| `/tutorials` | webhome | 教程首页 |
| `/tutorials/*` | webhome | 教程正文 |
| `/glossary` | webhome | 影视术语 |
| `/changelog` | webhome | 更新内容 |
| `/terms` | webhome | 用户协议 |
| `/privacy` | webhome | 隐私政策 |

以后新增：

```text
/guides/*
/blog/*
/learn/*
/docs/*
/resources/*
```

也都应优先进入 `webhome`。

---

### 3.2 `webapp`

推荐产品运行相关路由全部进入 `webapp`：

| 路由 | 归属 | 说明 |
|---|---|---|
| `/` | webapp | 建议 redirect 到 `/projects` |
| `/projects` | webapp | 项目库 |
| `/app` | webapp | 编辑器 |
| `/reset-password` | webapp | Supabase 密码重置 |
| `/support` | webapp | 当前依赖登录状态，先留在应用侧 |
| `/feedback` | webapp | 当前依赖登录状态，先留在应用侧 |

以及：

- 登录
- 注册
- 用户中心
- 权益
- 兑换
- 设置
- 项目管理
- IndexedDB
- 视频工作流

全部属于 `webapp`。

---

## 4. 为什么暂时把 Support / Feedback 留在 `webapp`

当前 Supabase session 由浏览器侧 `supabase-js` 管理，而浏览器存储是按 origin 隔离的。

拆分后：

```text
https://lens.aisenhub.com
```

与：

```text
https://app.lens.aisenhub.com
```

属于两个 origin。

这意味着两个应用不能直接共享：

- localStorage
- sessionStorage
- IndexedDB
- 默认 Supabase 浏览器 session

因此第一阶段不要为了“所有非编辑器页面都必须放 webhome”而把认证逻辑再次复制到 `webhome`。

建议：

```text
webhome:
  纯公开内容 + “进入应用”链接

webapp:
  所有需要 session 的功能
```

以后如果 `/feedback`、`/support` 要公开化，可以通过服务端 API / 匿名接口重新设计，再迁到 `webhome`。

---

## 5. 最关键风险：IndexedDB 会因为域名变化而“看不到旧项目”

这是整个拆分最需要提前处理的一项。

当前项目数据使用：

```text
IndexedDB database:
aisenlens-projects
```

当前代码数据库版本已经到：

```text
DATABASE_VERSION = 17
```

浏览器 IndexedDB 是 origin scoped。

也就是说，如果用户今天在：

```text
https://lens.aisenhub.com
```

创建了项目，数据实际上属于：

```text
origin = https://lens.aisenhub.com
```

如果以后编辑器改到：

```text
https://app.lens.aisenhub.com
```

那么新应用看到的是一套全新的 IndexedDB：

```text
origin = https://app.lens.aisenhub.com
```

浏览器不会自动把旧数据复制过去。

用户表面上会感觉：

> “升级以后我的项目全没了。”

实际上数据仍然在旧 origin。

---

## 6. IndexedDB 迁移策略

### 推荐方案：正式切域名前提供一次备份迁移

如果目前已经存在真实用户数据，建议拆分分两次上线。

### 第一次上线：仍然保持旧域名与旧 editor

先发布一个过渡版本，在原来的：

```text
https://lens.aisenhub.com
```

增加非常明显的：

```text
导出全部项目备份
```

或者：

```text
迁移到新版 AisenLens
```

功能。

该功能在旧 origin 下运行，因此能正常读取旧 IndexedDB。

优先使用项目已经存在的：

```text
projectBackupService.ts
```

作为迁移基础，不再自己造新的数据传输格式。

用户完成：

```text
旧域名
  ↓
导出 .aisenlens / backup
  ↓
新 webapp
  ↓
导入
```

这是最可靠的方式。

---

### 不建议第一阶段做跨 origin 自动同步

理论上可以用：

- iframe
- `window.postMessage`
- Service Worker
- 服务端中转

实现半自动迁移。

但是 AisenLens 项目里可能包含：

- 视频 Blob
- 截图 Blob
- 波形
- thumbnail
- 自动分镜数据
- 大量本地媒体数据

跨 origin 自动传输会把简单的“应用拆分”升级成一个独立的数据迁移项目。

第一阶段不值得。

---

### 如果当前还没有需要保留的真实线上项目

如果确定当前线上用户没有需要迁移的数据，那么可以直接切。

但仍建议在发布说明里明确：

> Web App 迁移到了新的应用域名，本地项目存储 origin 已变化。

---

## 7. 推荐目标代码结构

```text
apps/
├─ webhome/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ vercel.json            # 如需要 home 端路由配置
│  ├─ index.html
│  ├─ public/
│  │  ├─ robots.txt
│  │  ├─ sitemap.xml
│  │  └─ ...
│  └─ src/
│     ├─ app/
│     ├─ assets/
│     ├─ components/
│     ├─ features/
│     │  └─ marketing/
│     ├─ pages/
│     │  ├─ LandingPage.tsx
│     │  ├─ TutorialsPage.tsx
│     │  ├─ ChangelogPage.tsx
│     │  ├─ PrivacyPolicyPage.tsx
│     │  └─ UserAgreementPage.tsx
│     ├─ styles/
│     └─ main.tsx
│
├─ webapp/
│  ├─ package.json
│  ├─ vite.config.ts
│  ├─ vercel.json
│  ├─ .env.example
│  ├─ index.html
│  ├─ src/
│  │  ├─ app/
│  │  ├─ components/
│  │  ├─ features/
│  │  │  ├─ analysis/
│  │  │  ├─ annotation/
│  │  │  ├─ auth/
│  │  │  ├─ auto-shot/
│  │  │  ├─ editor/
│  │  │  ├─ export/
│  │  │  ├─ group/
│  │  │  ├─ media/
│  │  │  ├─ overview/
│  │  │  ├─ project/
│  │  │  ├─ scene-calibration/
│  │  │  ├─ shot/
│  │  │  ├─ timeline/
│  │  │  ├─ workflow/
│  │  │  └─ ...
│  │  ├─ services/
│  │  │  ├─ auth/
│  │  │  └─ aisenhub/
│  │  └─ main.tsx
│  └─ test/
│
├─ desktop/
└─ mobile/
```

---

## 8. 不建议第一阶段同时做“大规模 shared UI 包重构”

两个应用确实会有少量共享：

- Logo
- Brand tokens
- Button
- Theme
- Typography
- 少量 layout

但第一次拆分时建议：

> 先建立部署边界，再优化源码共享。

不要同时完成：

```text
apps/web → webhome + webapp
+
所有 components/ui → packages/ui
+
所有 CSS token → packages/theme
+
所有类型 → packages/shared
```

这样会把一个边界重构变成三四个架构重构叠加。

### 推荐顺序

Phase 1：

```text
能复制的小组件先复制
真正重量级能力只留 webapp
```

Phase 2 稳定以后再抽：

```text
packages/ui
packages/brand
```

只有当两边确实都在消费同一能力时再抽。

---

## 9. `webhome` 的依赖原则

最终 `apps/webhome/package.json` 应明显比 `webapp` 小。

例如不应该出现：

```text
@aisenlens/scene-engine
mediabunny
zustand                 # 如果 marketing 不需要
@supabase/supabase-js   # 第一阶段尽量不要
```

通常只需要：

```text
react
react-dom
react-router-dom
lucide-react
tailwind
少量 UI 依赖
```

如果以后教程内容逐步复杂，可以单独引入：

- Markdown / MDX
- syntax highlighter
- static content loader

但这些都不会影响 `webapp`。

---

## 10. 教程大文件的处理原则

拆成 `webhome` 后，教程图片、文章资源不会再进入 `webapp` 的 bundle。

但是对于“大文件”，仍然不建议全部直接提交 Git。

### 可以放进 `apps/webhome/public`

适合：

- SVG
- 小图
- 小型 WebP
- 示例 JSON
- 小型字幕文件

### 不建议长期放 Git

例如：

- 大型教学视频
- 原始 MOV
- 大型 MP4
- 多百 MB 素材包

建议以后放：

- 对象存储
- CDN
- Vercel Blob
- S3 / R2 等

然后 `webhome` 只保存 URL 与内容 metadata。

原因是即使 `webapp` 不再打包这些文件，monorepo Git clone、CI checkout、Vercel source upload 仍然可能受到超大二进制仓库体积影响。

---

# 11. 具体实施阶段

## Phase 0：建立拆分基线

开始移动文件前：

```bash
corepack pnpm install
corepack pnpm verify:web
corepack pnpm build
corepack pnpm dev:desktop
```

记录：

- Web 当前 build 是否成功
- 项目创建 / 打开
- 编辑器加载
- 自动分镜入口
- 导出
- 登录
- reset password
- desktop 启动

同时记录一次当前 production deployment。

这一阶段不要改功能。

---

## Phase 1：先把现有 `apps/web` 改名为 `apps/webapp`

推荐：

```bash
git mv apps/web apps/webapp
```

然后修改：

```text
apps/webapp/package.json
```

从：

```json
"name": "@aisenlens/web"
```

改成：

```json
"name": "@aisenlens/webapp"
```

这一阶段先让所有现有功能完整运行。

### 根 `package.json`

建议新增明确脚本：

```json
{
  "scripts": {
    "dev:webapp": "pnpm --filter @aisenlens/webapp dev",
    "build:webapp": "pnpm --filter @aisenlens/webapp build",
    "lint:webapp": "pnpm --filter @aisenlens/webapp lint",
    "typecheck:webapp": "pnpm --filter @aisenlens/webapp typecheck"
  }
}
```

不要继续让：

```text
pnpm build
```

含义模糊地只代表一个 Web 应用。

最终建议：

```json
{
  "build:webhome": "...",
  "build:webapp": "...",
  "build:web": "pnpm build:webhome && pnpm build:webapp"
}
```

---

## Phase 2：同步修正 Desktop / Mobile

### Electron

修改：

```text
apps/desktop/package.json
```

从：

```text
pnpm --filter @aisenlens/web build
```

改为：

```text
pnpm --filter @aisenlens/webapp build
```

从：

```text
../web/dist
```

改为：

```text
../webapp/dist
```

修改：

```text
apps/desktop/src/main.ts
```

开发态路径从：

```text
../../web/dist/index.html
```

改为：

```text
../../webapp/dist/index.html
```

打包后的 resource 名称也建议从：

```text
web
```

改成：

```text
webapp
```

例如：

```text
resources/webapp/index.html
```

这样语义更清晰。

---

### Capacitor

修改：

```text
apps/mobile/package.json
```

从：

```text
pnpm --filter @aisenlens/web build
```

改为：

```text
pnpm --filter @aisenlens/webapp build
```

修改：

```text
apps/mobile/capacitor.config.ts
```

从：

```ts
webDir: "../web/dist"
```

改成：

```ts
webDir: "../webapp/dist"
```

---

## Phase 3：创建 `apps/webhome`

不要从零重新设计页面。

第一阶段直接从当前应用迁出：

```text
LandingPage
TutorialsPage
ChangelogPage
PrivacyPolicyPage
UserAgreementPage
marketing/
SEO metadata
SeoContentPage
公开 Navigation
robots.txt
sitemap.xml
```

并重新建立一个非常轻的 `webhome` App shell。

例如：

```text
webhome
└── App
    ├── Header
    ├── PublicRouter
    ├── Footer
    └── PublicPages
```

不要把原 `App.tsx` 整个复制过来，因为当前 `App.tsx` 仍包含：

- Auth
- UserCenter
- LiteSettings
- Project
- Editor navigation

应该建立新的纯公开入口。

---

## Phase 4：从 `webapp` 删除 marketing 责任

`webapp` 完成 webhome 建立后，删除：

```text
features/marketing
LandingPage
TutorialsPage
ChangelogPage
PrivacyPolicyPage
UserAgreementPage
公开 SEO prerender
公开 sitemap
```

`webapp` 的 router 最终只处理产品路由。

推荐：

```text
/
  → /projects

/projects
/app
/reset-password
/support
/feedback
```

首页不再存在 marketing UI。

---

## Phase 5：建立跨应用跳转

### webhome

所有：

```text
开始使用
进入应用
打开项目库
登录
```

统一跳到：

```text
https://app.lens.aisenhub.com
```

或者：

```text
https://app.lens.aisenhub.com/projects
```

建议在 webhome 使用环境变量：

```text
VITE_WEBAPP_URL=https://app.lens.aisenhub.com
```

Preview 环境可填对应 preview app URL。

不要在几十个组件中硬编码 production domain。

---

### webapp

需要返回官网时：

```text
VITE_WEBHOME_URL=https://lens.aisenhub.com
```

用于：

- Logo 点击
- 帮助
- 协议
- 隐私
- 教程
- 更新日志

---

## Phase 6：拆分 SEO / prerender

当前：

```text
scripts/prerender-public-routes.mjs
```

硬编码：

```text
apps/web
```

拆分后应该改为：

```text
apps/webhome
```

建议顺手重命名：

```text
scripts/prerender-webhome-routes.mjs
```

只为 `webhome` 生成：

```text
/
features/*
tutorials/*
glossary
changelog
terms
privacy
```

`webapp` 不再运行这一 postbuild。

产品路由应统一：

```html
<meta name="robots" content="noindex,nofollow">
```

或者 webapp 整站通过：

```text
robots.txt
```

禁止搜索引擎索引。

---

## Phase 7：拆分验证脚本

当前：

```text
scripts/verify-web.mjs
```

全部绑定：

```text
@aisenlens/web
```

建议拆成：

```text
scripts/verify-webapp.mjs
scripts/verify-webhome.mjs
```

### `verify:webapp`

继续承担产品 release gate：

```text
typecheck
lint
editor tests
project tests
auto-shot tests
scene calibration
video export
workflow
build
```

### `verify:webhome`

只承担：

```text
typecheck
lint
build
prerender
SEO route check
internal link check
```

---

# 12. Vercel：当前已部署项目怎么改成 `webhome`

当前仓库 README 记录的部署方式是：

```text
Root Directory: repository root
Build Command:
pnpm --filter @aisenlens/web build

Output Directory:
apps/web/dist
```

这是旧的单 Web 应用模式。

---

## 12.1 推荐迁移顺序

不要先删旧部署。

推荐：

### Step A

代码先完成：

```text
apps/webhome
apps/webapp
```

本地两个都 build 成功。

### Step B

先创建新的 `webapp` Vercel Project。

不要立刻动现有生产域名。

先让：

```text
webapp temporary URL
```

完整可用。

### Step C

确认 `webapp` 后，再修改当前已上线的 Vercel Project，让它构建：

```text
apps/webhome
```

最后保留当前：

```text
lens.aisenhub.com
```

给 webhome。

这个顺序可以避免同时失去官网和编辑器。

---

## 12.2 `webhome` Vercel 最终设置

推荐最终把当前 Vercel Project 配置为：

```text
Project Name:
aisenlens-webhome

Git Repository:
aisenhub/aisenlens

Production Branch:
main

Root Directory:
apps/webhome

Framework:
Vite

Install Command:
pnpm install
（通常可保持自动检测）

Build Command:
pnpm build

Output Directory:
dist
```

如果 `webhome` 以后使用 workspace 里的共享 package：

确保 Vercel：

```text
Include source files outside of the Root Directory in the Build Step
```

保持开启。

Vercel 对较新的 monorepo Project 通常默认开启，但应人工核对一次。

---

## 12.3 现有 Project 的过渡配置

如果希望降低一次性修改 Vercel Root Directory 带来的风险，可以先短暂使用：

```text
Root Directory:
空

Build Command:
pnpm --filter @aisenlens/webhome build

Output Directory:
apps/webhome/dist
```

成功运行一两个版本后，再把 Root Directory 收敛为：

```text
apps/webhome
```

最终还是推荐 Root Directory 指向应用目录，因为 Vercel 可以更准确判断 monorepo 中哪个 Project 受提交影响。

---

# 13. Vercel：新 `webapp` 怎么部署

新建第二个 Project，仍然 Import：

```text
aisenhub/aisenlens
```

配置：

```text
Project Name:
aisenlens-webapp

Root Directory:
apps/webapp

Framework:
Vite

Build Command:
pnpm build

Output Directory:
dist
```

Production Domain 建议：

```text
app.lens.aisenhub.com
```

---

## 13.1 `webapp` 环境变量

把目前 Web 使用的环境变量放到 **webapp Project**：

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PLATFORM_API_URL
VITE_PLATFORM_PUBLIC_API_URL
```

另外建议新增：

```text
VITE_WEBHOME_URL=https://lens.aisenhub.com
```

而 `webhome` 则只需要：

```text
VITE_WEBAPP_URL=https://app.lens.aisenhub.com
```

不要把 Supabase Auth 环境变量复制给 webhome，除非以后 webhome 真正重新引入了认证功能。

---

## 13.2 `webapp` 的 SPA Rewrite

`webapp` 是 React Router + Vite SPA。

Vercel 对 SPA 的 deep link 不会自动回落到 `index.html`。

因此建议在：

```text
apps/webapp/vercel.json
```

加入：

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

否则用户直接访问：

```text
https://app.lens.aisenhub.com/projects
```

或：

```text
https://app.lens.aisenhub.com/reset-password
```

可能出现 Vercel 404，而从首页 client-side navigate 又正常。

---

## 13.3 Supabase Redirect URL

当前密码重置使用：

```ts
redirectTo: `${window.location.origin}/reset-password`
```

拆分以后生产环境会自然变为：

```text
https://app.lens.aisenhub.com/reset-password
```

因此 Supabase Auth 的允许 Redirect URLs 中要加入：

```text
https://app.lens.aisenhub.com/reset-password
```

如需要 Preview 环境测试 Auth，也需要按照你采用的 preview domain 策略增加允许的 preview redirect。

---

# 14. Vercel monorepo 构建策略

Vercel 支持同一个 Git repository 连接多个 Project。

最终：

```text
apps/webhome change
  → webhome deploy

apps/webapp change
  → webapp deploy

packages/shared change
  → affected projects deploy
```

当前仓库已经是标准 pnpm workspace：

```yaml
packages:
  - "apps/*"
  - "packages/*"
```

这非常适合 Vercel 的 monorepo affected-project detection。

建议两个 Project 都开启：

```text
Skip deployments when there are no changes to the project or its dependencies
```

这样以后只改教程时，不会重新部署 webapp。

---

# 15. 是否要引入 Turborepo

这次拆分 **不需要** 为了 Vercel 强行引入 Turborepo。

现在已经有：

- pnpm workspace
- package filter
- 独立 package scripts
- Vercel monorepo detection

足够完成两个独立部署。

未来出现：

- 3~5 个以上应用
- 大量共享 package
- CI build 很慢
- 想做 remote caching
- build dependency graph 越来越复杂

再考虑增加：

```text
turbo.json
```

即可。

不要把“拆分网站”与“引入新的 build orchestration 系统”绑定在同一个 PR。

---

# 16. 推荐的域名结构

推荐：

```text
https://lens.aisenhub.com
    → webhome

https://app.lens.aisenhub.com
    → webapp
```

优点：

- AisenLens 品牌主体仍然是 `lens.aisenhub.com`
- App 域名语义明确
- SEO 全部集中 home
- Web App 可以独立部署
- 后续桌面端与 webapp 对齐

---

## 不建议

### 方案 A

```text
lens.aisenhub.com/app
```

再代理到另一个 Vercel Project。

虽然可以做到，但是：

- assets base path 更复杂
- rewrite 规则更复杂
- preview 更复杂
- 两个 Project 实际上又通过一个入口耦合
- 以后桌面端测试的 Web App URL 与 production path 不一致

除非必须保留同 origin IndexedDB，否则长期不建议。

---

### 方案 B

两个完全独立 Git repo。

会失去：

- workspace dependency
- 原子提交
- desktop/webapp 联动修改
- scene-engine 本地 workspace
- pnpm lockfile 一致性

目前没有必要。

---

# 17. `webapp` 为桌面版做的额外边界设计

如果你明确希望未来“Web App 直接打桌面版”，建议从这次拆分开始坚持：

```text
webapp 不直接知道 Electron
webapp 不直接知道 Capacitor
```

而是：

```text
webapp
  ↓
platform adapter interface
  ↓
Browser / Electron / Capacitor
```

例如以后如果需要：

- 文件选择
- 保存路径
- 原生菜单
- 文件系统
- 自动更新
- GPU / native codec

都通过：

```text
platform/
```

或：

```text
services/platform/
```

抽象。

React 页面不要写：

```ts
if (window.electron) ...
```

到处散落。

---

## 17.1 Electron 只做 shell

理想结构：

```text
apps/desktop
├─ main
├─ preload
└─ packaging

apps/webapp
└─ 所有产品 UI / workflow
```

Electron 不复制：

- 项目库
- 编辑器
- Timeline
- 分镜
- 分析页

这和当前架构方向一致，只是把 renderer 从 `web` 正式更名成 `webapp`。

---

# 18. 建议修改的文件清单

至少检查以下位置。

## Root

```text
package.json
pnpm-workspace.yaml
README.md
AGENTS.md
```

`pnpm-workspace.yaml` 本身已经匹配：

```text
apps/*
```

因此目录改成 `webhome` / `webapp` 后通常不需要修改 packages glob。

---

## Scripts

```text
scripts/verify-web.mjs
scripts/prerender-public-routes.mjs
scripts/verify-scene-engine-web-build.mjs
scripts/verify-scene-engine-web-preview.mjs
scripts/*
```

搜索所有：

```text
apps/web
@aisenlens/web
```

逐一判断改成：

```text
apps/webapp
@aisenlens/webapp
```

还是：

```text
apps/webhome
@aisenlens/webhome
```

不要简单全局替换。

---

## Desktop

```text
apps/desktop/package.json
apps/desktop/src/main.ts
apps/desktop/*
```

---

## Mobile

```text
apps/mobile/package.json
apps/mobile/capacitor.config.ts
```

---

## Docs

```text
docs/PROJECT_ARCHITECTURE.md
docs/OPERATIONS.md
docs/SEO_DISCOVERABILITY_PLAN.md
docs/*
```

当前架构文档仍定义：

```text
apps/web = 唯一 UI 与业务实现
```

拆分后这条规则必须改成：

```text
apps/webapp = 唯一产品 UI / 业务 renderer
apps/webhome = 独立公开内容站
```

另外当前 `PROJECT_ARCHITECTURE.md` 中记录的 IndexedDB database version 已落后于代码；实施拆分时建议一起刷新这类事实性基线。

---

# 19. 推荐 package 命名

```text
apps/webhome/package.json
"name": "@aisenlens/webhome"

apps/webapp/package.json
"name": "@aisenlens/webapp"
```

Desktop：

```text
"name": "@aisenlens/desktop"
```

Mobile：

```text
"name": "@aisenlens/mobile"
```

Scene Engine：

```text
"name": "@aisenlens/scene-engine"
```

不要继续保留一个语义模糊的：

```text
@aisenlens/web
```

否则以后脚本很容易再次搞混“官网”还是“应用”。

---

# 20. 推荐本地开发命令

最终根 package scripts 建议提供：

```bash
pnpm dev:webhome
pnpm dev:webapp

pnpm build:webhome
pnpm build:webapp
pnpm build:web

pnpm verify:webhome
pnpm verify:webapp

pnpm dev:desktop
pnpm build:desktop
```

本地端口建议：

```text
webhome:  8442
webapp:   8443
```

或：

```text
webhome: 3000
webapp:  3001
```

关键是固定，不要两个 Vite 应用争同一个端口。

---

# 21. 推荐发布顺序

## Release 1 — 只改代码结构，不切 production

目标：

```text
apps/webapp
apps/webhome
```

全部本地运行。

此时：

- 当前线上网站不动
- 新 webapp 可用 preview 部署验证
- 完成 desktop build smoke
- 完成 IndexedDB migration 决策

---

## Release 2 — 部署 webapp

创建：

```text
aisenlens-webapp
```

先使用：

```text
xxxx.vercel.app
```

或临时：

```text
beta-app.lens.aisenhub.com
```

验证：

- 登录
- 新建项目
- 打开项目
- 视频导入
- 编辑
- 刷新
- deep link
- 自动分镜
- 导出
- reset password
- IndexedDB persistence

---

## Release 3 — 数据迁移窗口

如果存在旧线上项目：

1. 原网站增加“导出全部项目”提示。
2. 发布迁移说明。
3. 确认 backup / restore 完整。
4. 再切 editor domain。

---

## Release 4 — 当前 Vercel Project 切到 webhome

把当前 production Project 改为：

```text
apps/webhome
```

继续持有：

```text
lens.aisenhub.com
```

同时所有首页 CTA 指向：

```text
app.lens.aisenhub.com
```

---

## Release 5 — 清理 legacy

稳定一段版本后再删除：

- old `/app` marketing-domain route
- old `/projects` route
- 临时 migration UI
- old `@aisenlens/web`
- old path compatibility
- 过渡 redirect

不要在切域当天把 rollback 路径全部删掉。

---

# 22. Redirect 策略

生产切换以后，旧公开 domain 上原本的：

```text
/projects
/app
/reset-password
```

应做 redirect。

推荐：

```text
https://lens.aisenhub.com/projects
→ https://app.lens.aisenhub.com/projects

https://lens.aisenhub.com/app?project=xxx
→ https://app.lens.aisenhub.com/app?project=xxx

https://lens.aisenhub.com/reset-password
→ https://app.lens.aisenhub.com/reset-password
```

注意：

`/app?project=...` 的 query string 必须保留。

但 IndexedDB 不会因为 redirect 自动迁移，这和 URL redirect 是两个完全不同的问题。

---

# 23. SEO 调整

### webhome

继续负责：

- canonical
- sitemap
- robots
- OpenGraph
- Twitter metadata
- structured data
- prerender

当前：

```ts
SITE_URL = "https://lens.aisenhub.com"
```

可以保持不变。

---

### webapp

建议：

```text
noindex
```

不要让搜索引擎把：

```text
/projects
/app
/reset-password
```

作为 SEO 页面。

如果 webapp 有 `robots.txt`，建议明确：

```text
User-agent: *
Disallow: /
```

---

# 24. 性能收益应该怎么看

这次拆分最大的价值不是单纯：

> “首页 JS 少几 KB”。

而是：

### 发布隔离

教程改动不会重新发 webapp。

### 依赖隔离

webhome 不需要：

- mediabunny
- scene-engine
- auto-shot
- editor
- IndexedDB repository

### 故障隔离

webhome 内容构建失败，不等于产品 App renderer 有问题。

### 缓存隔离

两个域名拥有独立静态资源版本与 CDN cache。

### 桌面端隔离

Electron 不会再把：

- Landing Page
- Tutorials
- Glossary
- Changelog
- SEO content

打进安装包。

### 安全边界更明确

公开站不需要产品级 Auth / Project 数据权限。

---

# 25. 验收标准

## webhome

- [ ] 首页正常
- [ ] Feature 页面正常
- [ ] Tutorials 正常
- [ ] Glossary 正常
- [ ] Changelog 正常
- [ ] Terms / Privacy 正常
- [ ] sitemap 正确
- [ ] canonical 全部指向 `lens.aisenhub.com`
- [ ] 页面源码包含 prerender 内容
- [ ] 不包含 Scene Engine bundle
- [ ] 不包含 mediabunny
- [ ] 不初始化 IndexedDB project database
- [ ] “进入应用”跳转到 webapp
- [ ] Vercel 独立 preview 正常

---

## webapp

- [ ] `/` redirect `/projects`
- [ ] `/projects` refresh 不 404
- [ ] `/app` refresh 不 404
- [ ] `/reset-password` refresh 不 404
- [ ] Auth 正常
- [ ] Project CRUD 正常
- [ ] IndexedDB 正常
- [ ] Video import 正常
- [ ] Timeline 正常
- [ ] Auto Shot 正常
- [ ] Export 正常
- [ ] Web Worker / WASM 正常
- [ ] 返回官网链接正常
- [ ] robots / noindex 正确
- [ ] Vercel 独立 preview 正常

---

## Desktop

- [ ] build renderer 指向 `@aisenlens/webapp`
- [ ] package 只打包 `webapp/dist`
- [ ] Electron loadFile 正常
- [ ] 没有 webhome 资源被打进 desktop
- [ ] production build smoke 正常

---

## Mobile

- [ ] Capacitor `webDir` 指向 `../webapp/dist`
- [ ] Android sync 正常
- [ ] iOS sync 正常

---

# 26. Rollback 设计

上线前保留：

```text
旧 production deployment
```

如果 webhome 切换异常：

Vercel 直接 rollback 到旧 deployment。

如果 webapp 异常：

- 不切 CTA
- 不切 custom domain
- current site 继续使用旧 editor
- 修复后再迁

这也是为什么强烈建议：

> **先让 webapp 独立部署成功，再修改当前 production webhome。**

不要同一个操作里：

```text
改代码
+ 改目录
+ 新 Vercel Project
+ 切域名
+ 删旧 editor
```

一起完成。

---

# 27. 推荐提交序列

建议拆成多个可 review 的 commit / PR。

### Commit 1

```text
refactor: rename web renderer to webapp
```

只做：

- `apps/web` → `apps/webapp`
- package name
- root scripts
- desktop/mobile references
- tests/scripts path references

功能不变。

---

### Commit 2

```text
feat: add standalone webhome app
```

加入：

- Landing
- Tutorials
- Glossary
- Changelog
- Terms
- Privacy
- public SEO shell

---

### Commit 3

```text
refactor: remove public marketing routes from webapp
```

让 webapp 只剩产品路由。

---

### Commit 4

```text
build: split webhome and webapp verification
```

加入：

- verify:webhome
- verify:webapp
- prerender:webhome

---

### Commit 5

```text
deploy: add webapp Vercel SPA configuration
```

加入：

```text
apps/webapp/vercel.json
```

和环境配置文档。

---

### Commit 6

```text
docs: document webhome webapp deployment boundaries
```

更新：

- README
- PROJECT_ARCHITECTURE
- OPERATIONS
- deployment docs

---

# 28. 最终推荐状态

最终不要再把 AisenLens 理解为：

```text
一个 web app + 两个 shell
```

而应该变成：

```text
AisenLens Monorepo

Public Web:
  apps/webhome
  → marketing
  → tutorials
  → glossary
  → SEO
  → Vercel

Product Renderer:
  apps/webapp
  → projects
  → editor
  → analysis
  → local data
  → Web / Electron / Capacitor

Platform Shells:
  apps/desktop
  apps/mobile

Core Engine:
  packages/scene-engine
```

也就是：

```text
           ┌─────────────── webhome ────────────────┐
           │      Website / SEO / Tutorials         │
           └─────────────────────────────────────────┘

                           AisenLens

           ┌─────────────── webapp ─────────────────┐
           │ Project / Editor / Analysis / Export   │
           └──────┬──────────────┬──────────────┬───┘
                  │              │              │
                Web          Electron       Capacitor
```

这是目前 AisenLens 最自然、风险最低、同时最利于未来桌面化的拆法。

---

# 29. Vercel 配置速查

## Webhome

```text
Repository:
aisenhub/aisenlens

Root Directory:
apps/webhome

Framework:
Vite

Build:
pnpm build

Output:
dist

Domain:
lens.aisenhub.com
```

## Webapp

```text
Repository:
aisenhub/aisenlens

Root Directory:
apps/webapp

Framework:
Vite

Build:
pnpm build

Output:
dist

Domain:
app.lens.aisenhub.com
```

## Webapp Env

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_PLATFORM_API_URL
VITE_PLATFORM_PUBLIC_API_URL
VITE_WEBHOME_URL
```

## Webhome Env

```text
VITE_WEBAPP_URL
```

## Webapp `vercel.json`

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

---

# 30. 审查依据

仓库关键文件：

```text
README.md
package.json
pnpm-workspace.yaml
apps/web/package.json
apps/web/src/app/App.tsx
apps/web/src/app/AppPages.tsx
apps/web/src/features/marketing/seo/siteMetadata.ts
apps/web/src/features/project/services/projectRepository.ts
apps/web/src/services/auth/auth.ts
apps/web/src/services/auth/client.ts
apps/web/vite.config.ts
apps/desktop/package.json
apps/desktop/src/main.ts
apps/mobile/package.json
apps/mobile/capacitor.config.ts
scripts/prerender-public-routes.mjs
scripts/verify-web.mjs
docs/PROJECT_ARCHITECTURE.md
```

Vercel 文档：

- Monorepos: https://vercel.com/docs/monorepos
- Configure a Build: https://vercel.com/docs/builds/configure-a-build
- Vite on Vercel: https://vercel.com/docs/frameworks/frontend/vite
- `vercel.json`: https://vercel.com/docs/project-configuration/vercel-json
- Rewrites: https://vercel.com/docs/routing/rewrites

---

## 一句话实施原则

> **先把“产品 renderer”从现有 `apps/web` 稳定地变成 `apps/webapp`，再抽出轻量 `webhome`；先上线并验证新的 `webapp`，最后才让当前 Vercel Project 与 `lens.aisenhub.com` 切到 `webhome`。域名切换前必须先处理 IndexedDB origin 迁移问题。**
