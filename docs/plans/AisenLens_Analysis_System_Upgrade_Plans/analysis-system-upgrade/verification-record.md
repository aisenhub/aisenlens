# Verification Record — AisenLens Analysis System Upgrade

> 2026-09-10 文档修订版。所有产品阶段仍未开始、未验证；源码审查与文档检查不是产品测试。
> 技术验收与 Git 状态分开维护，不预填通过、commit 或 push。

## 1. 审查记录（不是实施基线）

- 已确认本地目录：E:\Projects\Aisenlens。
- 前次只读审查 HEAD：eb67acbf2dab9768f24e227a36b655a7753f29c1。执行时必须重新核实。
- 已读取模板模型/validator/default/editor、Editor History、普通保存、校准故障注入、ShotInspector 及计划文档。
- 已确认源码缺口：破坏性值规范化；会话保存基线读取最新 DB；普通保存未接 template-write 注入；History 原先未包含 template；完成度推导 confirmed。
- 未做：产品 build/test、浏览器复现、用户 IndexedDB 盘点、产品实现、依赖安装、commit/push。
- 文档修订时工作区存在产品源码修改，包括 templateService、EditorWorkspace、校准及 auto-shot 相关文件；归属未验证，文档任务未改这些文件。执行时重查，不复用此列表认领修改。
- 本次没有新读参考项目源码，不能把历史 reference index 当新研究结果。

## 2. 实施基线（执行 agent 填写）

| 项目 | 实际值 |
| --- | --- |
| cwd / branch / HEAD | 未验证 |
| remote | 未验证 |
| 初始 git status 与修改归属 | 未验证 |
| Node/pnpm / 浏览器 / OS | 未验证 |
| package scripts 是否存在 | 未验证 |
| 已知基线失败 | 未验证 |
| 真实旧项目/Recovery/导出数据保留范围 | 未验证 |
| 数据处理方案、备份和范围授权（如有需要） | 未开始；不默认转换或清库 |
| 本轮 commit/push 授权范围 | 以执行时指令为准 |

## 3. 阶段状态

技术状态：未开始 / 进行中 / 已阻塞 / 验证失败 / 技术验收通过。
Git 状态：未提交 / 本地已提交 / 待推送 / 已推送 / 未授权或不适用。

| 阶段 | 技术状态 | 技术前置 | 剩余 | Git 状态 | commit / remote 证据 |
| --- | --- | --- | --- | --- | --- |
| P1 安全字段闭环 | 进行中 | 本地/研究核实 | fault/旧数据/并发矩阵 | 未提交 | HEAD 0dbc104；本轮无 commit |
| P2 模板管理 | 进行中 | P1 技术代码已接入 | 浏览器草稿与 Apply 验收 | 未提交 | HEAD 0dbc104；本轮无 commit |
| P3 连续录入 | 进行中 | P2 技术代码已接入 | Focus/Batch/IME/性能验收 | 未提交 | HEAD 0dbc104；本轮无 commit |
| P4 最小 AI 契约 | 进行中 | 纯函数与接缝实现 | 完成阶段交接与更完整矩阵 | 未提交 | HEAD 0dbc104；本轮无 commit |
| P5 验证清理 | 进行中 | 首轮 typecheck/lint/build/回归 | 全量数据与浏览器收口 | 未提交 | HEAD 0dbc104；本轮无 commit |

## 4. 每阶段追加模板

### P# — 阶段名称

- 技术状态 / Git 状态：
- 真实修改文件、职责与已有改动处理：
- 已完成用户行为：
- 与共享契约偏差、证据、影响及同步文档：
- 模块研究来源与实际文件：
- 新增依赖及必要性：
- 新增测试命令：
- 当前剩余 / 阻塞：
- 下阶段可复用类型、命令、组件：
- 数据范围处理结果 / 未支持格式：
- 明确未验证项：
- 不应重复实施的工作：

## 5. 每次验证追加模板

- 日期时间 / 阶段 / 验证项：
- branch / HEAD / 未提交差异标识：
- OS / Node / pnpm / 浏览器：
- 实际命令：
- exit code：
- 结果摘要与日志/截图路径：
- 失败原因 → 修复 → 复测：
- 是否仍覆盖当前代码：
- 若未运行，具体原因：

保留失败记录。修改相关代码后复测或将结果标过期；“测试通过”不能代替命令与证据。

## 6. 数据与事务矩阵

以下全部初始为未验证；实施时补 HEAD、方法和证据。

