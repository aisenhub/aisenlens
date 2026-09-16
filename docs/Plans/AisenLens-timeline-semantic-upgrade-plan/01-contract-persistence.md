# 01 — 契约冻结、Marker v2 与持久化安全

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标与第一阶段闭环

本阶段先解决所有后续阶段都会依赖的数据和结构契约，并交付第一个真实功能闭环：

- Marker 从四分类模型升级为 `frame + content + scope`。
- IndexedDB v17 → v18 有明确、可验证的数据升级。
- Recovery snapshot 中的 Marker 同步迁移。
- Backup schema v3 → v4。
- Marker 创建、编辑、删除、undo/redo、autosave、reload 在新模型上完整闭环。
- Scene / Sequence 专用校验升级为 Section / Sequence / Scene 通用结构不变量。

本阶段**不能只改 TypeScript 类型或静态界面**。完成门要求真实证明：

```text
v17 Marker
→ DB upgrade
→ 新 Marker UI
→ edit/delete
→ undo/redo
→ autosave
→ reload
→ recovery / backup contract
```

Timeline 轨道布局暂不大改；独立 Marker Track 在 Phase 02 实施。

## 2. 前置条件与必读

开始前按顺序读取：

1. 根 `AGENTS.md`
2. `docs/architecture/PROJECT_ARCHITECTURE.md`
3. `docs/development/DEVELOPMENT_GUIDE.md`
4. 本目录 `00-master-plan.md`
5. `reference-AisenLens-时间轴优化架构方案.md`
6. `verification-record.md`
7. `.agents/skills/impeccable/SKILL.md`；如果实际改 Marker panel 的信息层级，再读最少必要 reference，不扫描整个 skill 目录。

执行前按 `agent-handoff.md` 核实 Git。

## 3. 已核实的相关文件与调用链

### 3.1 Marker

已存在：

- `apps/webapp/src/features/annotation/types.ts`
- `apps/webapp/src/features/annotation/components/AnnotationMarkerPanel.tsx`
- `apps/webapp/src/features/annotation/services/annotationService.ts`
- `apps/webapp/src/features/editor/components/EditorWorkspace.tsx`
- `apps/webapp/src/features/timeline/components/TimelineRuler.tsx`

真实调用链：

```text
AnnotationMarkerPanel / shortcut M
→ EditorWorkspace setAnnotationMarkers
→ editorHistory.commit()
→ useEditorPersistence
→ saveProjectEditorState
→ IndexedDB annotation-markers
```

现有 Shot split 会根据 `marker.shotId` 重新绑定 Marker。新模型移除 `shotId` 后，这段重绑逻辑必须退出；Marker 的 `frame` 保持不动。

### 3.2 Persistence / Recovery / Backup

已核实：

- `apps/webapp/src/features/project/services/projectRepository.ts`
- `apps/webapp/src/features/project/services/projectBackupService.ts`
- `apps/webapp/src/features/project/services/projectRecoveryService.ts`
- `apps/webapp/src/features/project/types.ts`
- `apps/webapp/src/features/editor/hooks/useEditorHistory.ts`
- `apps/webapp/src/features/editor/hooks/useEditorPersistence.ts`
- `apps/webapp/src/features/editor/hooks/useEditorSaveState.ts`

当前 repository：

- DB version 17。
- `annotation-markers` store 已按 `projectId` 和 `[projectId, frame]` 索引。
- `ProjectEditorState` 和 `ProjectRecoverySnapshot` 均含 Marker。
- `saveProjectEditorState` 已有统一 transaction 与 `expectedUpdatedAt`。

### 3.3 Structure

已存在：

- `group/types.ts`
- `group/services/groupService.ts`
- `group/services/structureValidation.ts`
- `group/services/reconcileShotGroups.ts`

当前缺口：

- Section 层没有完整 containment 校验。
- 当前 validator 没有把“shotIds 连续性”作为统一 invariant 的显式输入条件。
- 规则还是 Scene / Sequence 特判，后续容易继续堆 if。

## 4. 需要修改与建议新增的文件

### 4.1 必须修改

#### `features/annotation/types.ts`

改为 Marker v2：

```ts
export const annotationMarkerScopes = [
  "free",
  "film",
  "section",
  "sequence",
  "scene",
  "shot",
] as const

export type AnnotationMarkerScope =
  (typeof annotationMarkerScopes)[number]

export interface AnnotationMarker {
  id: string
  projectId: string
  frame: number
  content: string
  scope: AnnotationMarkerScope
  createdAt: string
  updatedAt: string
}
```

删除正式运行时：

- `AnnotationMarkerCategory`
- `annotationMarkerCategories`
- category
- label
- note
- shotId

#### `AnnotationMarkerPanel.tsx`

