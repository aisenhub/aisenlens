# 03 — Scene / Sequence / Section Boundary First 结构编辑

> 计划状态：功能验收完成；Git 交付未授权/未执行
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

- Phase 01 / 02 功能验收完成。

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
resizeStructureEdge(...)
mergeAdjacentStructures(...)
deleteStructure(...)
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
      changes: StructureChangeSet // created/removed/rangeChanged/ID mapping；具体类型与 Phase 01 契约一致
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
- 成功后由编辑器组合 groups 与 Research 引用影响，完整候选状态一次 commit/history/save；不是只 setShotGroups。
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
- 目标 cut 未切穿任何 Scene → 可使用合法 Shot boundary，不受其他位置有无 Scene 影响。
- 目标 cut 在 Scene 内部：
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

如果目标位置没有对应低层覆盖，允许更底层合法 cut；先枚举合法位置，再按偏好及像素距离吸附。任何结果都不能切穿低层结构。

## 6. Move Boundary

时间上相邻的同 kind ranges 提供共享 boundary drag，原子修改左右两侧；孤立范围或与空白相邻的端点使用 start/end edge drag，仅修改该范围。两种操作共享候选校验和 preview 状态机。

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

不能从“标题看起来像默认名称”推断是否由用户编辑，当前记录没有可靠来源标记。

| 左 title/summary | 右 title/summary | 行为 |
|---|---|---|
| 均空 | 均空 | 可直接合并 |
| 非空 | 均空 | 保留左内容 |
| 均空 | 任一非空 | 显示预览，用户选择保留右内容/明确丢弃/取消 |
| 任一非空 | 任一非空 | 显示两侧预览，选择保留左/保留右/取消 |

只要可能丢弃右侧非空内容就必须明确选择，包括默认生成但非空的标题。不自动拼接摘要。ResearchContext 按 7.3 独立保留，不因选择保留左标题而删除右侧研究。

### 7.3 Research 与导航引用影响

| 结构操作 | ResearchContext | Workflow/Session/选择与导航 |
|---|---|---|
| split | 左 ID 保留但范围改变，原研究标 needsReview；不复制原结论到新右侧 | 原目标仍为左侧；新侧由用户明确选择 |
| move/edge resize | 所有实际范围改变的结构研究标 needsReview，记录原因 | ID 保留，范围由新状态推导 |
| merge | 左研究保留并标复核；右研究保持原 ID/target 为“目标已合并”的待复核记录，不自动并入左；显示可查看入口与合并后目标提示 | 指向被移除右侧的当前选择/Session 导航显式转到保留左侧 |
| delete | 研究保留为“目标已删除”的待复核记录，可查看和由用户另行处理 | 清除失效选择，导航回最近有效上级/Film |
| promote/demote | 按实际新增/合并的高层变化处理；低层研究仅在范围实际变化时标复核 | 不将低层 target.kind 改成其他类型 |

复用当前 Research 的 needsReview/reasons；如关联提示需要新字段，必须纳入 Phase 01 的 schema/backup/recovery 决策，不能临时存 localStorage。删除目标后仍可查看研究的入口与数据读取必须在本阶段完成。

Groups 与 Research 更新属于一个完整 EditorHistory 操作及原子保存；Undo/Redo 恢复研究内容、复核状态和有效引用。导航 UI 不单独制造数据 history，恢复数据后重新校验焦点。测试需检查持久化内容，不能只检查 selectedGroupId。

### 7.4 共享层级边界规则

| 操作 | 第一期开关与结果 |
|---|---|
| 移动未被其他层约束的边界 | 候选包含合法即可提交 |
| 移动低层与高层共用切点 | 若单独移动会跨高层则禁用并说明“与上级结构共用边界”；不暗中移动上级 |
| 移动高层边界 | 只吸附不切穿低层的合法位置 |
| 删除低层共享边界 | 合并低层若会跨高层则拒绝；用户先显式调整高层 |
| 删除高层共享边界 / Demote | 保留低层边界，合并高层并走元数据与引用流程 |
| 跨层一起移动 | 本期不开放；未来如需加入必须显式命令、完整 preview、一次撤销 |

不能让非法 handle 仅在 pointerup 才解释失败；提前给禁用或合法目标 preview。

### 7.5 稀疏结构和辅助选择规则

| 状态 | 创建/调整结果 |
|---|---|
| 完整覆盖 | 内部 split、共享 boundary move、相邻 merge |
| 局部覆盖 | 只在所在 gap 创建；受最近包含高层和左右同层范围截断 |
| 孤立范围 | start/end edge 可在合法 Shot cut 上扩缩，不自动创建邻居 |
| 范围与空白相邻 | edge resize 只改变当前范围，不填满其余空白 |
| 选择精确等于已有同层范围 | 复用并选中已有 ID，0 history entry |
| 选择完全未覆盖的连续 Shot | 创建所选范围，经统一层级校验 |
| 选择在现有同层范围内部或部分交叠 | 拒绝并说明使用 Split/Move；不隐式拆分、覆盖或丢元数据 |

gap 中首次插入内部边界生成左右两个非空范围；只填该解析出的 gap，不填全项目其他 gap。gap 的端点或已有边界点击是选择/no-op，不生成空范围。首尾端点通过 edge ref（groupId + start/end）表达，不用 afterShotId 伪造影片起点。

拖动期间冻结所用 Shot/Group revision；Undo、切项目或其他正式编辑导致 revision 变化时取消 preview，禁止提交基于旧状态的候选；无位移 pointerup 为 no-op。

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
Phase 01 定义的 Shot change set / 映射
→ 保留原引用或显式更新成员
→ 对完整候选集合校验
→ groups + Research 影响原子提交
```

不能绕开协调边界，也不能假设既有 reconciliation 已满足新需求。Shot split 继承成员、跨结构 Shot merge 拒绝、自动分镜无可靠映射保留引用并标复核，都必须在本阶段完成测试。

## 12. 相邻模块影响

- Overview / Analyze / Learn 的 `group` target 保留类型；被合并/删除的 ID 按 7.3 处理，不能宣称所有 ID 都保持不变。
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
- 共享层级边界阻止/允许矩阵。
- 孤立端点扩缩、局部缺层 fallback、选区 no-op/reject。
- 左空右非空 metadata 与默认非空标题。
- Group 生命周期后 Research 可查看、needsReview、backup/recovery/undo。
- Shot split 继承成员、跨结构 merge、auto-shot 无映射。
- 拖动中 revision 改变取消、无位移不产生 history。

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
corepack pnpm build
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
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。
- verification record 实际更新。

交给 Phase 04：

- 稳定结构 ranges。
- 稳定 boundary command。
- 可由 frame 可靠推导 Section/Sequence/Scene context 的前提。
