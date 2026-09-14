# AisenLens Web 拆分总控执行计划

> 当前状态（2026-09-14）：Phase 0–4 的代码拆分与本地 release gate 已完成；Phase 5
> 的数据决策为 `PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`，不执行历史数据迁移；公开站
> `https://lens.aisenhub.com` 与产品站 `https://app.lens.aisenhub.com` 已通过 HTTP、标题和
> robots 只读核查。完整浏览器产品 smoke、可回滚 production deployment anchor 和稳定窗口
> 清理仍未完成，因此本文 Definition of Done 尚未全部满足。
>
> 本文保留拆分前的架构推导作为执行依据。当前代码范围不包含 Auth、登录、密码重置、Support
> 或 Feedback；这些路线只作为原始方案中的条件分支保留。

## 1. Architecture Decision

本次不是“拆两个 Git 仓库”，而是在现有 pnpm monorepo 内建立两个独立 Web 应用：

```text
GitHub repository
aisenhub/aisenlens
│
├─ apps/webhome
│   └─ content / marketing / SEO
│
├─ apps/webapp
│   └─ product renderer
│       ├─ browser
│       ├─ Electron
│       └─ Capacitor
│
├─ apps/desktop
├─ apps/mobile
└─ packages/scene-engine
```

选择 `apps/web → apps/webapp` 的原因：

1. 当前绝大多数复杂业务已经在 `apps/web`。
2. Electron 当前直接打包 `apps/web/dist`。
3. Capacitor 当前直接同步 `apps/web/dist`。
4. Scene Engine、mediabunny、IndexedDB、编辑器测试全部绑定当前 Web renderer。
5. 先改名再迁公开页面，比把整个产品代码搬到一个新目录风险更低。

## 2. Desired Ownership

### `webhome`

只负责公开、内容型、可索引页面：

```text
/
/features/*
/tutorials
/tutorials/*
/glossary
/changelog
/terms
/privacy
```

允许：

```text
Marketing UI
SEO metadata
Prerender
Sitemap
Robots
公开静态资源
教程 / 文档内容
```

禁止：

```text
IndexedDB project repository
Scene Engine
mediabunny
Editor
Auto Shot
Project CRUD
Supabase Auth（第一阶段）
Electron / Capacitor 平台逻辑
```

### `webapp`

负责当前产品运行：

```text
/
/projects
/app
```

`/` 最终重定向 `/projects`。

原始方案还列出的 `/reset-password`、`/support`、`/feedback` 以及 Auth/User Center
均未进入当前代码范围，不应从本计划中恢复。

拥有：

```text
Project
IndexedDB
Editor
Media
Timeline
Analysis
Auto Shot
Export
Scene Engine
Platform adapters
```

禁止继续承担：

```text
SEO Tutorial
Glossary
Marketing landing
Public sitemap
Public prerender
```

## 3. Dependency Direction

最终依赖应满足：

```text
webhome ──X──> webapp source

webapp ──X──> webhome source

desktop ─────> webapp build
mobile  ─────> webapp build

webapp ──────> packages/scene-engine
webhome ──X──> packages/scene-engine
```

跨站连接只允许通过 URL：

```text
webhome:
VITE_WEBAPP_URL

webapp:
VITE_WEBHOME_URL
```

## 4. Phase Dependency

```text
P0
└─ baseline clean
   ↓
P1
└─ renderer rename complete
   ↓
P2
└─ independent webhome builds
   ↓
P3
└─ source boundary complete
   ↓
P4
└─ verification gates complete
   ↓
P5
└─ preview + migration decision
   ↓
P6
└─ production cutover
```

## 5. Atomicity Rule

每一个 Phase 都必须满足：

```text
开始前：
git status 清楚
预期前置条件成立

执行中：
只做当前 Phase 范围
不顺手做无关 refactor

结束前：
typecheck
lint
test（按阶段）
build
git diff review

输出：
变更文件列表
执行命令结果
遗留问题
Exit Gate PASS/FAIL
```

建议一个 Phase 对应一个 PR 或最少一个独立 commit。

## 6. Recommended Commit Series

```text
1. refactor: rename web renderer to webapp
2. feat: add standalone webhome app
3. refactor: separate public and product routes
4. build: split web verification and enforce boundaries
5. deploy: configure independent webhome and webapp deployments
6. docs: finalize split architecture and cutover runbook
```

不要 squash 成一个难以回滚的大提交，除非最后合并策略强制要求。

## 7. Production Safety

Production 操作与代码改造分离。

代码 Agent 可以自动完成：

```text
目录拆分
import 修复
脚本修改
build/test
vercel.json
env example
文档
```

以下操作必须进入明确 Gate：

```text
修改现有 Production Vercel Project
绑定/移除 custom domain
修改 Supabase production redirect allow-list
决定是否需要线上 IndexedDB 迁移窗口
删除 legacy 路由 / migration UI
```

如果 Agent 拥有 Vercel/Supabase 工具，也不能跳过 Gate。

## 8. Data Migration Decision

必须回答：

```text
线上 lens.aisenhub.com 是否已有需要保留的真实本地项目？
```

如果 YES：

```text
先在旧 origin 保持 editor 可运行
→ 提供/验证项目备份导出
→ 明确迁移窗口
→ 新 webapp 验证导入
→ 再切域
```

如果 NO：

```text
记录确认依据
→ 可跳过用户迁移窗口
→ 仍然不得清空旧 IndexedDB
```

## 9. Definition of Done

只有同时满足以下条件，拆分才算完成：

```text
webhome 可独立 build / preview / deploy
webapp 可独立 build / preview / deploy
webhome 不包含产品重依赖
webapp 不包含 marketing 内容
desktop 打包 webapp/dist
mobile 同步 webapp/dist
所有原产品流程无回归
公开 SEO 仍工作
webapp deep-link 不 404
如未来启用 Auth，Supabase reset redirect 指向 app domain；当前无 Auth 时记为 N/A
Production local data 风险已处理
README / AGENTS / architecture / operations 已更新
```

当前已满足或已记录：双应用构建边界、产品/公开站职责、Webhome SEO/noindex 规则、数据决策和
线上域名可达性。当前仍未满足：完整产品浏览器流程、线上 Worker/WASM smoke、回滚 deployment
anchor，以及 Desktop/Mobile 专项验证（后者不属于当前 Web 阻塞门）。
