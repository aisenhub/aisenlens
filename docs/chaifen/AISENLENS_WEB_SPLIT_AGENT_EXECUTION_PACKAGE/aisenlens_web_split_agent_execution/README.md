# AisenLens `webhome` / `webapp` Agent 执行包

> 仓库：`aisenhub/aisenlens`  
> 目标分支基线：`main`  
> 方案日期：2026-09-14  
> 用途：直接交给代码 Agent，按阶段完成 AisenLens 官网与产品 Web App 的拆分。

## 最终目标

```text
apps/
├─ webhome/       # 官网 / SEO / 教程 / 术语 / 更新日志 / 协议
├─ webapp/        # 项目库 / 编辑器 / Auth / 本地项目 / 分析 / 导出
├─ desktop/       # Electron，只消费 webapp/dist
└─ mobile/        # Capacitor，只消费 webapp/dist

packages/
└─ scene-engine/  # 继续只作为产品 renderer 的底层能力
```

部署目标：

```text
lens.aisenhub.com
    → Vercel Project: webhome
    → apps/webhome

app.lens.aisenhub.com
    → Vercel Project: webapp
    → apps/webapp
```

## Agent 必须按此顺序执行

```text
Phase 0  基线、保护现场、依赖与引用盘点
   ↓
Phase 1  apps/web → apps/webapp（只改名和引用，功能不变）
   ↓
Phase 2  新建独立 apps/webhome，迁出公开页面
   ↓
Phase 3  清理 webapp 的公开站责任，建立跨站 URL 边界
   ↓
Phase 4  拆分验证、构建门、依赖边界、Desktop/Mobile smoke
   ↓
Phase 5  Preview / Vercel / Supabase / IndexedDB 迁移准备
   ↓
Phase 6  Production Cutover、Redirect、监控、Legacy 清理
```

**禁止跳阶段。** 每个 Phase 都有 Exit Gate。Exit Gate 没通过，不得执行下一阶段。

## 建议使用方式

把本目录整体放到仓库外或 `docs/plans/` 下供 Agent 阅读，然后先向 Agent 提交：

```text
阅读 README.md、02_AGENT_OPERATING_RULES.md 和 phases/PHASE_0_BASELINE.md。
只执行 Phase 0。完成后停止，给我验证结果和发现的问题，不要自动进入 Phase 1。
```

每阶段均提供了独立 Prompt，见：

```text
prompts/AGENT_PHASE_PROMPTS.md
```

## 文件说明

```text
00_MASTER_EXECUTION_PLAN.md
    总体技术路线、依赖关系、最终架构、上线策略。

02_AGENT_OPERATING_RULES.md
    Agent 的硬约束、工作方式、停止条件。

phases/
    Phase 0–6 的逐步执行任务。

checklists/FILE_CHANGE_MAP.md
    预计需要检查/修改的文件和搜索关键字。

checklists/ACCEPTANCE_MATRIX.md
    Webhome / Webapp / Desktop / Mobile / Deployment 验收矩阵。

checklists/CUTOVER_RUNBOOK.md
    正式切域时按顺序勾选的操作表。

prompts/AGENT_PHASE_PROMPTS.md
    可直接复制给 Agent 的每阶段提示词。

TASK_GRAPH.yaml
    阶段依赖、Gate 和主要输出的机器友好任务图。

reference/
    原始拆分方案，供 Agent 查阅背景。
```

## 最重要的风险

当前 AisenLens 项目工作数据位于浏览器 IndexedDB：

```text
database: aisenlens-projects
```

浏览器存储按 origin 隔离。

因此：

```text
https://lens.aisenhub.com
```

和：

```text
https://app.lens.aisenhub.com
```

看见的是两套不同的 IndexedDB。

**Production 域名切换前，必须显式完成“是否存在真实线上本地项目数据”的决策 Gate。**
严禁通过清空 IndexedDB 来“解决”迁移问题。
