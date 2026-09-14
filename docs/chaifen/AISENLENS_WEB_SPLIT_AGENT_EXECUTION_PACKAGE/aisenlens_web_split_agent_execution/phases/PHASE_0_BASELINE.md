# Phase 0 — Baseline、保护现场、引用盘点

## Goal

不修改产品结构。建立可复现基线，确认后续拆分的真实影响面。

## Entry Conditions

```text
仓库 = aisenhub/aisenlens
当前工作树可安全操作
已阅读 AGENTS.md
```

## Tasks

### 0.1 记录 Git 基线

```bash
git status --short
git branch --show-current
git rev-parse HEAD
git log -1 --oneline
```

把结果写入 Agent 最终报告，不创建无必要的 repo 文件。

### 0.2 安装依赖

```bash
corepack pnpm install
```

不得切换 package manager。

### 0.3 运行当前 release baseline

优先：

```bash
corepack pnpm verify:web
```

然后：

```bash
corepack pnpm build
```

如果 `verify:web` 已包含 build，仍记录其结果；不必重复昂贵测试，除非需确认根 `build` 行为。

### 0.4 检查 Desktop 当前绑定

读取：

```text
apps/desktop/package.json
apps/desktop/src/main.ts
```

确认：

```text
@aisenlens/web
../web/dist
../../web/dist
```

的现状。

### 0.5 检查 Mobile 当前绑定

读取：

```text
apps/mobile/package.json
apps/mobile/capacitor.config.ts
```

确认：

```text
@aisenlens/web
../web/dist
```

的现状。

### 0.6 生成旧路径引用清单

执行：

```bash
git grep -n "apps/web" -- ':!pnpm-lock.yaml'
git grep -n "@aisenlens/web" -- ':!pnpm-lock.yaml'
git grep -n "web/dist"
git grep -n "prerender-public-routes"
git grep -n "verify:web"
```

分类：

```text
A. 应改为 webapp
B. 应改为 webhome
C. Phase 2/3 才能决定
D. docs only
```

### 0.7 公开路由盘点

核对当前至少存在：

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

产品路由：

```text
/projects
/app
/reset-password
/support
/feedback
```

### 0.8 数据风险盘点

确认代码中：

```text
IndexedDB name = aisenlens-projects
DATABASE_VERSION
projectBackupService
project restore/import path
```

只记录，不改 schema。

### 0.9 Vercel 生产假设检查

确认当前 repo 文档写明的旧模式：

```text
Root Directory = repository root / empty
Build = @aisenlens/web
Output = apps/web/dist
```

如果 Agent 能读 Vercel 项目配置，则对比真实配置。
如果不能，只在报告中标记：

```text
VERCEL_LIVE_CONFIG = NOT_VERIFIED
```

不要猜。

## Files Modified

Phase 0 默认：

```text
NONE
```

如果必须修复一个“拆分前就存在的 blocker”，应另开独立提交，不混入 Phase 1。

## Verification

必须获得：

```text
baseline build result
baseline verify result
old path reference inventory
data migration risk confirmed
```

## Exit Gate

PASS 条件：

```text
[ ] 工作区安全
[ ] 当前 build 状态已知
[ ] 当前 verify 状态已知
[ ] apps/web 引用已分类
[ ] Desktop/Mobile renderer 绑定已确认
[ ] IndexedDB origin 风险已确认
```

失败则停止。

## Agent Output Template

```text
Phase 0: PASS / FAIL
Baseline commit:
Working tree:
verify:web:
build:
References requiring webapp:
References requiring webhome:
Unknown references:
IndexedDB version:
Vercel live config verified?: YES/NO
Blockers:
```