| 验证项 | 状态 | HEAD / 方法 / 证据 |
| --- | --- | --- |
| definitions/usages 分离，自定义移除/切换/reload/重新加入恢复 | 未验证 | 未记录 |
| optionId 改 label、停用与恢复 | 未验证 | 未记录 |
| 已 Apply kind 不原地改、同名不串值 | 未验证 | 未记录 |
| 无关保存不清非法已有值 | 未验证 | 未记录 |
| Registry 变化不影响完整冻结定义 | 未验证 | 未记录 |
| set/unset/unknown/NA、false/0、多选集合 | 未验证 | 未记录 |
| description 不双写 | 未验证 | 未记录 |
| Apply/no-op/Undo/Redo/版本与草稿冲突 | 未验证 | 未记录 |
| 文本合并 history、IME 与原生撤销 | 未验证 | 未记录 |
| required 不阻止保存、不伪造人工确认 | 未验证 | 未记录 |
| 两会话经真实 hook 交错保存拒绝旧状态 | 未验证 | 未记录 |
| 同会话保存中输入、连续保存、同毫秒令牌 | 未验证 | 未记录 |
| 同会话 Research/元数据写入与基线协调 | 未验证 | 未记录 |
| 普通保存 project/shot/template fault 确实触发 | 未验证 | 未记录 |
| abort/请求失败无部分提交、无未处理 rejection | 未验证 | 未记录 |
| 失败内存/dirty/基线保留与重试 | 未验证 | 未记录 |
| 当前格式 Recovery 全量一致 | 未验证 | 未记录 |
| 旧数据范围已核查并按授权处理 | 未验证 | 未记录 |
| Overlay/Export/Learn 新模型回归 | 未验证 | 未记录 |
| AI stale/幂等/非法值/Reject 守卫 | 未验证 | 未记录 |
| 无生产 fixture/运行按钮/假请求 | 未验证 | 未记录 |

## 7. 浏览器矩阵

| 场景 | 状态 | 环境 / 操作 / 证据 |
| --- | --- | --- |
| 暗亮 / 宽中窄 / 空项目 / description-only | 未验证 | 未记录 |
| 真实字段填写与保存重载 | 未验证 | 未记录 |
| 任务选择、预览、高级编辑与 dirty draft 导航 | 未验证 | 未记录 |
| Apply/Undo/Redo、字段与选项恢复 | 未验证 | 未记录 |
| Focus range/sequential/最后一镜/跳过清空 | 未验证 | 未记录 |
| 多选显式确认、九项以上选项 | 未验证 | 未记录 |
| IME/输入焦点/重复键/弹层 Escape | 未验证 | 未记录 |
| Batch 覆盖与范围外选择、一次 Undo | 未验证 | 未记录 |
| 保存失败/跨标签页冲突 | 未验证 | 未记录 |
| Research/Evidence/Overlay/Export/Learn | 未验证 | 未记录 |

## 8. 性能记录

- 场景：10/100/1,000 shots；6/20 fields；重点 1,000 × 20。
- 连续20次录入、长文本/IME、100镜批量/Undo、表格滚动、保存中输入。
- 日期 / HEAD / 浏览器 / 硬件：
- 输入到显示 / 长任务 / History 内存 / resolver 重算：
- 序列化 / 事务耗时 / profiler 证据：
- 发现 → 改动 → 有界复测：
- 结论与局限：

初始均未验证；不预填跨设备 SLA。

## 9. Git 记录

- 阶段 / 授权范围：
- 本地 code commit：
- record/docs commit：
- remote / branch：
- 推送结果 / remote 是否包含 commit：
- 链接：
- 待推送原因 / 后续处理：

可先提交代码再更新记录，不 amend 追逐自身 SHA。网络失败不阻断已满足技术前置的本地工作，不能虚报远程完成。

## 10. 当前交接

2026-09-10 执行 agent 已完成 P1–P4 的首轮实现，尚未宣称阶段验收通过。下一步应继续做真实模板/保存失败/跨标签页数据矩阵与模板/Focus/Batch 浏览器验收；没有旧项目数据盘点，不执行默认转换或清库。Git 操作依据执行时用户授权，文档不自授权限。

## 11. 本次文档检查（非产品验收）

- 日期：2026-09-10。
- 检查范围：本目录及上级架构正文，共 12 份 Markdown。
- 已执行：逐文件检查相对 Markdown 链接目标是否存在、围栏代码块是否成对；结果零问题。
- 已执行：检索旧计划目录、字符串 options 类型、旧平面 Profile 类型、旧 AI capability/配置及推送前置残留；未发现继续生效的冲突要求。P4 中旧阈值只出现在明确禁止的说明中。
- 架构副本已改为指向唯一正文的入口；旧阶段文件名保留便于交接，P4 正文已明确缩减范围。
- 本次仅修改计划文档，没有修改产品代码，没有执行产品 build/test、安装、提交或推送。
- 上述文档检查不改变 P1–P5 的“未开始/未验证”状态。

## 12. 2026-09-10 执行记录

### 实施基线与范围

- cwd：`E:\Projects\Aisenlens`；branch：`main`；执行核实时 HEAD：`0dbc1046fb45e0a07444a92d9d9326463638e902`；remote：`origin https://github.com/aisenhub/aisenlens.git`。
- Node：`v24.19.0`；pnpm：`11.24.0`；Windows；Chrome/Edge 未通过 PATH 探测，但仓库浏览器 harness 能自行找到可用浏览器。
- 执行期间 HEAD 从先前只读基线推进到 `0dbc104`，该提交不是本轮创建；本轮未 commit、未 push，未覆盖其既有自动分镜/校准与计划文档修改。
- 当前工作区保留既有产品修改，并新增分析系统相关未提交修改；未安装依赖，未处理真实旧 IndexedDB 数据。

