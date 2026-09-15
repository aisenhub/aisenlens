# 01 — 契约冻结、Marker v2 与持久化安全

> 计划状态：功能验收完成；Git 交付未授权/未执行
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标与第一阶段闭环

本阶段先解决所有后续阶段都会依赖的数据和结构契约，并交付第一个真实功能闭环。以下当前数据转换要求仅在 §5.0 判定适用时执行；无当前数据时改验新库初始化并记录不适用依据：

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

## 5. Marker 契约与当前数据升级边界

### 5.0 升级决策先于转换实现

本次文档修订授权更新计划，不等同于执行数据库转换。实施时先记录当前 v17 记录、Recovery snapshot 是否存在及保留范围；只核实必要元数据，不把用户内容写入日志。

- 有实际当前数据需要保留：为本次 Marker schema 变更设计一次性 v17→v18 转换，覆盖主 store 与 snapshot。
- 没有当前数据：验证全新 v18 初始化；不为假设性历史格式新增 converter/fallback。将下面升级专项标为“不适用”，并记录检查范围和依据，不能标“通过”。
- 测试 fixture 用于验证已决定支持的转换，不作为真实用户数据存在的证据。
- 不读取生产旧格式、不提供通用多版本兼容层；不以删除数据库或清空用户数据跳过升级。
- 若实际数据保留需求与有效项目规范仍冲突，记录具体冲突和最小决定；不自行扩大转换范围。
- 下文 v18/v4 是当前基线对应的目标版本，若实施前 schema 已前进，应重新核实版本，不能覆盖既有升级。



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

当 5.0 确认需保留当前数据时，升级 transaction 必须遍历 recovery snapshot：

```text
snapshot.markers[]
```

同样转换为 v2。

如果某个 snapshot 结构异常：

- 不能清整个数据库。
- migration 需要明确失败或按仓库现有 defensive policy 做可诊断处理。
- 默认中止升级事务，保留原数据库与快照并报告可诊断错误；不得跳过异常记录继续假装升级成功。实施前核对当前 defensive policy，任何差异须先写清数据保留影响。

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

1. `shotIds.length > 0`，不重复，记录属于当前 project。
2. 所有 shotId 必须真实存在。
3. `shotIds` 按项目 Shot 顺序组成连续范围；引用镜头时间范围也必须可可靠解析，不把非连续、缺失成员直接压成首尾范围。
4. 同 kind overlap → invalid。
5. 不同 kind：
   - 若没有 overlap → 合法。
   - 若有 overlap → rank 高的结构必须完整包含 rank 低的结构。
6. lower level 可以没有 parent。
7. 同一个 project 可以只有 Scene、只有 Sequence、或只含 Section + Shot。
8. `ignoreGroupId` 编辑场景继续支持。
9. validation 失败返回具体 reason，不抛通用错误吞掉上下文。

### 6.1 时间与候选状态校验

- frame 使用安全整数；Marker 位于 `[0,totalFrames)`，范围满足 `0 <= startFrame < endFrame <= totalFrames`。
- 帧率/媒体时长不可用时禁止正式时间编辑；UI 秒、ResearchRange 微秒通过显式 adapter 转换，记录取整和夹取规则。
- 同项目 Shot 顺序以正式时间顺序为准；全部受影响记录先形成候选集合，再对候选集合校验，不对部分新/部分旧状态逐项提交。
- 已损坏结构允许查看和显式修复，不自动清空原始 shotIds。未知或缺失引用保留作诊断，不推断可靠范围。

### 6.2 Shot / Structure 生命周期契约

Phase 03 实现前必须以测试固定以下结果，并检查现有 `reconcileShotGroups` 的实际职责：

| 操作 | 结构结果 | 分析结果 |
|---|---|---|
| Shot split | 新左右 Shot 继承所有包含原 Shot 的结构成员关系 | 受影响研究目标按已有 shot 映射规则处理；范围变化标复核 |
| Shot shared-boundary move | 保持成员 ID，重新推导时间范围并校验 | 受影响 Group/Shot 分析标 needsReview |
| Shot merge | 若两 Shot 所属各层结构集合一致，替换成员并校验；跨结构切点则拒绝，先显式调整结构 | 不丢弃被合并目标上的研究内容 |
| Auto-shot replace | 仅使用经验证的旧新 Shot 映射；无可靠映射保留原结构引用并标 needs-review | 禁止按序号猜测重绑定；保留原研究上下文并标待复核 |
| Group split/merge/move/delete | 遵循 Phase 03 身份与引用影响表 | 同一历史快照与保存边界处理 |

如既有协调函数会把无法解析的成员变为空数组，必须定向修改并验证，不能直接复用后声称数据保留完成。无效旧结构不能阻塞完全无关的合法编辑：校验当前操作及其关联闭包，不新增损坏；保留并报告原有 issues。

### 6.3 引用影响契约

领域结构命令除 `groups/affectedGroupIds`，还应提供创建、移除、范围变化及 ID 映射等类型化 change set。由现有编辑器/Research 服务组合应用，不让 Group 服务直接访问 Research 仓库。

- 先核对 ResearchContext、Workflow/Session target、历史快照、Recovery 和 Backup 的现有链路。
- Group 删除后的研究保留为可查看的待复核上下文，需有真实入口；不得被孤立查询永久隐藏。
- 所需引用处理与 groups 在同一逻辑操作中撤销；如现有事务/快照未包含必要数据，先补齐再开放结构命令。
- 只在原子完整状态就绪后 commit；失败不得产生部分正式数据。
- 不新增未经需要的 ResearchTarget kind 或 parent tree。

## 7. 具体实施步骤

按依赖执行：

1. 先完成 5.0 升级决策及 6.1–6.3 生命周期核对；新增/更新纯测试固定需要的 converter 与 hierarchy invariants。
2. 修改 `annotation/types.ts`。
3. 仅在 5.0 判定需要时实现当前 v17 Marker → v2 的一次性纯 converter。
4. 根据 5.0 决策接入 v18 初始化/升级；需要保留当前数据时接入 converter：
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
19. `git diff --check`；任务授权提交/推送时再审 staged diff、commit/push 并核远端。

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
corepack pnpm build
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

### 数据库打开与升级专项

复用现有 onblocked/onversionchange 处理，真实验证：

- 全新数据库初始化。
- 其他标签页阻塞升级时提示、关闭连接后重试。
- 升级事务在主 store 或 snapshot 转换途中 abort 后，旧数据完整且可再次升级。
- 异常 snapshot 不被跳过或删除。
- 当前转换不适用时记录依据；备份 v4 round-trip、save/recovery 仍必测。

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
- 新库初始化通过；如 §5.0 需要当前数据转换，同时覆盖主 store + recovery snapshot，否则记录不适用依据。
- Backup v4 完成。
- Structure hierarchy validator 含 Section。
- Targeted/data/UI checks 实际执行。
- typecheck/lint/build 实际执行。
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。
- 若已获推送授权并执行，核实 remote branch；否则记未授权/未执行。
- verification record 填写实际 SHA/命令/结果。

交给 Phase 02：

- 可稳定使用的 Marker v2。
- DB v18。
- 通用 structure validation。
- 一个明确的临时技术债：Marker 仍暂时由 TimelineRuler 展示，Phase 02 必须移出。
