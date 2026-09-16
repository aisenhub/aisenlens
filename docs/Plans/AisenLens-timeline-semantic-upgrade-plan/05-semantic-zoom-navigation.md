# 05 — Semantic Zoom、Macro Structure 与层级导航

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标

让时间轴真正随着观察尺度改变信息密度，并让 `Section → Sequence → Scene → Shot` 成为导航系统，而不是四行静态矩形。

交付：

- 五级 Semantic Zoom。
- Shot+Frame 信息降级/升级。
- Marker 随尺度聚合/展开。
- Macro Structure（Section+Sequence）折叠。
- 双击 Zoom to Range。
- Structure focus Enter Drill Down。
- Esc Go Up，且不破坏局部 cancel。
- Breadcrumb。
- 缺层级时自然跳层。

## 2. 前置

Phase 01–04 已交付并 push。

必读：

- Phase 02 Track Registry。
- Phase 04 `structureContext`。
- `useTimelineViewport.ts`
- `TimelineRuler.tsx`
- Visual/Structure/Marker Track 实际代码。
- `editor/shortcuts/*`
- verification record。

## 3. Semantic Zoom 单一 resolver

建议新增：

`features/timeline/semanticZoom.ts`

纯函数：

```ts
type SemanticZoomLevel =
  | "film"
  | "sequence"
  | "scene"
  | "shot"
  | "frame-detail"

resolveSemanticZoomLevel(pixelsPerSecond)
```

初始 threshold 直接复用当前 Ruler 已存在的 pps 分界：

| level | pixelsPerSecond | 重点 |
|---|---:|---|
| film | `<20` | Section / Sequence / Scene 宏观 |
| sequence | `20–<48` | Sequence / Scene / Shot |
| scene | `48–<100` | Scene / Visual / Marker |
| shot | `100–<240` | Shot / Frame / Marker 细节 |
| frame-detail | `>=240` | 更密 Frame / boundary / 微观信息 |

所有 track 用同一 resolver。

禁止：

- Visual 自己 60px 切换。
- Marker 自己 75px 切换。
- Structure 再有一套不一致 threshold。

如果真实浏览器观察后需要调阈值，只改此一处并记录理由。

## 4. Visual Track 信息降级

### 4.1 Film level

目标：

- Shot 不再每个都显示完整文字。
- Cut/shot density 形成节奏纹理。
- 不让 500 Shot label 挤成噪声。
- FrameThumbnailStrip 按已有采样/visible range 工作，不创建每 frame node。

### 4.2 Sequence level

- 显示 Shot boundary。
- 可显示 Shot ordinal。
- 有空间时显示极简信息。

### 4.3 Scene level

- Shot ordinal。
- duration。
- Frame thumbnail。
- active/completeness/filter state。

### 4.4 Shot level

可显示：

- Shot ordinal。
- duration。
- 已有真实 analysis summary 中适合的简要字段。

架构示例里出现的 `MCU`/景别只有项目真实字段存在时才显示，不能假造。

### 4.5 Frame-detail

- 更密 thumbnail sampling。
- Cut handle 更易操作。
- 不代表“每个原始视频帧都生成 DOM”。

### Label 降级

目标逻辑：

```text
Shot 23 · [真实简要信息] · 4.2s
→ 23 · [真实简要]
→ 23
→ boundary only
```

根据可用空间/semantic level 渐进，不用单一硬编码字符串一直 overflow。

## 5. Marker Semantic Zoom

不能简单“远景隐藏小 scope Marker”，否则用户会误以为数据消失。

建议：

### film

- film/section/sequence scope 可 individual。
- scene/shot/free 大量 Marker → cluster/count。
- Header/cluster 明确表示还有 N 个局部 Marker。

### sequence

- 加入 Scene individual。
- shot/free 视密度 cluster。

### scene

- Scene/Shot/Free 大部分 individual。
- 极高密度仍 cluster。

### shot/frame-detail

- 所有相关 Marker individual。

Cluster 是 presentation：

- 不创建 cluster record。
- 点击 cluster → zoom/展开该范围。
- Marker data 不改。

如 Phase 05 发现 cluster 实现成本过高，最低可接受方案是：
- low zoom 使用密度计数/stacked pin；
- 明确显示隐藏/聚合数量；
不能完全 silent hide。

## 6. Macro Structure Collapse

把：

```text
Section
Sequence
```

作为 Macro Structure UI group。

collapsed：

- 不显示两条完整 body。
- 保留一个轻量 header/summary，表明有宏观结构并可展开。
- Scene / Visual / Marker / Audio 不动。

