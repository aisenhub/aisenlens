# Verification Record — AisenLens Semantic Timeline Upgrade

> 计划状态：第一期 Phase 01–06 功能验收完成；Phase 07–09 研究准入已记录但产品按数据源阻塞
> 规划日期：2026-09-15
> 仓库：`aisenhub/aisenlens`
> 规则：本文件只记录后续真实执行事实；计划阶段不得预填“测试通过”“阶段完成”“commit SHA”“push 成功”。


## 1. 项目与基线

| 字段 | 实际值 |
|---|---|
| 本次目标 | AisenLens Semantic Timeline Upgrade |
| 第一期范围 | Phase 01–06 |
| 第二期/后续 | Phase 07–09 已完成研究/准入判断；产品功能按真实数据源分别阻塞，不伪造交付 |
| GitHub 仓库 | `aisenhub/aisenlens` |
| 本地项目绝对路径 | `E:\Projects\Aisenlens` |
| Git remote 名称/URL | `origin` / `https://github.com/aisenhub/aisenlens.git` |
| 工作分支 | `main` |
| 起始 commit | `28d8263d627778194b92ee86160e14fee7b26997` |
| 本次规划参考 commit | `28d8263d627778194b92ee86160e14fee7b26997`，仅规划参考，不是执行时事实 |
| 初始工作区状态 | `?? docs/Plans/` |
| 初始已有修改及归属 | 用户提供的本计划目录；保留并在其中补充本记录 |
| OS | Windows |
| Node | `v24.19.0` |
| pnpm/Corepack | `pnpm 11.24.0`（Corepack） |
| Browser/version | Codex In-app Browser；具体内核版本不可用 |
| 已知基线失败 | 无；完整 `verify:web` 已通过。Vite 手测第一次使用错误参数且 8443 已占用，随后以 `PORT=4173` 启动成功 |

执行 agent 开始时必须先填写本节，不能直接把“规划参考 commit”复制为“起始 commit”。

## 2. 阶段状态总表

功能状态：未开始 / 进行中 / 阻塞 / 验证失败 / 验收完成。
Git 状态另列：未授权或未要求 / 未提交 / 已提交 / 已推送并核实 / 推送失败。

“已交付”指用户要求的功能和交付动作都完成；计划不是 commit/push 授权。未要求推送不影响功能验收或下一阶段。研究完成不等于第二期产品完成。

未提交工作区验证应记录 HEAD、修改文件和内容校验值，不能仅用 HEAD 指代未提交内容。

| 阶段 | 名称 | 状态 | 已完成内容 | 剩余/阻塞 | 前置依赖 | Code commit | Push | GitHub link |
|---|---|---|---|---|---|---|---|---|
| 01 | Contract / Marker v2 / Persistence | 验收完成 | Marker v2、v17→v18 upgrade、Recovery/Backup v4；真实 IndexedDB 双迁移、原子故障回滚、stale、恢复和导入导出均通过 | 未宣称生产数据迁移；仅隔离 fixture | 无 | 未提交 | 未执行 | 未执行 |
| 02 | Track System / Visual Backbone | 验收完成 | 六轨 registry、Visual/Marker 独立轨、偏好 v2、ruler 收敛；隔离浏览器验证轨道展示与刷新恢复 | 未宣称跨设备性能 | 01 | 未提交 | 未执行 | 未执行 |
| 03 | Structure Boundary First | 验收完成 | validator、create/split/move/resize/merge/delete/promote/demote commands、Shot 结构协调和 Research 影响处理 | 细粒度拖拽矩阵以定向逻辑/代码门禁为主，未宣称全设备 UI 覆盖 | 01,02 | 未提交 | 未执行 | 未执行 |
| 04 | Marker Context / Scope | 验收完成 | frame context、focus、scope、Marker 聚合、M draft、刷新恢复和 v2 数据验证 | 未宣称跨设备 IME 行为 | 01–03 | 未提交 | 未执行 | 未执行 |
| 05 | Semantic Zoom / Navigation | 验收完成 | 五级 detail、动态 min/max pps、fitRange、breadcrumb、Enter/Esc 导航；响应式与有界 DOM 浏览器回归通过 | 10s/5min/2h × 24/30/60fps 全组合仍未作为跨设备 KPI 宣称 | 01–04 | 未提交 | 未执行 | 未执行 |
| 06 | Integration / Cleanup / Final Gate | 验收完成 | targeted/browser/data/build/boundary/UI detector 门禁均通过；Overview/Analyze、Analysis system、校准和 Workflow 全部回归通过 | 仅保留未声明设备/全组合长片 KPI 的边界记录 | 01–05 | 未提交 | 未执行 | 未执行 |
| 07 | AI Structural Suggestions | 阻塞 | 真实 AutoShot signal 研究、Scene-only legal `afterShotId` adapter、stale contract 与纯测试已落地；无生产 UI | 缺少已校准 score 与地点/人物/对白 canonical source；Sequence/Section 和 browser Accept UI 不实施 | 01–06 | 未提交 | 未执行 | 未执行 |
| 08 | Dialogue / Emotion | 阻塞 | 已核实 ResearchRange/模板字段不是 canonical Dialogue/Emotion source；Sound UI 改为真实准入说明 | 等待字幕/转写、人工 frame segment 或批准模型输出；不注册 production track | 01–06；与 07A 独立 | 未提交 | 未执行 | 未执行 |
| 09 | Future Analysis Tracks | 阻塞 | 逐轨准入清单已完成；保留六条真实轨，不预建未来 ID/disabled UI/通用 renderer | 没有满足 source、ownership、时间形态、backup、browser acceptance 的新增维度 | 08 至少验证 2 类真实轨 | 未提交 | 未执行 | 未执行 |

