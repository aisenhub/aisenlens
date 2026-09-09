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
| O1 领域与存储 | 已交付 | ResearchRange/Context、半开范围、v17 stores、备份/恢复字段、结构校验、按 target 串行写入与 revision 冲突检测已实现；浏览器已完成真实 IndexedDB range round-trip 与 URL target 恢复；故障注入入口已加入仓储事务边界 | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |
| O2 会话与播放器 | 已交付 | 会话已加入 mode/scope/target/queue/follow/return 字段，URL支持研究导航参数；Analyze 内 Scenes/Shots/Sound 与 Overview 跨 stage 保持单一视频 DOM；真实 synthetic.webm 已完成播放/校准/刷新恢复回归 | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |
| O3 总览 | 已交付 | 真实时长、偶数中位数、10秒分箱、单击留在总览、显式研究入口、三类结构展示已实现；空项目已覆盖 1440×900、1280×720、768×1024、390×844 导航；1000/3000 镜头压力场景保持有界 DOM | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |
| O4 深拆 | 已交付 | Shot/Group/Range Inspector、问题/状态、证据引用、选段保存、Save & Next flush、音频范围引用、保存失败可见状态已实现；真实媒体已验证校准前后帧；输入控件已避免逐键写历史，IME 专项仍未做系统级自动化 | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |
| O5 连续性与恢复 | 已交付 | 校准应用事务会标记研究上下文待复核；研究数据进入备份/恢复边界；报告 CSV/HTML/XLSX 研究附录与 Learn Range 来源已接通；完整备份 ZIP 导入的浏览器自动化仍未纳入本轮门禁 | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |
| O6 验证与清理 | 已交付 | verify:web、领域测试、lint、UI detector、Overview/Analyze 浏览器导航、1000/3000 镜头压力、synthetic.webm 真实媒体回归均通过；build最大JS chunk约476KB；未测量真实硬件内存/网络缓存，也未单独覆盖 Cinema/Studio 主题矩阵 | `ea4a3ae` / merge `2b641e3` | 已推送到 `main` |

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
| 2026-09-09/O1–O3 | 工作树代码 | `corepack pnpm test:overview-analyze`; `corepack pnpm test:workflow`; `corepack pnpm test:editor-history`; `corepack pnpm test:retain-shot-map`; `corepack pnpm test:shot-calibration`; `corepack pnpm typecheck`; `corepack pnpm lint`; `corepack pnpm build`; `node .../detect.mjs --json ...` | Windows PowerShell；纯逻辑 fixture；无真实用户媒体 | 全部退出码 0；UI detector返回 `[]` | 8个 overview/analyze 测试通过；统计/结构/范围边界有确定性断言；build最大JS chunk约475.64KB，仍有 scene-engine `node:module` externalized 警告 | workflow曾因缺失 query 参数解析为 `fromUs=0`，已修复并重新通过 |
| 2026-09-09/O6局部 | 工作树代码 | `corepack pnpm verify:web` | Windows PowerShell；现有仓库 fixture | 退出码 0 | typecheck、lint、现有自动分镜/校准/导出/workflow/build 全部通过 | 无 |
| 2026-09-09/O4–O6 | 工作树代码 | `corepack pnpm test:overview-analyze`; `corepack pnpm test:overview-analyze-browser`; `node --test tests/features/shot-calibration/calibration-real-media.browser.test.js`; `corepack pnpm --filter @aisenlens/web lint`; `corepack pnpm build`; `node .../detect.mjs --json ...` | Windows PowerShell；浏览器隔离空项目；`synthetic.webm` 真实媒体；1440×900 / 1280×720 / 768×1024 / 390×844 | 全部退出码 0；detector返回 `[]` | 8个领域测试、3个 Overview/Analyze 浏览器场景、真实媒体校准恢复场景通过；压力场景验证1000/3000镜头下播放按钮DOM保持有界且唯一 video 不增长；build最大JS chunk约475.64KB；仍有 scene-engine `node:module` externalized 警告 | 首次浏览器脚本过早点击导航，补充等待后复测通过；首次真实媒体场景因校准页重复挂载 Analyze 视频而出现双 video，已调整 stage 挂载边界并复测通过 |

证据至少覆盖适用的：统计确定性、结构校验、IME/焦点、同播放器、两种流程往返、保存失败/冲突、校准重整、Undo、截图/声音引用、备份导入、报告与Learn回源。测试命令存在不代表执行过。

### 媒体与性能矩阵

