# 04 — Marker Scope、结构上下文与 Inspector 聚合

> 计划状态：功能验收完成；Git 交付未授权/未执行
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标

在 Phase 01/02 已完成“Marker v2 + 独立 Marker Track”的基础上，把 Marker 完整升级为跨层级观察系统：

- scope：`free / film / section / sequence / scene / shot`。
- `frame` 始终是唯一真实时间锚点。
- Section / Sequence / Scene / Shot context 全部按 frame 推导。
- Marker Track 支持压缩模式与按 scope 展开模式。
- Scene / Sequence / Section Inspector 自动聚合范围内 Marker。
- 结构边界变化时 Marker 自动换上下文，不重写 Marker record。
- M 创建保持轻量，不要求用户先选分类或层级。

## 2. 前置与必读

前置：

- Phase 01–03 功能验收完成，Git 状态独立记录。
- Marker 正式类型已经是 v2。
- Structure commands / validation 已稳定。
- Track Registry 已稳定。

必读：

- `00-master-plan.md`
- `01-contract-persistence.md`
- `03-structure-boundary-interactions.md`
- `verification-record.md`
- `AnnotationMarkerPanel.tsx`
- Phase 02 实际落地的 MarkerTrack 文件
- `ShotGroupInspector.tsx`
- `EditorWorkspace.tsx`
- `group/types.ts`
- `shot/types.ts`
- Timeline registry/preferences

## 3. 唯一 Structure Context Resolver

建议新增纯函数模块：

`features/group/services/structureContext.ts`

如果执行时已有完全等价 utility，则扩展现有文件，避免重复。

输入：

```ts
frame: number
shots: ShotRecord[] | timeline shot view model[]
groups: ShotGroupRecord[]
```

输出建议：

```ts
interface StructureContextAtFrame {
  shotId: string | null
  sceneId: string | null
  sequenceId: string | null
  sectionId: string | null
  issues?: string[]
}
```

### 3.1 时间规则

Shot：

```text
startFrame <= frame < endFrame
```

Group：

- 由 `shotIds` 映射首尾 Shot。
- group range 也是 `[startFrame,endFrame)`。
- 只返回真正包含 frame 的结构。

### 3.2 Ambiguity

正常数据在通用 validator 下同 kind 不应 overlap。

如果由于 legacy/损坏数据出现 ambiguity：

- resolver 不应靠 array order 随便选一个。
- 返回 issue/ambiguous 结果。
- UI 可以显示“结构需要复核”。
- 不自动改数据。

这个 resolver 将成为后续以下能力的**唯一上下文来源**：

- Marker context。
- Inspector 聚合。
- Breadcrumb。
- Navigation context。
- Future AI multi-scale context。

不要在四个组件分别重写一遍“find containing group”。

### 3.3 最小 Navigation Focus（本阶段先交付）

```ts
type TimelineNavigationFocus =
  | { kind: "film" }
  | { kind: "section" | "sequence" | "scene" | "shot"; id: string }
```

- 位于现有编辑器 UI 状态边界，不进入项目数据/backup/recovery。
- 本阶段提供可用“设为观察范围”入口；显式聚焦更新 focus，单击选中不改变 focus。
- 播放帧/activeShot 变化只更新播放上下文，不改变 focus。
- 路径由焦点范围推导，不依赖 playhead 恰好位于该结构。
- 合并/删除/undo 后按 Phase 03 change set 校验焦点，回最近有效上级或 film；切项目重置 film。
- Scope 默认只读此焦点；film focus 默认 free，film scope 用户显式选择。
- Phase 05 的双击/Enter 复用此状态和 setter，不能另建 navigation context。这样本阶段不依赖尚未实现的 Phase 05。

## 4. Marker 创建与编辑体验

### 4.1 M 快捷键

沿用已存在的 M。

推荐流程：

```text
M
→ 当前 frame 创建 draft editor
→ focus content
→ 用户输入
→ 明确保存
```

不要：

- 弹四分类选择。
- 强制先选 scope。
- 一按 M 就立刻保存空 Marker。

### 4.2 文本输入快捷键隔离

当前全局有 Enter = Split Shot。

Marker Textarea/Input 必须：

- 编辑 Enter 时不穿透到 global shortcut。
- 如果 Enter 是换行，则保存使用明确 UI action / Ctrl+Enter 等现有项目可接受模式。
- 不自行新增全局快捷键。
- Esc 取消 draft，阻止 Go Up。
- 输入中 M 不再创建第二个 Marker。

具体 key 细节可根据现有 shortcut hook 的 input guard 实现，但行为必须满足上述不变量。

### 4.3 Scope 默认

如果当前存在明确 navigation context：

- Section drill-down → default scope `section`
- Sequence → `sequence`
- Scene → `scene`
- Shot → `shot`

否则：

```text
scope = free
```

Film scope 由用户显式选择。

Scope 是 metadata，不要求与当前实际 structure context 一致。例如某个 `scope=film` Marker 当然可以落在 Scene 内。

## 5. Marker Track 压缩 / 展开

### 5.1 压缩模式