## 3. 每阶段实施记录

后续每个阶段收尾时复制并填写以下模板。

### 本次实施 — Phase 01–06 代码链路

**状态：** 功能验收完成（Git 状态单独记录；未授权 commit/push）
**开始日期：** 2026-09-15
**完成/停止日期：** 2026-09-15
**开始时 HEAD：** `28d8263d627778194b92ee86160e14fee7b26997`
**最终验证 HEAD：** 同上；工作区未提交
**工作区开始状态：** 仅有用户提供的 `?? docs/Plans/`；未覆盖用户已有代码修改

#### 实际修改文件与职责

| 范围 | 实际文件 | 结果 |
|---|---|---|
| Marker / persistence | `annotation/types.ts`、`annotation/services/normalizeAnnotationMarker.ts`、`projectRepository.ts`、`projectBackupService.ts` | Marker v2、显式 v17→v18 migration、Recovery/Backup v4 校验与转换 |
| Structure domain | `group/services/structureValidation.ts`、`structureCommands.ts`、`structureContext.ts`、`reconcileShotGroups.ts`、`groupService.ts` | 通用层级规则、原子边界命令、上下文解析与损坏结构诊断 |
| Timeline system | `timeline/trackRegistry.ts`、`timeline/timelineSemantics.ts`、`timeline/timelineNavigation.ts`、`timeline/hooks/useTimelineTrackPreferences.ts`、`useTimelineViewport.ts` | 六轨 registry、偏好 v2、五级语义 detail、动态 viewport 与导航 focus |
| Timeline UI | `EditorTimeline.tsx`、`StructureTimelineTrack.tsx`、`VisualTimelineTrack.tsx`、`MarkerTimelineTrack.tsx`、`TimelineRuler.tsx`、`TimelineTrackSettings.tsx` | 独立 Visual/Marker/结构轨、可见窗口渲染、边界交互、breadcrumb 与 ruler 收敛 |
| Editor / inspector | `EditorWorkspace.tsx`、`AnnotationMarkerPanel.tsx`、`ShotGroupInspector.tsx`、`ShotList.tsx`、`shotSearchService.ts` | Marker draft/scope、结构焦点、范围聚合和 frame 命中 |
| Tests / docs | `apps/webapp/test/annotation-marker-v2.test.ts`、`structure-commands.test.ts`、`timeline-semantic.test.ts`、两个 `package.json`、活动架构/开发/TODO 文档 | 稳定定向测试命令和当前边界同步 |

#### 已实现的用户/系统行为

- M 或“添加标记”打开当前 frame 的空 draft；文本保存后才创建 Marker，Enter 可换行，Esc 取消。
- Marker 只持久化 `frame/content/scope`；Marker Track 独立于 Visual，密集标记按像素窗口聚类。
- Scene/Sequence/Section 通过连续 Shot 选区或 cut affordance 创建；共享边界和孤立端点拖拽只在 pointerup 提交一次正式命令。
- Split 保留左侧 ID，Merge 丢弃右侧标题/摘要必须显式确认；非法层级/重叠返回诊断而不写部分状态。
- 双击结构 fit 到范围，Enter drill down，breadcrumb 可回到上级；播放和 active shot 不改变 navigation focus。
- 视口按实际宽度/媒体时长计算 min pps，max pps 至少 `max(240, fps × 8)`；Visual 只渲染可见窗口附近的 Shot。

