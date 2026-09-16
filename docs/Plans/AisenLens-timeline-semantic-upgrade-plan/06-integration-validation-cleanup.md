# 06 — 集成验证、旧路径清理、文档同步与第一期收口

> 计划状态：仅计划，未实施  
> 规划日期：2026-09-15  
> 仓库：`aisenhub/aisenlens`  
> 执行前必须重新核对当前代码、Git 分支、HEAD、工作区和远端。


## 1. 目标

本阶段不是“再加一点功能”，而是证明 Phase 01–05 的链条真实可用，并删除临时兼容路径。

第一期只有 Phase 06 完成并 push 后才可整体标记“已交付”。

## 2. 前置

- Phase 01–05 状态全部为“已交付”。
- 每阶段代码 commit 已在同一任务 remote branch。
- `verification-record.md` 能追溯各阶段实际验证。

## 3. 旧路径清理

执行 `rg` / `rg --files`，逐项核实。

### 3.1 Marker legacy

正式 runtime 不得再有：

- `AnnotationMarkerCategory`
- `annotationMarkerCategories`
- `visibleMarkerCategories`
- category color map
- `marker.shotId`
- `marker.label`
- `marker.note`

允许旧字段只存在：

- v17→v18 migration type。
- migration fixtures/tests。
- 必要历史文档（不作为 runtime）。

### 3.2 Track legacy

正式 runtime 不得再有：

- `video-frames` track id。
- `shots` track id。
- `groups` track id。
- Ruler Marker renderer。
- preference v1 双写。
- hidden old track behind feature flag。

### 3.3 Group legacy UX

- 主产品 UI 不再使用“分组”作为 Structure 创建主术语。
- selection create 若保留，只调用 new structure command。
- 不存在 old validator + new validator 双规则。
- `ShotGroupRecord` internal type 名称可保留，**不要为了命名做额外 DB migration**。

## 4. 关联功能回归

Timeline 不是孤立模块，必须实际核对：

### Shot / Auto Shot

- 自动分镜应用后 Shots 正确。
- Structure reconcile 正确。
- Marker frame 不漂。
- auto-shot provenance 仍显示真实数据。

### Manual Shot

- split。
- merge。
- move shared boundary。
- shot calibration。
- selected Shot / active Shot。

### Analysis / Search

- Shot search/filter。
- required analysis completion state。
- Analysis view 仍能定位 Shot/Group。
- `ResearchContext` 仍能引用 Marker EvidenceRef。

### Media

- FrameThumbnailStrip。
- screenshot。
- waveform。
- waveform unavailable。
- multi-track audio 相邻功能不回归。

### Persistence

- project autosave。
- recovery snapshot。
- backup v4。
- project import。
- report/video export 若消费 groups/markers，至少做 typecheck + relevant smoke。

## 5. 数据、事务、并发与恢复专项

利用当前 repository 已有的 fault injection / 测试能力（执行时先核实 API 仍存在）。

至少验证：

1. marker 写入阶段故障。
2. groups 写入阶段故障。
3. transaction fail 时不能出现只更新 Shots、没更新 Groups/Markers 的半保存。
4. `expectedUpdatedAt` stale 不覆盖较新 project。
5. autosave single-flight 不出现旧 save 最后覆盖新 state。
6. Recovery snapshot 恢复 Marker v2 + Groups。
7. Boundary drag cancel 不产生正式 dirty mutation。
8. Undo 后 autosave 保存的是 undo 后 state。
9. Redo 后同理。
10. Backup v4 round-trip。
11. v17→v18 DB upgrade fixture 再做一次最终回归。

如果某个现有 fault injection 只能用于 internal test，使用它，不为 UI 暴露调试按钮。

## 6. 浏览器验证矩阵

优先使用仓库当前 browser harness；已核实仓库有 Node + Chrome/Edge CDP 风格测试。

### 6.1 数据形态

至少：

- 0 Shot 空项目。
- 1 Shot。
- 多 Shot 无结构。
- Scene only。
- Scene + Sequence。
- Section + Sequence + Scene。
- sparse/legacy group project。
- 大量 Marker。
- waveform unavailable。

### 6.2 操作

- zoom / pan / playhead。
- active Shot。
- Visual Track。
- structure select。
- Scene boundary create。
- Sequence / Section create。
- boundary move。
- merge。
- promote/demote。
- undo/redo。
- M Marker。
- Marker edit/delete/scope。
- MarkerTrack expand/collapse。
- Inspector aggregation。
- Semantic Zoom。
- Macro collapse。
- breadcrumb。
- Enter focus/no-focus。
- Esc cancel/go-up。
- Track show/hide/order/height reload。