| 素材/编码/fps/时长 | 浏览器/硬件 | PTS/定位验证 | 冷/热缓存表现 | 内存/资源变化 | 限制 |
| --- | --- | --- | --- | --- | --- |
| `synthetic.webm`；浏览器真实媒体fixture；时长/PTS由播放器与校准流程读取 | Windows PowerShell；自动选择本机 Chromium 浏览器；硬件型号未记录 | 真实素材关联、PTS 校准、前后帧双帧检查、刷新恢复通过；CFR/VFR 细分未单独记录 | 未测量冷/热缓存 | 未测量真实内存曲线；1000/3000 镜头压力已验证渲染节点有界、单一 video | 非真实用户素材；未覆盖 Cinema/Studio 主题和多浏览器硬件矩阵 |
| 1000 / 3000 条合成镜头记录；IndexedDB 夹具 | 同上 | 列表滚动与播放入口可用 | 未测量 | 可见播放按钮数量保持有界（<80），video 数量为 1 | 未做长期滚动内存采样 |

### UI矩阵

| 尺寸 | Cinema | Studio | 核心操作/焦点 | 截图位置 |
| --- | --- | --- | --- | --- |
| 1440×900 | 未验证 | 未验证 | 空项目 Overview→Analyze→Shots 导航已验证 | 无 |
| 1280×720 | 未验证 | 未验证 | 空项目 Overview→Analyze→Shots 导航已验证 | 无 |
| 768×1024 | 未验证 | 未验证 | 空项目 Overview→Analyze→Shots 导航已验证 | 无 |
| 390×844 | 未验证 | 未验证 | 空项目 Overview→Analyze→Shots 导航已验证 | 无 |

## 5. GitHub交付记录

| 阶段 | 分支 | 代码commit SHA | GitHub链接 | push结果/远程包含确认 | 记录更新提交 |
| --- | --- | --- | --- | --- | --- |
| O1–O6 | `codex/overview-analyze-upgrade` → `main` | `ea4a3ae` / merge `2b641e3` | [Pull Request](https://github.com/aisenhub/aisenlens/pull/new/codex/overview-analyze-upgrade) | 分支已推送；已合并并推送 `origin/main` | 本轮记录收口提交随后推送 |

允许先推代码，再提交记录更新；本文件记录代码SHA，不要求自我引用记录提交的最终SHA，不为此反复amend。失败保留原因和后续处理，进入下一阶段前必须补齐推送。

## 6. 交接与下一步

- 下一阶段：如继续扩展验收，可补真实 IndexedDB backup ZIP 导入自动化、系统级 IME、Cinema/Studio 主题与硬件内存/缓存矩阵；这些不阻塞本轮 Web 代码交付，但保留为明确边界。
- 本轮已解决：真实 synthetic.webm 媒体校准与刷新恢复、Overview→Analyze→Shots 多视口导航、研究范围 IndexedDB round-trip、1000/3000 镜头有界渲染；未将未测量的硬件/缓存指标伪称为已通过。
- 可复用接口：`ResearchRange`/`ResearchContext`、`validateResearchRange`、`validateStructureMembership`、`createWorkflowSearch` 研究参数、Zustand research session slice。
- 不应重复实施：不得把现有校准功能重新实现一遍；本轮只扩展校准应用后的研究状态复核。
- 未提交修改及owner：无；本 agent 已将代码与计划记录提交、推送，并合并到 `main`。
- 待用户决定：当前没有新增产品方向问题；若远程/访问权限或已有工作归属无法核实，提出具体问题。

## 7. 计划编写记录（与产品验收分开）

- 已完成：架构文档与当前相关源码读取；编写总计划、阶段计划、执行指令和本模板。
- 产品测试：基线、逻辑测试、隔离空项目浏览器导航、研究范围真实 IndexedDB round-trip、synthetic.webm 真实媒体回归、1000/3000 镜头压力与构建均已执行；真实硬件内存/缓存、系统级 IME、完整 ZIP 导入自动化仍未执行并已列明边界。
- 产品代码：本轮已修改，当前分支为 `codex/overview-analyze-upgrade`。
- Git提交/推送：代码提交 `ea4a3ae` 已推送到升级分支，合并提交 `2b641e3` 已推送到 `origin/main`；本次记录收口提交随后推送到 `main`。
- 文档本地链接检查：2026-09-09已检查本目录9份Markdown的本地链接，全部目标存在；该检查不属于产品测试。