#### 已冻结的契约

- `AnnotationMarker = { id, projectId, frame, content, scope, createdAt, updatedAt }`；scope 为 `free|film|section|sequence|scene|shot`。
- 数据库版本 `18`；仅 v17→v18 upgrade transaction 做 legacy Marker 转换，失败 abort，不提供运行时旧格式 fallback。
- Backup `version = 4`；六个正式轨道 ID 为 `section|sequence|scene|visual|markers|primary-audio`。
- 时间范围使用整数帧半开区间 `[startFrame, endFrame)`；结构编辑入口为 `structureCommands.ts`。
- detail threshold 为 `<20 / 20–<48 / 48–<100 / 100–<240 / >=240`，对应 overview 到 frame-detail。

#### 与原计划的偏差

| 偏差 | 原因 | 证据 | 对下游影响 | 是否需用户决定 |
|---|---|---|---|---|
| `resolveStructureSpanAtBoundary` 在完全无同层结构时会创建 cut 两侧的两个稀疏范围 | 保持 boundary-first，同时避免凭空建立 parent tree | `structure-commands.test.ts` | 继续使用返回的 change set；不会自动建父层 | 否 |
| 全组合长片性能 KPI 未宣称 | 本轮使用隔离 Chrome 的真实 UI/IndexedDB/校准和 1000/3000 镜头压力证据；未把单机数据外推到 10s/5min/2h × 24/30/60fps 全矩阵 | 本记录 §4.4 | 不影响已验证功能链路；后续只补设备/媒体矩阵，不改变契约 | 否 |

#### 新增依赖

无。

#### 尚未完成或未宣称

- 未将每个结构拖拽组合扩展成全设备 UI 矩阵；核心结构命令、研究影响、原子恢复和响应式/有界列表已有定向与浏览器证据。
- 未覆盖 10s、5min、2h 媒体在 24/30/60fps 下的全组合 min/max pps、frame width、DOM/heap/long-task 实测，不作跨设备 KPI 宣称。
- Desktop/Mobile 未纳入当前 Web 范围。
- `verify:web` 中保留既有 Node `DEP0190` 和模块类型 warning；不影响 exit code 0，但尚未专项清理。

### Phase XX — [阶段名称]

**状态：** 未开始
**开始日期：** 未开始
**完成/停止日期：** 未开始
**开始时 HEAD：** 未开始
**最终验证 HEAD：** 未验证
**工作区开始状态：** 未开始

#### 3.1 实际修改文件

| 文件 | 新增/修改/删除 | 实际职责 | 归属 Agent |
|---|---|---|---|
| 未开始 | 未开始 | 未开始 | 未开始 |

不得把“计划建议修改文件”直接复制成“实际修改文件”。

#### 3.2 已实现的用户行为/系统行为

未开始。

填写时应具体，例如：

```text
- M 在当前 frame 打开自由文本 Marker draft。
- 保存后 Marker 进入 editor state，400ms autosave 后可 reload 恢复。
- Structure boundary drag 在 pointerup 仅产生 1 个 history entry。
```

不要写“优化了体验”。

#### 3.3 已冻结/新增的数据、接口和跨阶段契约

未开始。

只记录**已经实际落地**且下游必须依赖的事实，例如：

- Marker v2 的最终字段。
- Track Registry 最终 ID。
- structureCommands 实际 API。
- semantic zoom 实际 threshold。

若与计划不同，必须在下一节解释。

#### 3.4 与原计划的偏差

未开始。

格式：

| 偏差 | 原因 | 证据 | 对下游影响 | 是否需用户决定 |
|---|---|---|---|---|
| 无/未开始 |  |  |  |  |

不能因为“代码能跑”就不记录架构偏差。

#### 3.5 新增依赖

未开始。

如果无，明确写：

```text
无。
```

若有：

- 包名/版本。
- 为什么现有依赖不足。
- 安装命令。
- lockfile 变化。
- 是否影响 webhome/desktop/mobile。

#### 3.6 尚未完成或未验证

未开始。

必须保留：

- 未运行的平台。
- 未覆盖数据规模。
- 未验证浏览器。
- 已知非阻塞问题。

## 4. 验证记录

### 4.0 本次实际运行

#### 2026-09-15 / 当前未提交工作区

