# Agent Operating Rules

> 当前执行注记（2026-09-14）：本文是拆分过程的通用规则。当前代码拆分已完成，站点所有者
> 已确认没有生产项目数据，`PRODUCTION_LOCAL_PROJECTS = NONE_CONFIRMED`；生产域名可达但完整
> 产品 smoke 和 rollback anchor 仍待补证。当前用户已明确授权本任务自动提交并推送文档到
> `main`，但 Vercel/DNS/Supabase 等外部生产配置仍不因本条授权自动变更。

## A. 硬约束

执行本计划时：

```text
不要重写应用。
不要改变 UI 设计。
不要换 React/Vite/Tailwind/pnpm 技术栈。
不要引入 Turborepo。
不要顺手升级依赖。
不要删除用户数据。
不要清空 IndexedDB。
不要重写已应用的 Supabase migration。
不要把 service-role/private key 放入前端。
不要在一个 Phase 中执行后续 Phase 的工作。
```

目标是：

> Same product behavior, explicit deployment boundaries.

## B. 先读仓库规则

每次 Agent 会话开始都要重新读取：

```text
AGENTS.md
README.md
docs/PROJECT_ARCHITECTURE.md
docs/OPERATIONS.md
当前 Phase 文档
```

如果仓库规则已经因为前一 Phase 改名，则以最新版本为准。

## C. 保护工作区

开始前执行：

```bash
git status --short
git branch --show-current
git rev-parse HEAD
```

如果存在未提交修改：

1. 不覆盖。
2. 不 reset。
3. 不 checkout -- 文件。
4. 先识别是否属于用户正在进行的工作。
5. 无法安全区分时停止当前 Phase，并报告。

## D. 搜索优先

移动目录后禁止凭记忆改引用。

至少运行：

```bash
git grep -n "apps/web"
git grep -n "@aisenlens/web"
git grep -n "../web/dist"
git grep -n "web/dist"
```

并根据 Phase 再执行专门搜索。

若 `git grep` 因文件已移动找不到旧路径，仍应搜索 Git tracked text。

## E. 不做盲目全局替换

以下引用不能全部机械替换：

```text
apps/web
@aisenlens/web
```

因为拆分完成后，有些引用应该成为：

```text
apps/webapp
```

有些应该成为：

```text
apps/webhome
```

每个引用必须根据职责判断。

## F. 每阶段验证

Agent 必须记录：

```text
command
exit code
PASS / FAIL
```

失败时：

- 先修复当前 Phase 引入的问题。
- 不用跳过 lint/typecheck 来“通过”。
- 不新增 `any`、`@ts-ignore`、禁用规则来规避错误，除非原项目已有明确同类规范且有理由。

## G. Commit Discipline

每阶段完成后：

```bash
git diff --check
git status --short
git diff --stat
```

Agent 输出建议 commit message；默认不主动 push / merge / deploy production。若当前用户明确授权
仓库提交/推送，则可按用户授权执行；这不等同于授权 Vercel、DNS 或 Supabase 的外部生产变更。

## H. External Mutation Gate

以下行为必须单独报告并等待授权：

```text
Vercel production project configuration mutation
Custom domain mutation
Supabase production Auth settings mutation
DNS mutation
Production branch merge
删除 legacy migration path
```

Preview deployment 可以在明确授权或现有自动 Preview 流程中执行。

## I. 用户数据优先级

如果“代码结构更干净”和“用户本地项目可恢复”冲突：

> 用户项目可恢复优先。

严禁用：

```text
indexedDB.deleteDatabase(...)
localStorage.clear()
浏览器存储清理
```

作为修复手段。

## J. Stop Conditions

出现以下情况应停止当前 Phase：

```text
基线本身无法通过 release gate，且失败与当前改动无关
发现未记录的第二套 Web renderer
旧域名存在真实用户项目，但没有可验证备份路径
Vercel 当前生产配置与计划假设明显不同
Supabase redirect / auth 流程无法在 Preview 验证
移动目录导致无法解释的大范围业务行为变化
```

停止不是失败。输出事实、风险和下一步最小修复建议即可。