- 四个 category 创建按钮 → 单一“添加标记”。
- 编辑表单 → `content`。
- 支持多行内容。
- scope 本阶段只需有合法默认/最基础编辑；复杂 scope UX 在 Phase 04。
- 空 content 不得提交。

#### `EditorWorkspace.tsx`

- Marker create/update/delete 改为新模型。
- 删除 `visibleMarkerCategories` state 与 toggle。
- 删除 Shot split 后 `marker.shotId` 重绑逻辑。
- M shortcut handler 创建自由 Marker。
- History snapshot 继续包含 markers。

#### `TimelineRuler.tsx`

本阶段只是**临时兼容**：

- 使用新 Marker。
- 不再按 category 过滤/着色。
- 不再使用 activeShotId。
- 用统一中性/主题样式显示。
- 注明 Phase 02 会彻底把 Marker 移出 Ruler，避免把这里再演化成正式 Marker Track。

#### `projectRepository.ts`

- `DATABASE_VERSION = 18`。
- `onupgradeneeded` 执行 v17 → v18 Marker migration。
- 同步迁移 recovery snapshot 内嵌 Marker。
- read/write type 更新。

#### `projectBackupService.ts`

- `VERSION = 4`。
- manifest validate 使用 Marker v2。
- import 不再 remap `shotId`。
- export 不再写旧 Marker 字段。

#### `project/types.ts`

核对：

- `ProjectRecoverySnapshot`
- `ProjectEditorState`
- `ProjectRepository`

不新增第二套 Marker type。

#### `group/services/structureValidation.ts`

把 Scene/Sequence 特判改成可扩展 hierarchy validation。

#### `group/services/groupService.ts`

如 validator 需要 shot chronological order，调用侧明确传入 ordered Shot IDs；不能让 validator 猜顺序。

### 4.2 建议新增（当前并不存在）

- `apps/webapp/test/annotation-marker-v2.test.ts`
- `apps/webapp/test/structure-validation.test.ts`
- `apps/webapp/test/project-repository-marker-upgrade.test.ts`

如 DB upgrade、backup import、runtime validation 确实都需要同一纯转换函数，再新增：

- `features/annotation/services/normalizeAnnotationMarker.ts`

如果只有 repository upgrade 使用，不要为了形式造抽象层。

## 5. 冻结 Marker 契约

### 5.1 正式模型

唯一正式模型是 Marker v2。

禁止以下“过渡方案”进入运行时：

```text
category = "custom"
label/note + content 双写
保留 shotId 继续同步
scope 存具体 sceneId / shotId
```

### 5.2 数据迁移

v17 → v18 converter：

```text
trimmedLabel = trim(label)
trimmedNote = trim(note)

if label && note:
  content = label + "\n" + note
else if label:
  content = label
else if note:
  content = note
else:
  content = legacy category 中文名
```

设置：

```text
scope = "free"
```

删除旧字段。

必须保留：

- id
- projectId
- frame
- createdAt
- updatedAt

### 5.3 Recovery snapshot

Recovery snapshot 是正式用户恢复能力，不允许只迁移主 Marker store。

升级 transaction 必须遍历 recovery snapshot：

```text
snapshot.markers[]
```

同样转换为 v2。

如果某个 snapshot 结构异常：

- 不能清整个数据库。
- migration 需要明确失败或按仓库现有 defensive policy 做可诊断处理。
- 具体行为由执行时当前 repository upgrade 风格决定，并在 verification record 写证据。

### 5.4 Backup v4

新 validate 至少检查：

- id/projectId 为有效 string。
- frame 为合法整数且 >=0。
- content 为 string，保存前 trim 后不能是空白。
- scope 属于枚举。
- timestamps 合法性遵循当前项目其他 record 校验风格。

当前项目政策不要求长期 v3 fallback；若执行前发现真实业务要求恢复现存 v3 外部备份，先记录为 blocker 并请用户决定是否做一次性 converter。

## 6. 冻结 Structure Validation 契约

定义 rank：

```text
scene = 1
sequence = 2
section = 3
```

validator 输入必须能获得项目 Shot chronological order。

要求：

1. `shotIds.length > 0`。
2. 所有 shotId 必须真实存在。
3. `shotIds` 按项目 Shot 顺序组成连续范围。
4. 同 kind overlap → invalid。
5. 不同 kind：
   - 若没有 overlap → 合法。
   - 若有 overlap → rank 高的结构必须完整包含 rank 低的结构。
6. lower level 可以没有 parent。
7. 同一个 project 可以只有 Scene、只有 Sequence、或只含 Section + Shot。
8. `ignoreGroupId` 编辑场景继续支持。
9. validation 失败返回具体 reason，不抛通用错误吞掉上下文。

## 7. 具体实施步骤

按依赖执行：