| 验证目标 | 命令/操作 | Exit code | 结果摘要 | Warning |
|---|---|---:|---|---|
| Marker/Structure/Semantic 定向回归 | `corepack pnpm test:timeline-semantic` | 0 | 21 tests passed；包含镜头结构协调、研究上下文影响和 07A Scene adapter | 无 |
| Web 类型检查 | `corepack pnpm typecheck` | 0 | `@aisenlens/webapp` tsc passed | 无 |
| Web lint | `corepack pnpm lint` | 0 | eslint `--max-warnings=0` passed | 无 |
| UI detector | `node C:\Users\S1786\.agents\skills\impeccable\scripts\detect.mjs --json` + 14 changed UI targets | 0 | 空结果；无命中 | 无 |
| Web boundary check | `corepack pnpm verify:web-boundaries` | 0 | passed | 无 |
| 完整 Web 门禁 | `corepack pnpm verify:web` | 0 | webhome/webapp checks、核心回归、build、prerender、boundary check passed | 既有 `DEP0190`、模块类型 warning |
| 浏览器工作流 | `corepack pnpm test:workflow-browser` | 0 | 隔离 Chrome 完成项目创建、编辑器进入和 Workflow 导航 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| 校准浏览器验证（首次失败记录） | `corepack pnpm test:shot-calibration-browser` | 1 | 首轮暴露过时断言；后续复测 3/3 通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning；失败记录保留 |
| 校准浏览器验证（复测） | `corepack pnpm test:shot-calibration-browser` | 0 | 3 tests passed；真实 synthetic.webm、VFR/PTS、双帧、事务和性能验证通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| 语义时间线浏览器验证（首次失败记录） | `corepack pnpm test:timeline-semantic-browser` | 1 | 首轮暴露按钮/输入定位问题；后续复测通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning；失败记录保留 |
| 语义时间线浏览器验证（复测） | `corepack pnpm test:timeline-semantic-browser` | 0 | 1 test passed；六轨展示、Marker 输入保存和刷新恢复通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| 语义数据浏览器验证 | `corepack pnpm test:timeline-semantic-data-browser` | 0 | 1 test passed；v17→v18 双 store migration、原子 fault/stale、Recovery、Backup v4 round-trip 通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| Overview / Analyze 浏览器验证 | `corepack pnpm test:overview-analyze-browser` | 0 | 3 tests passed；响应式视口、Sound range round-trip、1000/3000 镜头有界 DOM 通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| Analysis system 浏览器验证（首次失败记录） | `corepack pnpm test:analysis-system-browser` | 1 | 旧 inventory 断言写死 DB v17、另一次响应式运行受时序抖动影响；后续修正/单独复测 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning；失败记录保留 |
| Analysis system 浏览器验证（最终复测） | `corepack pnpm test:analysis-system-browser` | 0 | 11 tests passed；保存故障回滚、stale、Recovery、DB v18 inventory、Focus/Batch、宽中窄视口和 1000 镜头性能通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| Analysis consumer 浏览器验证 | `corepack pnpm test:analysis-consumer-browser` | 0 | 1 test passed；Overlay/Export/Learn/Evidence consumer matrix 通过 | Node `MODULE_TYPELESS_PACKAGE_JSON` warning |
| 浏览器冒烟 | Codex In-app Browser；创建空项目→深拆→打开标记→保存多行 Marker→刷新→M draft→Esc→轨道设置 | — | 六轨可见；Marker 保存/刷新恢复；M draft 与 Esc cancel 可见；控制台 error/warning 为空 | 无视频，未覆盖结构数据与长片性能 |

以上命令均针对当前未提交工作区运行；代码仍未 commit/push。首次尝试启动开发服务器时传入了
多余的 `--` 参数且默认 8443 已被占用，随后使用 `PORT=4173` 成功启动 Vite。CUA 浏览器枚举
曾返回 `nodeRepl.fetch request failed`，因此旧的 CUA 冒烟记录没有替代自动化浏览器证据；本轮隔离
Chrome 已可运行 workflow、校准和时间线测试。上述有失败的浏览器命令仍保留为失败，修正后的复测
必须追加记录，不能覆盖失败历史。

### 4.1.1 浏览器复测说明

- `test:workflow-browser` 已通过，确认 `apps/web` 旧路径已统一为 `apps/webapp`。
- 校准真实媒体首轮失败原因是界面未呈现真实 PTS timing mode，以及测试使用了过时的“镜头 2”/播放头文本；页面现已显示 `CFR/VFR · N 帧`，测试改用当前格式的帧文本，复测 3/3 通过。
- 语义时间线首轮失败原因是测试选择了不可见重复导航按钮、使用了不稳定的受控 textarea 写入和顶栏“保存”按钮；测试现已限定可见控件、使用 CDP 输入并在标记编辑器内定位保存，复测 1/1 通过。

### 4.2 Phase 07–09 研究/准入记录

