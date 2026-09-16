# 03 — Scene / Sequence / Section Boundary First 结构编辑

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标

把结构编辑的主语言从：

```text
选择多个 Shot
→ 选择 kind
→ 创建 Group
```

升级为：

```text
在结构轨 / 合法 Shot 边界处
→ 创建结构 Boundary
→ 调整/合并/升级
```

要求：

- Scene / Sequence / Section 共用一套纯领域命令。
- selection create 保留为辅助，但委托同一命令。
- Generic Group 主入口退出。
- 所有正式操作可 undo/redo、autosave、reload。
- optional hierarchy 和 legacy sparse groups 不被强制重写。

## 2. 前置与必读

前置：

- Phase 01 / 02 已交付并 push。

必读：

- `00-master-plan.md` 中 Structure contract。
- `group/services/groupService.ts`
- `group/services/structureValidation.ts`
- `group/services/reconcileShotGroups.ts`
- `group/components/ShotGroupPanel.tsx`
- `ShotGroupInspector.tsx`
- `SceneBoard.tsx`
- `EditorWorkspace.tsx`
- `EditorTimeline.tsx`
- `StructureTimelineTrack.tsx`（Phase 02 若实际使用此命名）
- existing Shot boundary services
- `verification-record.md`

## 3. 唯一 Structure Command Layer

建议新增：

`features/group/services/structureCommands.ts`

React 不直接拼 `shotIds`。

至少暴露等价能力：

```ts
splitStructureAtBoundary(...)
moveStructureBoundary(...)
mergeAdjacentStructures(...)
promoteStructureBoundary(...)
demoteStructureBoundary(...)
createStructureFromSelection(...)
resolveStructureSpanAtBoundary(...)
```

统一结果：

```ts
type StructureCommandResult =
  | {
      ok: true
      groups: ShotGroupRecord[]
      affectedGroupIds: string[]
    }
  | {
      ok: false
      reason: string
    }
```

所有函数：

- 纯函数。
- 不 mutate input。
- 不写 repository。
- 成功后由 EditorWorkspace commit history + setShotGroups。
- 失败时不产生部分状态。

## 4. `resolveStructureSpanAtBoundary` 规则

为了兼容已有项目不能假设每一层已经完整铺满。

输入至少包括：

- kind
- afterShotId
- orderedShots
- existingGroups

算法：

1. 确认 `afterShotId` 是正式 Shot cut。
2. 找出该 cut 是否处于一个现有同 kind range 内。
3. 若处于 range 内：
   - split 该 range。
4. 若处于同 kind 未覆盖 gap：
   - 找 nearest containing higher-level context。
   - 如果没有 higher context，以 film shot span 为上限。
   - gap 范围再由左右最近 same-kind range 截断。
   - 只在 gap 中创建必要 range。
5. split 后任何一侧为空 → reject。
6. 结果跑统一 structure validation。

不得：

- 为了“完整 hierarchy”自动填满所有 gap。
- 覆盖用户已有标题/摘要。
- 偷偷修改别的 kind。

## 5. Boundary UI

### 5.1 Scene Boundary

主入口：

- hover Shot cut / Scene row 对齐位置。
- 出现轻量 add affordance。
- 点击创建 Scene boundary。
- boundary line 与 Visual cut 精确对齐。

### 5.2 Sequence Boundary

目标位置合法性：

- 当前 cut 已是 Scene boundary → 直接可添加/Promote Sequence。
- 项目没有 Scene → Shot boundary 合法。
- 项目有 Scene 且点在 Scene 内部：
  - UI 只能 snap 到最近合法 Scene boundary。
  - snap preview 可见。
  - 不允许静默先切 Scene 再切 Sequence。

### 5.3 Section Boundary

优先顺序：

```text
Sequence boundary
→ Scene boundary
→ Shot boundary
```

如果更低层完全不存在，允许直接使用更底层合法 cut。

## 6. Move Boundary

只对时间上相邻的同 kind ranges 提供共享 boundary drag。

完整状态机：

```text
pointerdown
→ 保存 original groups
→ 开始 dragPreview

pointermove
→ 找合法 snap target
→ 运行 validation preview
→ 只更新临时 preview

pointerup
→ 若合法:
     editorHistory.commit() 一次
     setShotGroups(next)
   若不合法:
     恢复 original

Esc / pointercancel
→ 恢复 original
→ 不 commit
→ 不触发正式 save
```

禁止：

- pointermove 每次 history commit。
- pointermove 触发 repository save。
- 组件直接写 Group record。

## 7. Split / Merge 身份与 metadata

### 7.1 Split

已有 range 被切成左右两段：

- 左段（包含原第一 Shot）保留原 ID。
- 右段新 ID。
- 左段 title / summary 保留。
- 右段生成同 kind 的默认标题；summary 空。
- 不批量重命名后续用户 title。

默认标题生成必须复用/抽出当前现有命名规则，不在每个组件复制。

### 7.2 Merge

只允许：

- 同 kind。
- 时间相邻。
- 合并后仍满足 higher/lower containment。

ID：

- 左侧保留。
- 右侧删除。

Metadata：

