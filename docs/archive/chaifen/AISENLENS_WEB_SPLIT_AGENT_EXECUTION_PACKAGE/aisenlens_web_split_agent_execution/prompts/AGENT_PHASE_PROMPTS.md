# 可直接复制给 Agent 的阶段提示词

> 版本注记（2026-09-14）：Phase 0–4 已执行完成；Phase 5 已确认
> `PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`；两个生产域名已完成 HTTP、标题和 robots
> 只读核查。以下提示词保留为可复用的阶段流程，不能覆盖当前事实。当前代码没有 Auth、登录、
> 密码重置、Support 或 Feedback 路由；相关步骤只有在未来明确启用后才恢复。

## 通用前缀

每次都把这一段放在最前：

```text
你正在修改 aisenhub/aisenlens。

先读取并遵守：
- AGENTS.md
- README.md
- docs/PROJECT_ARCHITECTURE.md
- docs/OPERATIONS.md
- 本阶段执行文档

保护现有用户修改。不要 reset、不要清空 IndexedDB、不要改 UI 设计、不要换技术栈、不要顺手升级依赖。
只执行当前阶段；当前阶段 Exit Gate 全部通过后停止，不自动进入下一阶段。
完成时给出：
1. 修改文件
2. 执行命令与结果
3. Exit Gate checklist
4. 遗留风险
5. 建议 commit message
```

---

## Phase 0 Prompt

```text
执行 phases/PHASE_0_BASELINE.md。

这是只读/验证阶段。除非发现一个必须单独修复的 baseline blocker，否则不要修改代码。
重点输出：
- 当前 commit
- git status
- verify:web / build 基线
- apps/web 和 @aisenlens/web 的引用分类
- desktop/mobile renderer 绑定
- IndexedDB 数据库版本与 backup service
- Vercel live config 是否实际验证

完成后停止。
```

---

## Phase 1 Prompt

```text
执行 phases/PHASE_1_RENAME_TO_WEBAPP.md。

目标只有：
apps/web → apps/webapp
@aisenlens/web → @aisenlens/webapp
以及所有 renderer path / script / desktop / mobile / 文档引用的对应修复。

本阶段不得创建 webhome，不得删除任何 marketing/public route，不得改产品行为。
必须使用 git mv，并在结束前运行旧路径搜索和 release gate。

Exit Gate 通过后停止。
```

---

## Phase 2 Prompt

```text
执行 phases/PHASE_2_CREATE_WEBHOME.md。

创建独立 @aisenlens/webhome。
从 webapp 复制公开页面和 marketing/SEO source closure，但此阶段先不要从 webapp 删除它们。
webhome 不允许引入 editor/project/auto-shot/media/export/scene-engine/mediabunny/Supabase Auth。

建立 VITE_WEBAPP_URL 跨站边界，完成 webhome 独立 typecheck/lint/build/prerender。
保持现有官网视觉与内容，不做 redesign。

Exit Gate 通过后停止。
```

---

## Phase 3 Prompt

```text
执行 phases/PHASE_3_SEPARATE_BOUNDARIES.md。

现在从 webapp 删除 public marketing ownership，只保留 product routes。
webapp / 重定向 /projects。
webapp 建立 VITE_WEBHOME_URL。
webapp 必须 noindex + SPA rewrite。
webhome 与 webapp 之间只能通过 URL 边界导航。

不要重写 router architecture；以最小修改保持现有产品行为。
完成双站本地 smoke 和 boundary search。

Exit Gate 通过后停止。
```

---

## Phase 4 Prompt

```text
执行 phases/PHASE_4_VERIFICATION_AND_PLATFORM.md。

拆分 verify:webapp / verify:webhome，新增 verify:web-boundaries。
不得降低原 webapp 产品测试覆盖。
验证 Electron 只打包 webapp/dist，Capacitor 只同步 webapp/dist；这两个壳的验证不是当前 Web
交付的阻塞门。
更新 README、AGENTS、PROJECT_ARCHITECTURE、OPERATIONS 和相关 SEO 文档，使其与双应用实际一致。

Exit Gate 全 PASS 后停止，不做 Vercel production mutation。
```

---

## Phase 5 Prompt

```text
执行 phases/PHASE_5_DEPLOYMENT_AND_MIGRATION.md。

目标是 Preview/Staging 验证和 Production cutover 准备，不执行未经授权的 production domain/DNS/Supabase mutation。
如果你有 Vercel 工具，可以创建/检查 Preview project；如果没有，生成精确配置并标记未验证项。

最重要的是把 PRODUCTION_LOCAL_PROJECTS 明确为：
NONE_CONFIRMED / MIGRATION_REQUIRED / UNKNOWN。

UNKNOWN 时必须停止。
MIGRATION_REQUIRED 时必须 rehearsal backup/restore，绝对不要做自动跨 origin 数据搬运，也不要清空 IndexedDB。

Exit Gate 通过后停止。
```

---

## Phase 6 Prompt

```text
执行 phases/PHASE_6_PRODUCTION_CUTOVER.md 和 checklists/CUTOVER_RUNBOOK.md。

这是 production 操作阶段；当前线上域名已经可达，剩余工作是补齐完整产品 smoke 和 rollback
deployment anchor，不要把可达性检查误标为全部完成。
每一个 custom domain、Vercel production project、Supabase production Auth 配置修改都只在我明确授权后执行。

顺序必须是：
1. webapp production 可用
2. 如未来启用 Auth，再准备 Supabase redirect；当前为 N/A
3. app.lens.aisenhub.com 可用
4. local data Gate 满足
5. lens.aisenhub.com 切 webhome
6. old app route redirects
7. SEO/product smoke
8. 记录 rollback anchor

不要当天删除 compatibility。
完成后停止。
```
