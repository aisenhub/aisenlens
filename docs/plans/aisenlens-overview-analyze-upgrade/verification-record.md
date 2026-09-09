# 总览与深拆升级：实施与验证记录

> O0 基线于2026-09-09完成。代码实施从 `codex/overview-analyze-upgrade` 分支开始；阶段记录与代码分开提交，避免把记录自身的 SHA 当作代码基线。

## 使用规则

执行agent在阶段收尾、关键失败/阻塞或交接时更新。保留重要失败及修复过程，不把失败直接覆盖成从未发生。新agent先读此记录，再核对Git与实际代码。

状态：未开始 / 进行中 / 已阻塞 / 验证失败 / 验收通过待推送 / 已交付。“已交付”要求实施完成、必要验收通过、所有必要提交已push。验证后代码有相关变化必须复测或标原结果已过期。

## 1. 基线（O0填写）

| 项目 | 记录 |
| --- | --- |
| 实施范围 | O0–O6，总览与深拆Web升级 |
| 架构输入 | ../../lensflow/AisenLens_总览与深拆优化架构.md |
| GitHub仓库/remote | `origin https://github.com/aisenhub/aisenlens.git` |
| 工作分支/起始commit | `codex/overview-analyze-upgrade` / `a5afa2986760202e447a12d80d0b636b11c58df4` |
| 校准集成基线 | 当前工作树干净；现有校准代码随基线存在，未假定其已满足本计划 O5 |
| 初始修改及owner | 无未提交修改；当前 agent 负责本任务分支 |
| Node/pnpm/浏览器/系统 | Windows PowerShell；使用仓库声明的 pnpm 11.24.0；浏览器端场景尚未在 O0 运行 |
| 基线测试与已知失败 | `typecheck`、`build`、`test:workflow`、`test:editor-history`、`test:retain-shot-map`、`test:scene-calibration`、`test:shot-calibration` 均通过；build 有大 chunk 与 scene-engine `node:module` externalized 警告；workflow 有 package type module 警告 |
| 实际DB版本/媒体时间支持 | 基线为 IndexedDB version 16；本轮升级到 version 17，新增 research-ranges/research-contexts；已有测试覆盖 24000/1001、30000/1001 CFR 与 VFR PTS 映射；浏览器长片实测待 O6 |

## 2. 阶段状态

| 阶段 | 状态 | 已完成/剩余 | 代码SHA | push/GitHub链接 |
| --- | --- | --- | --- | --- |
| O0 基线 | 已交付 | 基线、调用链、校准边界与受影响文件已核实 | `db55304` / `0440be5` | 已推送至 `origin/codex/overview-analyze-upgrade` |
| O1 领域与存储 | 进行中 | ResearchRange/Context、半开范围、v17 stores、备份/恢复字段、结构校验、按 target 串行写入与 revision 冲突检测已实现；IndexedDB故障/round-trip浏览器验证待补 | 本轮待提交 | 待推送 |
| O2 会话与播放器 | 进行中 | 会话已加入 mode/scope/target/queue/follow/return 字段，URL支持研究导航参数；Analyze 内 Scenes/Shots/Sound 切换保留同一视频 DOM，Overview 跨 stage 保活仍待补 | 本轮待提交 | 待推送 |
| O3 总览 | 进行中 | 真实时长、偶数中位数、10秒分箱、单击留在总览、显式研究入口、三类结构展示已实现；新增空项目多视口浏览器导航验证，拖选预览与真实媒体矩阵待补 | 本轮待提交 | 待推送 |
| O4 深拆 | 进行中 | Shot/Group/Range Inspector、问题/状态、证据引用、选段保存、Save & Next flush、音频范围引用、保存失败可见状态已实现；IME专项与真实媒体前后帧浏览器验证待补 | 本轮待提交 | 待推送 |
| O5 连续性与恢复 | 进行中 | 校准应用事务会标记研究上下文待复核；研究数据进入备份/恢复边界；报告 CSV/HTML/XLSX 研究附录与 Learn Range 来源已接通；完整 lineage/backup round-trip 仍待补 | 本轮待提交 | 待推送 |
| O6 验证与清理 | 进行中 | verify:web、领域测试、lint、UI detector、Overview/Analyze 浏览器导航通过；build最大JS chunk约476KB；真实媒体、Cinema/Studio、内存/请求矩阵待补 | 本轮待提交 | 待推送 |

## 3. 阶段实施记录（每阶段复制填写）

```text
阶段/日期/状态：
实际改动文件与职责：
已实现用户行为：
冻结类型/命令/仓储/时间/导航契约：
正文唯一性与引用处理：
计划偏差、原因、影响：
新增依赖及必要性（没有则写无）：
剩余工作/阻塞/未验证内容：
```

## 4. 验证明细