- **07A：** `AutoShotCandidate` 的 `score`、`threshold`、`detectors`、`evidence`、`engineVersion`、`configHash` 在真实代码/报告中存在；真实校准 fixture 的浏览器验证为 VFR、347 帧、约 12.31 秒。现有 score 未校准且不能解释为概率，因此 `suggestSceneBoundaries` 只保留 raw evidence，不返回 score/confidence。它要求 candidate 结束帧精确落在正式 Shot 结束边界，输出稳定 `afterShotId`，并以 media digest + structure revision 判断 stale。没有新增生产 Track 或直接 Groups 写入。
- **08：** 当前没有字幕/转写 store，也没有被核实的 Emotion segment/curve source。`ResearchRange` 保持 evidence/context；`SoundWorkspace` 不再显示 Dialogue/SFX/Ambience 假未来行。
- **09：** 当前六条 registry track 是唯一已注册真实轨道；新增维度继续按 source、time shape、scope、ownership、persistence、zoom、stale、browser checklist 单独准入。
- 研究完成不等于产品完成；上述三阶段的“阻塞”是有证据的准入结果，不影响第一期人工 Boundary First 链路。

### 4.1 单次验证记录模板

#### [YYYY-MM-DD HH:mm] Phase XX / HEAD `[SHA]`

| 字段 | 实际值 |
|---|---|
| 验证目标 | 未验证 |
| 命令/操作 | 未验证 |
| 运行目录 | 未验证 |
| OS/Node/pnpm | 未验证 |
| Browser/version | 未验证 |
| Viewport/theme | 未验证 |
| 测试素材/fixture | 未验证 |
| Exit code | 未验证 |
| 结果摘要 | 未验证 |
| Warning | 未验证 |
| Log path | 未验证 |
| Screenshot path | 未验证 |
| 失败原因 | 未验证 |
| 修复措施 | 未验证 |
| 复测 HEAD | 未验证 |
| 复测结果 | 未验证 |

规则：

- 没有实际运行命令时，不填写 exit 0。
- UI 手测也要写具体步骤和可观察结果。
- 验证后相关代码如果发生改变，补充：
  - “原验证仅覆盖 HEAD xxx”
  - 新 HEAD 需要复测。
- 失败记录必须保留；修复后追加复测，不把失败改写成“从未失败”。

### 4.2 第一阶段数据专项

先记录 Phase 01 §5.0 决策：当前记录/快照是否存在、保留范围、转换是否需要、规范依据。未需要转换的专项标“不适用 + 依据”，不能填通过；禁止以删库制造不适用。