### 6.3 响应式与主题

不要写“全设备通过”。

执行时先核实当前产品实际：

- 支持哪些 theme。
- 编辑器有哪些 responsive breakpoints。
- 哪些窄 viewport 是产品仍声明可用的。

至少记录：

- 一个常见 desktop viewport。
- 一个当前 Editor 可用的较窄 viewport。
- 产品实际暴露的每个主题。

记录具体尺寸、浏览器与结果。

## 7. 性能验证

不编造跨机器 FPS 指标。

每次性能观察记录：

- 浏览器/version。
- viewport。
- Shot count。
- Marker count。
- Structure count。
- zoom level。
- visible tracks。
- frame thumbnails/waveform 是否显示。

观察标准：

- pan/zoom 没有持续明显长任务阻塞。
- film zoom 不生成“每视频帧一个 DOM node”。
- 大量 Marker 在 low zoom 有聚合/密度策略。
- 无本改动引入的 React warning。
- 无本改动引入的 console error。

若发现瓶颈：

1. 先用 Performance/Profiler 找热点。
2. 修局部热点。
3. 不未经证据把 Timeline 重写 Canvas/WebGL。

性能验证结论写测试条件与观察，不写虚构设备 KPI。

## 8. 文档同步

在功能**真实实施完成后**更新：

### `docs/architecture/PROJECT_ARCHITECTURE.md`

同步当前事实：

- IndexedDB version 18。
- Marker v2。
- Semantic Timeline 当前结构。
- Group 仍为结构 persistence。
- frame/[start,end) contract。
- no parent tree。

### `docs/development/DEVELOPMENT_GUIDE.md`

只有当本次新增了稳定开发命令/测试入口或实现约束才更新。

### `docs/development/DEVELOPMENT_TODO.md`

若当前规范仍把 future work 放这里，记录 Phase 07–09。

历史阶段计划的归档遵循执行时仓库当前规则，不擅自把本计划变成长期 architecture source。

## 9. 最终命令门

先运行各阶段 targeted tests，再运行当前仍存在的核心命令：

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm build:webapp
corepack pnpm test:editor-history
corepack pnpm test:scene-calibration
corepack pnpm test:shot-calibration
corepack pnpm verify:web-boundaries
corepack pnpm verify:web
```

注意：

- 本计划写的是当前已核实命令。
- 如果实施期间仓库正式改名/删除命令，以实际 current scripts 为准。
- verification record 必须写实际替代命令与原因。
- 不允许“计划中写过”就视为“已执行”。

## 10. 不允许混入第一期的假功能

第一期最终 UI 必须确认没有：

- Dialogue 空 checkbox。
- Emotion 空 checkbox。
- Music 空 checkbox。
- AI Structure 假“分析中”。
- 假 progress。
- 假 confidence 百分比。
- future disabled button 冒充已完成。
- 新旧 Timeline 切换开关维持两套 runtime，除非用户另行要求 feature flag（本计划未要求）。

## 11. Git / GitHub 收口

Phase 06：

1. `git status --short`
2. `git diff --check`
3. 检查 staged diff。
4. commit Phase 06 清理/验证所需代码与文档。
5. push 同一任务 branch。
6. 核实 remote branch。
7. 更新 verification record 写：
   - code SHA
   - record SHA
   - branch
   - remote link
   - push outcome
8. 再 push record update。

不需要让某个 commit 自己记录自己的最终 SHA；避免 amend 循环。

## 12. 第一期“已交付”定义

必须全部满足：

1. Phase 01–05 功能已完成。
2. Phase 06 old path cleanup 完成。
3. Targeted tests 实际运行。
4. `verify:web` 在最终相关代码版本实际通过。
5. Browser matrix 实际完成。
6. DB migration / backup / recovery / save failure / stale / undo redo 实际验证。
7. Active docs 同步。
8. 所有必要 commit 已 push。
9. Remote branch 已确认。
10. verification record 完整、没有虚假“通过”。

任一缺失时只能用：

- 进行中
- 已阻塞
- 验证失败
- 验收通过待推送

不能用“已交付”。

## 13. Phase 06 后停止

第一期完成后**不要自动开始 Phase 07**。

向用户报告：

- 第一阶段 branch / commits。
- 验证结果。
- 未验证平台/条件。
- Phase 07–09 仍是 future。

等待明确授权再进入第二期。