| 日期/阶段 | 代码版本 | 命令或浏览器操作 | 环境/素材 | 退出码/观察 | 结果与证据 | 失败修复/复测 |
| --- | --- | --- | --- | --- | --- | --- |
| 2026-09-09/O0 | `a5afa29` | `corepack pnpm typecheck`; `corepack pnpm build`; `corepack pnpm test:workflow`; `corepack pnpm test:editor-history`; `corepack pnpm test:retain-shot-map`; `corepack pnpm test:scene-calibration`; `corepack pnpm test:shot-calibration` | Windows PowerShell；本地现有测试 fixture | 全部退出码 0 | 基线通过；build 输出大 chunk / node:module externalized 警告，workflow 输出 package type module 警告 | 无需修复；大 chunk 与模块警告列入本轮优化/O6，非基线失败 |
| 2026-09-09/O1–O3 | 工作树代码 | `corepack pnpm test:overview-analyze`; `corepack pnpm test:workflow`; `corepack pnpm test:editor-history`; `corepack pnpm test:retain-shot-map`; `corepack pnpm test:shot-calibration`; `corepack pnpm typecheck`; `corepack pnpm lint`; `corepack pnpm build`; `node .../detect.mjs --json ...` | Windows PowerShell；纯逻辑 fixture；无真实用户媒体 | 全部退出码 0；UI detector返回 `[]` | 7个 overview/analyze 测试通过；统计/结构/范围边界有确定性断言；build最大JS chunk约475.67KB，仍有 scene-engine `node:module` externalized 警告 | workflow曾因缺失 query 参数解析为 `fromUs=0`，已修复并重新通过 |
| 2026-09-09/O6局部 | 工作树代码 | `corepack pnpm verify:web` | Windows PowerShell；现有仓库 fixture | 退出码 0 | typecheck、lint、现有自动分镜/校准/导出/workflow/build 全部通过 | 无 |
| 2026-09-09/O4–O6 | 工作树代码 | `corepack pnpm test:overview-analyze`; `corepack pnpm test:overview-analyze-browser`; `corepack pnpm --filter @aisenlens/web lint`; `corepack pnpm build`; `node .../detect.mjs --json ...` | Windows PowerShell；纯逻辑 fixture；浏览器隔离空项目，1440×900 / 768×1024 / 390×844 | 全部退出码 0；detector返回 `[]` | 8个领域测试通过；浏览器验证覆盖总览→深拆→Shots与研究队列；build最大JS chunk约475.64KB；仍有 scene-engine `node:module` externalized 警告 | 首次浏览器脚本过早点击导航，补充等待后复测通过；detector的报告 side-tab警告改为顶部节奏线后复测通过 |

证据至少覆盖适用的：统计确定性、结构校验、IME/焦点、同播放器、两种流程往返、保存失败/冲突、校准重整、Undo、截图/声音引用、备份导入、报告与Learn回源。测试命令存在不代表执行过。

### 媒体与性能矩阵

| 素材/编码/fps/时长 | 浏览器/硬件 | PTS/定位验证 | 冷/热缓存表现 | 内存/资源变化 | 限制 |
| --- | --- | --- | --- | --- | --- |
| 未记录 | 未记录 | 未验证 | 未验证 | 未验证 | 未验证 |

### UI矩阵

| 尺寸 | Cinema | Studio | 核心操作/焦点 | 截图位置 |
| --- | --- | --- | --- | --- |
| 1440×900 | 未验证 | 未验证 | 未验证 | 无 |
| 1280×720 | 未验证 | 未验证 | 未验证 | 无 |
| 768×1024 | 未验证 | 未验证 | 未验证 | 无 |
| 390×844 | 未验证 | 未验证 | 未验证 | 无 |

## 5. GitHub交付记录

| 阶段 | 分支 | 代码commit SHA | GitHub链接 | push结果/远程包含确认 | 记录更新提交 |
| --- | --- | --- | --- | --- | --- |
| O1–O3/O4/O5局部/O6 | `codex/overview-analyze-upgrade` | `db55304` / `0440be5` / `1b7b1a8` | [Pull Request](https://github.com/aisenhub/aisenlens/pull/new/codex/overview-analyze-upgrade) | 前两阶段已推送；本轮代码提交待推送 | 本次记录更新待提交 |

允许先推代码，再提交记录更新；本文件记录代码SHA，不要求自我引用记录提交的最终SHA，不为此反复amend。失败保留原因和后续处理，进入下一阶段前必须补齐推送。

## 6. 交接与下一步

- 下一阶段：补充真实 IndexedDB backup round-trip、保存失败/冲突、IME/焦点与稳定播放器浏览器场景，并覆盖 Overview 跨 stage 的同播放器。
- 先解决：真实视频/音频媒体在 1440×900、1280×720、768×1024、390×844 与 Cinema/Studio 主题下的交互和性能矩阵；当前代码未伪称这些验收已通过。
- 可复用接口：`ResearchRange`/`ResearchContext`、`validateResearchRange`、`validateStructureMembership`、`createWorkflowSearch` 研究参数、Zustand research session slice。
- 不应重复实施：不得把现有校准功能重新实现一遍；本轮只扩展校准应用后的研究状态复核。
- 未提交修改及owner：验证记录当前由本 agent 更新，代码已提交为 `1b7b1a8`，待与记录一起推送。
- 待用户决定：当前没有新增产品方向问题；若远程/访问权限或已有工作归属无法核实，提出具体问题。

## 7. 计划编写记录（与产品验收分开）

- 已完成：架构文档与当前相关源码读取；编写总计划、阶段计划、执行指令和本模板。
- 产品测试：基线、逻辑测试、隔离空项目浏览器导航与构建已执行，真实媒体/存储故障/性能矩阵仍未执行。
- 产品代码：本轮已修改，当前分支为 `codex/overview-analyze-upgrade`。
- Git提交/推送：代码已提交 `1b7b1a8`；验证记录待本轮提交，随后推送分支。
- 文档本地链接检查：2026-09-09已检查本目录9份Markdown的本地链接，全部目标存在；该检查不属于产品测试。