| 检查 | 状态 | 对应 HEAD | 实际命令/操作 | 证据 |
|---|---|---|---|---|
| v17→v18 Marker store migration | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser` | 隔离 Chrome 读取 DB v18 并完成 Marker migration |
| Recovery snapshot Marker migration | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser` | 双 store migration 与 snapshot Marker v2 通过 |
| Backup v4 export/import round-trip | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser` | Backup v4 Blob export/import round-trip 通过 |
| Marker save failure | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser`；`test:analysis-system-browser` | 原子故障注入与恢复通过 |
| Group save failure | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:analysis-system-browser` | 各保存故障点回滚通过 |
| Atomic editor transaction | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser`；`test:analysis-system-browser` | 编辑器状态与持久化原子性通过 |
| `expectedUpdatedAt` stale conflict | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser`；`test:analysis-system-browser` | 过期写入被拒绝且状态保持一致 |
| Autosave single-flight | 未单独验证 | 当前未提交工作区 | — | 保留既有实现，未宣称独立专项 KPI |
| Undo Marker create/update/delete | 部分验证 | 当前未提交工作区 | `corepack pnpm verify:web`；`test:timeline-semantic-browser` | EditorHistory 与 Marker 持久化通过，完整 create/update/delete 矩阵未单独执行 |
| Undo structure split/move/merge | 定向测试通过，浏览器未逐项验证 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic` | command/change-set 逻辑通过，未宣称逐项 UI undo |
| Boundary drag cancel | 代码/定向测试通过，浏览器未单独验证 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic` | pointercancel/Esc/stale drag 保护已覆盖 |
| Recovery restore Marker + Groups | 浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser`；`test:analysis-system-browser` | Recovery 恢复 Groups 与 Marker 通过 |
| 新库初始化 / blocked / versionchange / abort 重试 | 部分验证 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic-data-browser` | 新库初始化/迁移通过；blocked/versionchange/abort 重试未单独覆盖 |
| 共享层级边界 / 孤立端点 / 局部缺层 / 选区规则 | 定向测试通过；浏览器场景通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic`；`test:timeline-semantic-browser` | 规则与六轨基础 UI 通过，细粒度结构拖拽未穷举 |
| Group split/merge/delete 后 Research 可查看与 needsReview | 代码/定向测试通过；恢复链路通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic`；`test:analysis-system-browser` | Research impact 与 Recovery 通过，逐项 inspector UI 未单独执行 |
| Groups + Research 原子 undo/redo/recovery/backup | 部分验证 | 当前未提交工作区 | `test:timeline-semantic-data-browser`；`test:analysis-system-browser` | Recovery/Backup 与保存故障通过，组合 undo/redo 未单独浏览器验证 |
| Shot split 继承 / 跨结构 merge 拒绝 / auto-shot 无映射 | 定向测试通过；真实媒体链路通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic`；`test:shot-calibration-browser` | split/merge 影响逻辑和校准回归通过，auto-shot UI 映射未单独验证 |
| 导航 focus 与 playhead/selection 分离 | 定向/浏览器验收通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic`；`test:analysis-system-browser` | Focus queue/selected range 与键盘回归通过 |
| 长片全片 fit / 帧级最大 zoom / 高倍率滚动精度 | 代码/纯函数测试通过，实测未验证 | 当前未提交工作区 | `timeline-semantic.test.ts`；未运行长片 fixture | 需浏览器/性能 fixture |
| 同帧 Marker / Visual 命中 / 键盘无拖动入口 | 定向测试通过；基础浏览器链路通过 | 当前未提交工作区 | `corepack pnpm test:timeline-semantic`；`test:timeline-semantic-browser` | Marker track/save/reload 通过，完整键盘命中矩阵未逐项执行 |
| 稳定 targeted/browser runner 接入验证链 | 验收通过 | 当前未提交工作区 | `test:timeline-semantic`、`test:timeline-semantic-browser` | runner 已接入 package scripts 并在隔离 Chrome 通过 |

### 4.3 Browser 操作专项

| 场景 | Browser/version | Viewport/theme | 测试项目/fixture | 状态 | 证据 |
|---|---|---|---|---|---|
| Empty project | Codex In-app Browser / version unavailable；隔离 Chrome | 1280×720；默认深色主题 | 本次创建的本地空项目 | 浏览器验收通过 | 项目库→深拆；六条轨道、Marker save/reload 和无视频 empty state 通过；CUA 另有手测 |
| 1 Shot | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Multi-shot no structure | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Scene-only | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Scene + Sequence | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Full hierarchy | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Sparse legacy groups | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Marker create/edit/delete | Codex In-app Browser / version unavailable | 1280×720；默认深色主题 | 本次创建的本地空项目 | 部分验证 | 创建多行 Marker、刷新恢复、M draft、Esc cancel；edit/delete 未测 |
| Marker scope + expanded track | Codex In-app Browser / version unavailable；隔离 Chrome | 1280×720；默认深色主题 | 本次创建的本地空项目 | 部分验证 | 轨道标记、scope 选项和基础设置 reload 通过；完整 expanded interaction 未单独执行 |
| Boundary create/move/merge | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Promote/Demote | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Semantic zoom | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Macro collapse | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Breadcrumb | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Enter structure focus → drill | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Enter no focus → Shot split | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Esc local cancel | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Esc navigation go-up | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Track prefs reload | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |
| Waveform unavailable | 未验证 | 未验证 | 未验证 | 未验证 | 未验证 |

### 4.4 性能专项

不得预填“60 FPS”。

每次记录真实条件：

| 字段 | 实际值 |
|---|---|
| Browser/version | 隔离 Chrome；具体内核版本不可用 |
| CPU/device context | Windows；CPU/内存未记录 |
| Viewport | 默认 1280×720；Overview/Analyze 另测 1440/1280/768/390；Analysis system 另测 1440/768/390 |
| Shot count | Analysis 1000×20 数据；Overview/Analyze 1000/3000 有界 DOM；校准 347 帧与 3000 边界压力 |
| Marker count | 语义时间线浏览器 1 个持久化 Marker；1000 Marker 完整矩阵未测 |
| Section/Sequence/Scene count | 纯函数合成覆盖；未完成大规模结构 UI 计数矩阵 |
| Visible tracks | 六条 registry tracks |
| Semantic zoom level | 纯函数覆盖；浏览器基础展示/导航回归通过 |
| Frame thumbnails | 本轮 synthetic 媒体未启用帧缩略图专项 |
| Waveform | 本轮无音频波形数据；Sound 明确显示 canonical-source gate |
| Measurement method | 浏览器 CDP、`performance.now()`、DOM 节点计数和现有回归断言 |
| Baseline / final workspace version | 起始 HEAD 与最终 HEAD 均为 `28d8263d627778194b92ee86160e14fee7b26997`；最终代码在未提交工作区 |
| Fixture duration / fps / cache cold-warm | 真实 synthetic VFR 约 12.31 秒、347 帧；未形成 2h 或冷/热缓存对比矩阵 |
| Min/max pps / frame pixel width | 纯函数/动态 viewport 测试覆盖；未宣称完整媒体 pps/frame-width KPI |
| Interaction p95 / long-task count-total / DOM / heap | 1000/3000 有界 DOM 与 1000×20 resolver/command/history/serialization/transaction 回归通过；未宣称 p95/heap budget |
| 3 runs / median / budget / deviation reason | 未形成三次运行中位数或跨设备预算结论 |
| Long tasks / profiler finding | 未做 profiler 结论；CUA 冒烟无 console error/warning |
| 实际结论 | 可见窗口渲染和测试规模下的研究列表有界；完整 2h 长片与全设备性能矩阵仍不宣称通过 |

## 5. GitHub 交付记录

| Phase | Branch | Code commit SHA | Record commit SHA | Push result | Remote contains code? | GitHub link |
|---|---|---|---|---|---|---|
| 01–06 | `main` | 未提交（工作区） | 未提交（工作区） | 未执行（未授权） | 未验证（未执行） | 未执行 |
| 07 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 08 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |
| 09 | 未开始 | 未开始 | 未开始 | 未开始 | 未验证 | 未开始 |

规则（仅在任务授权对应 Git 操作时适用）：

1. 代码 commit 可以先 push。
2. 然后在本文件记录代码 SHA。
3. 再单独 commit/push verification record。
4. 不要求某个 commit 自己记录自己的最终 SHA。
5. 不要反复 amend 追逐“最新 record commit”。
6. 仅授权时执行 commit/push；失败保留原因，Git 不能标已推送。功能状态单独保留；若任务要求远程交付则整体尚未完成。

### Push 失败记录模板

```text
Phase:
Branch:
Local HEAD:
Remote:
Command:
Error:
Local work preserved: 是/否
Recommended next action:
Resolved at:
Final push result:
```

## 6. 交接信息

### 6.1 下一阶段从哪里开始

第一期 Phase 01–06 的功能、数据专项、现有浏览器回归与自动门禁已完成。下一步不应自动扩展 Phase 07；
若继续，只需补未宣称的全设备/完整长片性能 KPI、autosave single-flight 独立专项和细粒度结构拖拽矩阵。
结构命令入口为
`apps/webapp/src/features/group/services/structureCommands.ts`，时间轴组合入口为
`apps/webapp/src/features/editor/components/EditorTimeline.tsx`，Marker 转换唯一入口为
`apps/webapp/src/features/annotation/services/normalizeAnnotationMarker.ts`。

填写时写：

- 入口文件。
- 已稳定 API。
- 最后一个已交付 commit。
- 需要先读的上游记录。

### 6.2 必须先解决的问题

上述 v17→v18 升级夹具、Backup/Recovery round-trip、核心结构与响应式浏览器回归已完成；
当前仍未宣称全设备、完整 2h 长片性能和细粒度结构拖拽全矩阵。失败历史已保留，复测结果单独追加记录。

如果没有：

```text
无。
```

### 6.3 可以直接复用的接口和能力

- `structureCommands.ts`：所有结构创建、拆分、边界移动/缩放、合并、删除、升降级。
- `structureContext.ts`：按整数 frame 解析 Scene/Sequence/Section 上下文和 ambiguity。
- `trackRegistry.ts`、`timelineSemantics.ts`、`useTimelineViewport.ts`：轨道注册、detail 和动态坐标。
- `normalizeAnnotationMarker.ts`：唯一 legacy Marker v17→v2 转换与 v2 校验。

### 6.4 不应重复实施的工作

- Marker legacy migration 已在 Phase 01 形成唯一 converter，不要新增第二个转换入口。
- Track Registry 已在 Phase 02 建立，不要在 `EditorTimeline` 再写轨道 label/default map。
- 结构 UI 必须继续复用 `structureCommands.ts`，不要在组件中直接拼接 `ShotGroupRecord`。

例如未来可以写：

```text
- Marker legacy migration 已在 Phase 01 完成，不要再新增第二个 converter。
- Track Registry 已在 Phase 02 建立，不要在 EditorTimeline 再写 label/default map。
```

### 6.5 当前未提交修改及归属

本次用户请求范围内，当前工作区所有 `apps/webapp`、活动架构/开发文档和本计划验证记录修改
均归属本次实施；用户原有的 `docs/Plans/` 目录保留。未执行 commit/push。

格式：

| 文件 | 修改归属 | 是否允许新 Agent 改动 | 说明 |
|---|---|---|---|

### 6.6 需要用户决定的事项

本计划阶段已知、但**不阻塞第一期**的未来问题：

1. **外部 Backup v3 是否必须恢复**
   当前项目规范只承诺当前格式。本计划默认 v4 替代 v3，不维护 runtime fallback。若实施前确认已有必须恢复的 v3 外部用户备份，需要产品 owner 明确决定是否做一次性 converter。

2. **AI Structure 的真实信号与 score**
   07A 研究已完成：当前 score 只作为未校准 raw evidence，产品建议 UI 阻塞；若要继续产品化，需要批准真实高层信号与验收样本。

3. **Dialogue / Emotion 的 canonical 数据源**
   研究已完成但当前缺失；需要字幕/转写、人工 frame segment 或批准模型输出后，才能决定产品 schema 与 persistence。

除上述外，目前：**无**。

## 7. 第一阶段总验收

状态：第一期 Phase 01–06 功能验收完成；Phase 07–09 研究/准入判断完成，但产品能力按真实数据源门槛阻塞。完整全设备与长片 KPI 不在本轮宣称范围内。

- [x] Phase 01–06 功能、代码清理、文档和现有验收完成（Git 未授权提交/推送）
- [x] Marker v2 / DB v18 / Recovery / Backup v4 真实隔离浏览器数据专项通过
- [x] Structure Boundary First、Research impact、focus/navigation 定向与关键浏览器回归通过
- [x] Semantic Zoom / Navigation 定向与关键响应式浏览器回归通过
- [x] 关键 Browser matrix：workflow、calibration、timeline、Overview/Analyze、Analysis system/consumer 通过
- [x] Phase 07A 真实 signal/score 研究与不伪造准入结论
- [x] Phase 08 Dialogue/Emotion canonical source 研究与阻塞结论
- [x] Phase 09 逐轨准入清单与不预建未来轨结论
- [x] 性能记录已补充真实浏览器、视口、fixture、规模和测量方法；完整长片 KPI 未宣称
- [x] `corepack pnpm verify:web` 在当前相关工作区实际执行并通过
- [ ] Git 状态符合任务授权；如要求推送，相关 commit 已推送并核实
- [ ] Remote branch 已核对
- [x] Active architecture docs 已同步
- [x] 无假 future Track / AI / confidence
- [x] 无旧 runtime Marker/Track/Group 主路径
- [x] verification record 没有虚假“通过”

## 8. 最终交付摘要

本轮最终状态如下：

- First-phase status: Phase 01–06 功能验收完成；Git 未授权提交/推送。
- Branch: `main`。
- Final code/record HEAD: `28d8263d627778194b92ee86160e14fee7b26997` + 未提交工作区。
- Remote: 未执行 push（未授权）。

Delivered:
- Marker v2、DB v18 migration、Recovery snapshot 和 Backup v4 round-trip。
- 六轨 Track Registry、语义 zoom、focus/navigation、Boundary First structure commands。
- Structure/Shot/Research impact 协调、持久化原子性与未来音频轨数据源准入 gate。

Verified:
- `corepack pnpm test:timeline-semantic`：21 tests passed。
- `corepack pnpm verify:web`：exit 0；typecheck、lint、build、prerender、边界检查和既有回归通过。
- 隔离 Chrome：workflow 1/1、calibration 3/3、timeline 1/1、data 1/1、Overview/Analyze 3/3、Analysis system 11/11、consumer 1/1。
- UI detector：14 个 UI 目标空结果；`git diff --check` exit 0。

Known limitations:
- 未形成全设备与 10s/5min/2h × 24/30/60fps 的完整性能 KPI；细粒度结构拖拽、autosave single-flight 独立专项和完整 Marker undo 矩阵未单独完成。

Future:
- Phase 07 Scene suggestion 产品化：等待已校准高层信号与 browser review UI。
- Phase 08 Dialogue / Emotion：等待 canonical source。
- Phase 09 Future Analysis Tracks：等待至少两类真实分析轨。

User decisions needed:
- 当前第一期无新增决定；若继续后续阶段，需要补齐上述真实数据源或批准相应产品输入。