### 阶段状态更新

| 阶段 | 技术状态 | 本轮已完成 | 尚未完成 | Git 状态 |
| --- | --- | --- | --- | --- |
| P1 安全字段闭环 | 进行中 | definitions/usages/冻结 Profile、结构化 entry、命令写入、普通事务保存基线、History 纳入 template、Overlay/Export 读取新模型 | fault 注入矩阵、旧数据范围、完整 Recovery/并发真实链路 | 未提交 |
| P2 模板管理 | 进行中 | Profile 选择、三栏草稿、Apply/版本校验/无变化不提交、字段库复用、移除保留 definition/value | 浏览器 dirty draft、完整 Apply/Undo/Redo 与受影响数量 diff 验收 | 未提交 |
| P3 连续录入 | 进行中 | Detail/Focus 共用 resolver/entry、队列导航、复制上一镜、显式 Batch 预览/一次写入/一次 History | IME/弹层/多视口及 Batch 全矩阵浏览器验收、专业 profiler 记录 | 未提交 |
| P4 最小 AI 契约 | 进行中 | AICandidate、stale/conflict/非法值/证据/confidence 守卫、幂等 Accept、唯一命令接缝与 4 项专项测试 | 未接入 provider/Review UI（按计划本期不做） | 未提交 |
| P5 验证清理 | 进行中 | 旧 renderer/`DIM_REFS` 删除、旧 optionId 输出路径清理、类型/构建/既有浏览器回归 | 全量数据矩阵、verification 完整收口、用户授权后的提交/推送 | 未提交 |

### 已执行验证

- `corepack pnpm --filter @aisenlens/web typecheck`：exit 0。
- `corepack pnpm lint`：exit 0。
- `corepack pnpm build`：exit 0；Vite 构建和 public route prerender 完成。保留 scene-engine 的既有 `node:module` browser externalization warning，未将其误判为本轮失败。
- `corepack pnpm --filter @aisenlens/web test:editor-history`：exit 0，4 tests passed。
- `corepack pnpm --filter @aisenlens/web test:overview-analyze`：exit 0，8 tests passed。
- `corepack pnpm --filter @aisenlens/web test:analysis-contract`：exit 0，4 tests passed；该脚本为本轮新增专项命令。
- `corepack pnpm --filter @aisenlens/web test:overview-analyze-browser`：最终复跑 exit 0，3 tests passed，包含 1440/1280/768/390 视口、Sound 研究范围 IndexedDB 往返/URL 恢复与 1,000/3,000 镜头有界 DOM 压力场景。此前一次复跑出现 Sound 创建等待超时；同一 harness 的手动路径可复现成功，随后完整复跑通过，按时序波动记录，不作为产品失败证据。
- 首次 `corepack pnpm verify:web` 在新增代码尚未收敛时发现 `useState`、export 类型、system profile helper、Error cause 与集合比较等问题；已修复并由上述独立命令复测。
- 最终 `corepack pnpm verify:web`：exit 0；在最后一轮 History 输入合并修复后重新执行，包含 typecheck、lint、editor history、retain shot map、auto-shot 全套契约/服务测试、scene calibration、platform integration、video export boundary、workflow tests 与 build/prerender。
- Impeccable detector 对本轮改动的模板、Detail/Focus/Batch 输入与 EditorWorkspace 执行：零 findings；`git diff --check`：无 whitespace error。

### 本轮实际架构决定

- 系统 Registry 只负责创作，项目 Profile snapshot 负责解释运行时；系统定义不可直接覆盖已冻结项目定义。
- `AnalysisFieldEntry` 区分 `set`/`unknown`/`not_applicable`；清空是删除 entry，不再把空文本/空多选伪装成未知。
- 模板编辑器只在本地 draft 中变更，Apply 才推进 Profile version 并进入 Editor History；required 只提供完成度，不阻止保存。
- 普通 editor save 使用加载/上次成功保存的 expectedUpdatedAt，不在保存前读取最新 DB token；事务 fault point 覆盖 project/shots/groups/markers/template/research。
- P4 没有生产 AI provider、候选 store、Review 页面或假请求；只保留纯校验与字段命令接缝。

### 仍未验证与明确限制

- 尚未核查用户真实旧项目、Recovery、导出数据格式，也未提供 V1 fallback；当前格式读取校验失败会报错并保留原库，不做隐式迁移。
- 尚未用真实两标签页 hook 交错复现冲突，也未逐个触发普通保存 fault injector 并检查 IndexedDB rollback；校准事务成功不作为该项证据。
- 尚未完成模板 dirty draft、Focus/Batch/IME、保存失败与跨标签页冲突的浏览器脚本验收。
- 未承诺跨设备毫秒级 SLA；压力浏览器测试仅证明已有研究队列 DOM 有界，不等于 1,000×20 全部交互性能通过。
- 已完成 Analyze 浏览器回归的当前代码复跑；模板 dirty draft、Focus/Batch/IME、保存失败与跨标签页冲突的专项脚本仍需补齐。