```text
Markers
────▲────────▲──────────▲────
```

行为：

- pin。
- selected state。
- hover content。
- click → select + seek。
- scope 可以通过 tooltip/辅助符号显示，但不能让颜色重新变成“四种类别”。

### 5.2 展开模式

```text
Film       ▲
Section          ▲
Sequence               ▲
Scene             ▲
Shot                          ▲
Free         ▲          ▲
```

注意：

- 展开只是 presentation。
- 仍然只有一套 Marker data。
- 不创建六个持久化 Track。
- expanded/collapsed 是 Timeline UI preference，不进入 project backup。

如果局部空间不足：

- 允许内部垂直滚动/最小高度。
- 不改变 Marker frame。

## 6. Inspector 聚合

Scene / Sequence / Section Inspector 增加 Marker section：

```text
Scene 18
────────────
Title
Summary
Shot 73–80

Markers · N
00:18:21  ...
00:18:34  ...
```

聚合标准：

```text
structure.startFrame <= marker.frame < structure.endFrame
```

不是：

```text
marker.scope === structure.kind
```

原因：一个 film-level Marker 仍然真实落在这个 Scene 的时间范围里。

显示：

- frame/timecode。
- content 摘要。
- scope 次要标签。
- 点击 → seek + select marker。

不要：

- 把 Marker id 存进 group。
- 移动结构边界时批量更新 Marker。

## 7. Marker 与结构变化

### Boundary move

结构范围改变：

```text
Marker record 不变
→ resolver 下次 render 得到新 context
```

因此：

- `marker.updatedAt` 不改。
- 不产生 Marker history entry。
- 不新增 Marker 专项写入；整状态 autosave 可能仍序列化 Marker，但值和 updatedAt 不变。

### 删除 Scene / Sequence / Section

- Marker 保留。
- 上下文自动回退到其他现存层。
- Scope metadata 不自动改；即使 `scope=scene` 但 Scene 被删，也可以显示“当前无对应 Scene context”，让用户决定是否改 scope。

### Shot split / merge

- frame 不动。
- Shot context 根据新 Shot ranges 重算。

## 8. Marker 与 Analysis Track 的界限

本阶段不创建 Emotion/Dialogue。

明确产品语义：

- Marker = “我注意到了什么”。
- Analysis Track = “某一分析维度在时间上形成怎样的结构”。

禁止：

- `scope=scene` 自动写 Scene summary。
- 看到“情绪”文字就自动转 Emotion。
- Marker 自动删除/消费。

Phase 08 可设计显式：

```text
从 Marker 创建分析项
```

但必须用户确认。

## 9. 持久化、撤销与状态

- scope 修改 → 1 history entry。
- content 修改 → 1 history entry。
- Inspector 聚合属于 derived read，不 dirty。
- expanded/collapsed Marker UI preference → localStorage，不进 project state。
- structure boundary move 只改变 groups，Marker derived context 自动更新。
- reload/recovery 只恢复 Marker v2，自行重新推导 context。
- save fail / stale 沿用既有 editor save state。

## 10. 空态 / 错误 / 禁用

- 无 Marker：压缩轨为空；Inspector 显示“该范围暂无标记”。
- invalid structure：Inspector 可聚合按实际合法 range；如果 range 本身不能可靠推导，显示 needs-review，不猜。
- scope 指向已不存在层级：Marker 仍正常存在。
- current frame 超出媒体合法范围：创建 handler clamp/拒绝遵循现有 playback frame policy。
- Marker content 空白：不可提交。
- save error：保留 dirty。

## 11. 建议新增测试

- `apps/webapp/test/structure-context.test.ts`
- `apps/webapp/test/marker-context.test.ts`
- `tests/features/timeline-semantic/marker-track.browser.test.js`

纯测试覆盖：

- frame 恰好等于 range start。
- frame 恰好等于 range end，应属于下一个 range/不属于前一个。
- 有 Section/Sequence/Scene 全层。
- 缺 Sequence。
- 只有 Scene。
- invalid overlap ambiguity。
- boundary move 后 context 改变。
- 删除 Scene 后 Marker 不丢。
- scope 与 context 不同仍合法。

Browser：

- M 创建。
- Textarea Enter 不 Split Shot。
- Esc 取消 draft。
- Scope 编辑。
- Marker Track expand/collapse。
- Scene Inspector 聚合。
- boundary move 后聚合自动变化。
- reload 后保留。

## 12. 已存在命令

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build
corepack pnpm test:editor-history
```

## 13. 完成门槛与交接

完成：

- `structureContext` 是唯一 derived context source。
- Marker scope 可真实修改。
- Expanded Marker Track 可用。
- Structure Inspector 聚合可用。
- 没有 marker parent/shotId 回流。
- 浏览器与单测真实执行。
- 功能验收状态与 Git 状态分别记录；仅在任务授权时 commit/push 并核远端。
- verification record 更新。

交给 Phase 05：

- 已可从 frame 得到稳定 structure context。
- 已有 scope-aware Marker presentation。
- 05 复用最小 focus/context，完成 viewport 改造和完整导航。