expanded：

- 恢复 registry 高度。

状态：

- 属于 local Timeline preference。
- 不写 ProjectRecord。
- 不进 backup/recovery。

## 7. Zoom to Range

扩展现有 `useTimelineViewport`，不要另写第二套 scroll math。

建议新增等价 API：

```ts
fitRange(
  startSeconds: number,
  endSeconds: number,
  options?: { paddingPx?: number }
)
```

要求：

- target range 尽量完整可见。
- clamp media duration。
- 极短 range 不超过 viewport max zoom。
- 计算依赖实际 container width。
- 默认不改变 currentTime；如果双击现有产品语义必须 seek，则明确统一，不在每 kind 不同。

双击 Section/Sequence/Scene 调用同一 API。

## 8. Drill Down / Go Up

### Mouse

- single click：select。
- double click：select + fitRange + navigation context。

### Keyboard Enter

结构 range DOM focus：

```text
Section → nearest existing lower:
  Sequence
  else Scene
  else Shot

Sequence → Scene
  else Shot

Scene → Shot
```

必须：

```js
preventDefault()
stopPropagation()
```

确保不触发 global Shot split。

无 structure focus：

- global Enter 继续 `shot.splitAtPlayhead`。

### Esc 优先级

1. Marker draft / text edit / dialog / boundary drag / other local interaction → cancel。
2. 无 local cancel 且存在 navigation context → Go Up。
3. 无 context → existing interaction.cancel behavior。

不能把 Esc 全局改成“永远 Go Up”。

## 9. Breadcrumb

目标：

```text
Section 2 › Sequence 5 › Scene 18 › Shot 73
```

来源：

- navigation context。
- `structureContextAtFrame`。
- 实际 selected/active Shot。

不使用 parentId。

规则：

- 缺层级直接跳过。
- 点击某一级 → select + fit range。
- 当前 range 被删除后 → 向最近仍存在的上级/当前 frame context 收敛，不保留 dangling id。
- UI 位置优先复用当前 Editor/Timeline header，避免创建重复导航栏。

## 10. Visual Weight 与高度

Registry default：

- Section 22。
- Sequence 24。
- Scene 28。
- Visual 72。

Semantic Zoom：

- 不能自动改写用户保存的 track height。
- 可以调整 row 内 label、opacity、summary、density。
- 不能因为全片 zoom 就永久把 Scene height 写回 localStorage。

## 11. 空态与异常

- 没 Section：breadcrumb 不显示 Section。
- 没 Sequence：Section Drill Down 可直接 Scene。
- 没 Scene：Sequence Drill Down 可直接 Shot。
- 只有 Shot：Semantic Zoom 仍工作。
- invalid structure：double click 可 fit 实际可推导 range，但 breadcrumb 标记 needs-review；不能猜 parent。
- current selected group 删除：navigation context 自动清理。
- viewport width 0 / hidden panel：fitRange defer/guard，不产生 NaN。
- very short media：clamp。

## 12. 建议新增测试

- `apps/webapp/test/timeline-semantic-zoom.test.ts`
- `apps/webapp/test/timeline-navigation.test.ts`
- `tests/features/timeline-semantic/timeline-navigation.browser.test.js`

纯测试：

- pps threshold 边界值。
- optional hierarchy drill path。
- breadcrumb context。
- range clamp。
- cluster/density pure logic（如果抽出）。

Browser：

1. 全片 fit。
2. 逐级 zoom。
3. 同一 Shot label 信息逐级变化。
4. double click Section → fit。
5. structure focus Enter → drill。
6. no focus Enter → Shot split。
7. Esc drag/editor → cancel。
8. Esc idle navigation → go up。
9. 缺 Sequence 项目跳层。
10. Macro collapse + reload。
11. 100+ Marker low zoom 不堆叠到不可用。
12. Console 无新增相关 error。

## 13. 已存在命令

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build:webapp
corepack pnpm test:editor-history
```

## 14. 完成门槛与交接

完成：

- 五级 resolver 单一。
- UI 有真实可观察差异，不是只定义 enum。
- Enter/Esc 冲突有 Browser evidence。
- Breadcrumb 不依赖 parent tree。
- Macro collapse 有持久化 UI preference。
- no fake analysis data。
- tests/browser/build 实际运行。
- commit(s) push，remote 核实。
- verification record 更新。

交给 Phase 06：

- 产品功能主体完成。
- Phase 06 不再扩展范围，只做跨模块验证、性能/数据/清理、文档和最终门。