如果右侧 title/summary 都是自动空/default，可直接保留左。

如果左右都有明显用户内容：

- 必须出现明确确认 UI。
- 至少提供：
  - 保留左内容
  - 用右内容覆盖保留 ID
  - 取消
- 如果产品现有 Dialog 适合，可复用。
- 不 silent drop。

如果需要“合并两段摘要”的高级能力，不在本期自动拼文本；除非用户明确选择。

## 8. Promote / Demote

### Promote

“Scene boundary → Sequence boundary”定义：

- Scene boundary 保留。
- 在相同 `afterShotId` 对 Sequence layer 执行 add/split。
- **不是** `scene.kind = "sequence"`。

同理 Sequence → Section。

### Demote

“移除 Sequence boundary”：

- 合并该 boundary 两侧的 Sequence ranges。
- Scene boundary 不动。

如果合并会引发 metadata 冲突，走相同 merge confirmation。

必须为 Promote/Demote 写纯测试，防止以后误改为 kind mutation。

## 9. Structure Inspector 与产品命名

用户 UI 逐步退出：

- Group
- 分组
- 创建分组

显示：

- Scene / 场景
- Sequence / 序列
- Section / 段落/结构段（沿用已确定产品中文）

可复用一个 inspector，根据 kind 变标题/字段，不复制三套组件。

保留：

- title
- summary
- shot range
- validity reason

Phase 04 再加入范围内 Marker 聚合。

## 10. Selection Create 辅助入口

仍允许：

```text
框选连续 Shot
→ 创建 Scene / Sequence / Section
```

但必须调用：

```text
createStructureFromSelection
→ same validator
→ same identity/metadata rules
```

不允许：

- `createShotGroup` 自己一套 overlap。
- Boundary command 另一套 overlap。

如果保留 `createShotGroup` 名称作为 wrapper，只能内部委托新 command/validator，并在 Phase 06 决定是否删除旧 API。

## 11. 用户状态

### Empty

- 0 Shot：所有 structure create disabled，给真实原因。
- 1 Shot：可以形成单 Shot Scene/Sequence/Section，但没有内部 boundary 可 split。

### Invalid existing group

- 仍允许选择/查看。
- 编辑前显示 validity reason。
- 安全修复能力可以提供；不能 silent normalize 造成数据变化。

### Drag invalid

- snap/preview 显示 invalid。
- pointerup 不提交。

### Save failure / stale

- 使用 existing autosave / stale flow。
- 不手动回滚 UI 到旧 repository state 假装已保存。

### Undo/Redo

- 恢复 groups。
- selectedGroupId 若指向已不存在 group，要按现有 selection restore policy 清理/回退。
- Marker 不随结构 undo 被删除，只是 context 未来重算。

### Shot changes

Shot split/merge/calibration 后：

```text
existing reconcileShotGroups
→ generalized structure validation
→ invalid ranges needs-review or safe update
```

不能让新的 hierarchy logic 绕开现有 reconciliation。

## 12. 相邻模块影响

- Overview / Analyze / Learn 任何使用 `group` target 的功能继续使用同一 IDs。
- 不因 UI 改成 Scene/Sequence/Section 就更改 ResearchTarget `kind:"group"`，除非另有独立需求。
- Export 如果按 groups 输出，应继续兼容现有 record。
- SceneBoard 如果保留，应成为 semantic structure 的另一视图，不重复写规则。

## 13. 建议新增测试

- `apps/webapp/test/structure-commands.test.ts`
- `apps/webapp/test/structure-boundary-snap.test.ts`
- `tests/features/timeline-semantic/structure-boundary.browser.test.js`

纯测试至少覆盖：

- Scene split on Shot cut。
- Sequence 不能切 Scene。
- Section 不能切 Sequence。
- optional lower-level fallback。
- sparse group gap。
- same-kind overlap。
- move left/right。
- cancel drag。
- split ID rule。
- merge metadata。
- promote 保留下级 boundary。
- demote 保留下级 boundary。
- invalid command atomic。

Browser：

- 创建 Scene。
- 创建 Sequence。
- Promote。
- boundary drag。
- merge。
- undo/redo。
- reload。

浏览器 harness 优先复用仓库当前 Node + Chrome/Edge CDP 风格；不因本阶段引入 Playwright/Selenium，除非执行时仓库已正式采用。

## 14. 已存在命令

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build:webapp
corepack pnpm test:editor-history
corepack pnpm test:scene-calibration
```

新 test 文件存在后可直接 node --test。

## 15. 旧路径退出与完成门槛

Phase 03 完成后：

- Timeline 主入口不再要求“先选多个 Shot 创建 Group”。
- Product UI 不再以“分组”作为 Structure 主术语。
- selection create 只是辅助。
- Generic panel 不保存第二套数据。
- Structure rules 唯一来源。
- Boundary First end-to-end 可 undo/save/reload。
- tests/browser 真实运行。
- commit(s) push，远端确认。
- verification record 实际更新。

交给 Phase 04：

- 稳定结构 ranges。
- 稳定 boundary command。
- 可由 frame 可靠推导 Section/Sequence/Scene context 的前提。