1. 先新增/更新纯单元测试，把 Marker converter 与 hierarchy invariants 固定。
2. 修改 `annotation/types.ts`。
3. 实现 v17 legacy Marker → v2 的纯 converter。
4. 把 converter 接入 IndexedDB v18 upgrade：
   - marker store cursor
   - recovery snapshot cursor
5. 更新 repository read/write type。
6. 更新 backup v4 export/validate/import。
7. 修改 `AnnotationMarkerPanel`：
   - 单一创建入口
   - content 编辑
   - 空内容拦截
8. 修改 M shortcut 文案与 handler。
9. 删除 `visibleMarkerCategories`、category toggle、marker colors。
10. 删除 Shot split 中 Marker shotId rebind。
11. 临时适配 Ruler。
12. 通用化 structure validation + tests。
13. 跑 targeted test。
14. 跑 typecheck/lint/build。
15. 做真实浏览器 Marker workflow。
16. 做 migration/recovery/backup 专项。
17. 实施完成后更新当前架构文档中的 DB version / Marker 模型。
18. 更新 verification record。
19. `git diff --check`、审 staged diff、commit、push、核远端。

## 8. 用户操作与状态

### 正常

```text
M
→ 创建 draft
→ 输入内容
→ 保存
→ Marker 出现在当前临时 Ruler 表示
→ autosave
→ reload 后仍存在
```

### 空态

- 没有 Marker 时显示“尚未创建标记”。
- 只有一个真实“添加标记”入口。
- 不再显示四种类别按钮。

### 编辑

- 进入编辑时保留旧 content。
- 保存 → 1 history entry。
- 取消 → 0 history entry。

### 删除

- 删除 → 1 history entry。
- Undo 恢复。
- Redo 再删除。

### 加载

- 沿用现有 editor load。
- v18 upgrade 成功后再进入运行时。

### 失败

- save fail：内存状态不能静默丢失或假装保存。
- stale expectedUpdatedAt：使用现有 stale 处理。
- DB upgrade fail：不能自动 deleteDatabase。
- backup validate fail：明确错误，不能部分导入。

### Shot split/merge

Marker frame 不变；不再做 shotId 修正。

## 9. 并发、撤销、恢复与保留规则

- Marker create/update/delete 必须在 `editorHistory.commit()` 后按现有模式修改 state。
- undo/redo 继续由 EditorHistorySnapshot 恢复。
- autosave 继续由既有 persistence 监听 state。
- 不增加 marker service 直接 save 的 UI 路径作为第二套写入链。
- Recovery snapshot 保留 Marker v2。
- Backup v4 round-trip 保留 Marker v2。
- Analysis `EvidenceRef.kind="marker"` 只引用 markerId，预期无需数据迁移，但必须 typecheck/analysis regression。

## 10. 旧路径如何退出

Phase 01 完成后，通过 `rg` 确认正式运行时不再存在：

- `AnnotationMarkerCategory`
- `annotationMarkerCategories`
- `visibleMarkerCategories`
- `marker.category`
- `marker.shotId`
- `marker.label`
- `marker.note`

允许旧字段只出现在：

- `LegacyAnnotationMarkerV17` migration type
- migration tests/fixtures

不得被 UI/service 正式引用。

## 11. 测试与实际命令

### 已核实存在的命令

从仓库根：

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build:webapp
corepack pnpm test:editor-history
corepack pnpm verify:web-boundaries
```

### 本阶段建议新增的 targeted tests

以下命令只有对应 test 文件实际新增后才可运行：

```powershell
cd apps/webapp
node --experimental-strip-types --test test/annotation-marker-v2.test.ts
node --experimental-strip-types --test test/structure-validation.test.ts
node --experimental-strip-types --test test/project-repository-marker-upgrade.test.ts
```

不得在 verification record 预填“通过”。

### 浏览器验收

真实操作至少覆盖：

1. 从 v17 fixture/测试数据库升级。
2. 打开 Marker panel。
3. M 创建 Marker。
4. 编辑多行内容。
5. 删除 → undo → redo。
6. Split Shot 后 Marker frame 不漂移。
7. reload 后 Marker 存在。
8. 触发既有 repository fault injection 或同等级可控 save failure，确认不虚假保存。
9. Recovery snapshot 创建/恢复。
10. Backup v4 export/import round-trip。

## 12. 阶段完成门槛与交接

完成门：

- Marker 正式模型只剩 v2。
- DB v18 migration 覆盖主 store + recovery snapshot。
- Backup v4 完成。
- Structure hierarchy validator 含 Section。
- Targeted/data/UI checks 实际执行。
- typecheck/lint/build 实际执行。
- stage code commit(s) 已 push。
- remote branch 已核实。
- verification record 填写实际 SHA/命令/结果。

交给 Phase 02：

- 可稳定使用的 Marker v2。
- DB v18。
- 通用 structure validation。
- 一个明确的临时技术债：Marker 仍暂时由 TimelineRuler 展示，Phase 02 必须移出。
