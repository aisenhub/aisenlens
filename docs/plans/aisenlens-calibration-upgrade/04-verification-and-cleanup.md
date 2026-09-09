# C4 — 验证、旧路径清理和第一期交付

前置：C1–C3 全部实现。禁止通过旧文档“已完成”勾选代替本轮运行。

## 1. 测试组织与命令

新测试集中于 `tests/features/shot-calibration/`，按行为拆为 draft-command、coverage、apply-transaction、media-frame 与 calibration-workflow.browser 等。复用现有 Node test 与浏览器基础设施，不引入一套新框架。根 package.json 增加明确的 `test:shot-calibration` 与 `test:shot-calibration-browser`（均为待新增脚本，实施时确保实际扫描到对应文件）。不要将 test:scene-calibration 误当本功能测试，它针对研究标定。

每次引入或修改组件后按 AGENTS.md 运行 `corepack pnpm build`。阶段完成运行 typecheck 与该阶段相关测试；最终汇总运行以下命令，不无意义重复：

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:shot-calibration
corepack pnpm test:shot-calibration-browser
corepack pnpm test:workflow
corepack pnpm test:workflow-browser
corepack pnpm test:auto-shot-contract
corepack pnpm test:auto-shot-config
corepack pnpm test:auto-shot-settings-store
corepack pnpm test:scene-calibration
corepack pnpm test:editor-history
corepack pnpm test:retain-shot-map
corepack pnpm build
```

现有其他 auto-shot apply/task tests 如位于 apps/web/test，确认脚本是否包含；未包含则通过已有运行方式显式执行。不要仅用代码文本匹配测试验证界面行为，不修改检测算法 fixtures/阈值掩盖失败。若当前环境无法运行某项，记录阻塞原因与未验证范围，不能写成通过。

## 2. 领域及事务必测矩阵

| 分类 | 用例 | 预期 |
| --- | --- | --- |
| Split | 0/结束/已有边界/一帧段/相邻重复切 | 非法写拒绝；无空段 |
| Move | ±1帧/跨邻界/拖动取消/快速连点 | 共享边界、实际帧正确、一次历史 |
| Merge | 中间切点/首尾哨兵/冲突分析 | 合并相邻、首尾禁止、用户内容不丢 |
| History | 混合编辑50步并全部撤销/重做 | 分区、ID、关联恢复；raw candidates 不变 |
| Persistence | 刷新/换项目/重新关联/旧异步写/跨标签冲突 | 草稿恢复且不串数据，不覆盖新版本 |
| Coverage | 播放、seek、后台、缓冲、循环、显式复核 | 并集正确，跳过不算已检查 |
| Apply | 每个持久化步骤故障/版本过期/重复提交 | 原子性与幂等成立 |
| References | notes/dims/screenshots/markers/groups/模板/音轨 | 保留规则与引用检查通过 |
| Recovery | 备份导出导入/恢复快照/正式undo后重进 | 草稿和正式基线匹配，旧草稿不复活 |
| Isolation | 研究标定、Analyze快捷键、候选原始记录 | 无污染无双触发 |

## 3. 可复现素材与浏览器行为

复用已有 fixture 生成脚本/工具，按用户安装缓存路径约束准备。不要把真实用户视频提交仓库。生成确定性画面含源帧号，便于肉眼及截图验证；真实运动素材用于补充体验评估。

- A：短片，已知硬切；构造漏一个检测边界的草稿，补切到精确帧。
- B：边界偏移±1/±3帧；移动后双画面显示正确源帧号。
- C：误切、极短镜头、静态长镜头；能合并，长镜头不被标为确定漏切。
- D：淡入淡出/叠化与影片尾段；面板范围真实，不越界请求。
- E：23.976/29.97 和 VFR；验证实际声明支持范围，不支持精调时给出真实原因。
- F：媒体缺失/重新关联错误文件/解码失败；无错误画面标签、无无声写入。
- G：已有笔记、截图、分组、标记的项目；校准后内容和恢复链完整。

端到端主用例：Prepare完成检测 → 进入校准 → 连续播放 → 回退逐帧补漏切 → 移动已有边界 → 删除误切 → Undo/Redo → 添加待回看 → 刷新 → 定位并处理 → 完成预览 → 应用 → Overview/Analyze检查 → 再进校准 → 正式Undo → 再进校准。

另测部分复核应用：未巡视区间和待回看保留，界面无“全部完成”假状态。

## 4. UI、无障碍与性能

双主题 × 1440×900、1280×720、768×1024、390×844。用真实页面浏览器检查，截图必须含媒体真实画面或明确缺媒体状态，不用造数掩盖不可用。

- 鼠标和键盘均能完成补切与边界调整；焦点可见，折叠面板返回焦点正确。
- 输入备注时 Enter/Space/Delete 不触发视频命令；拖动有按钮替代。
- 状态不只靠颜色；帧号和时间码可读，状态通知不过度打断。
- 窄屏不要求同时展开所有面板，按钮无横向溢出，视频比例正确。
- 1,000/3,000 镜头列表的DOM有界；定位、平移、撤销无明显主线程阻塞。
- 连续20次平移/选界/切页面后无重复video/decoder、未释放URL无界增长。
- 记录冷/热缓存和硬件数据；缓存仅针对派生图像，不能清掉草稿、快照或用户截图。

使用技能要求的有界视觉检查流程，集中检查再修复，不无限来回打磨。必须完成真实功能验证，不能只运行视觉检测器。

## 5. 清理旧路径

1. 从普通 Calibrate 移除 CandidateReviewQueue 的保留/排除编辑路径，替换为草稿镜头/待回看导航。
2. CandidateEvidencePanel 可重构成按需检测详情；确认无调用再删除无用组件，研究用真实证据不删。
3. 删除旧产品 applyAutoShotCuts/previewAutoShotCuts 编排与旧 Dialog 分支，所有产品应用进入新统一服务。必要纯区间函数若仍被引擎契约/研究使用则保留其真实用途，不能为兼容旧产品UI留双写。
4. 原 task review.excludedCandidateIds 若当前运行格式不再使用，删除活跃产品消费者与写入，审查类型及序列化后移除废弃字段；不新增“旧用户走旧模式”。保持原始检测事件和研究记录有效。
5. 正式编辑器 Split/Merge/Move 继续保留，经统一的纯规则或领域命令调用；不用新校准草稿强行替代 Analyze 业务。
6. 快捷键注册、自动保存 effect、task controller 清理后验证只剩一条有效写入路径。
7. 更新旧 workflow P03 的说明，链接本计划并注明相关规则被取代；不得将其全部改成未实施或重做不相关模块。
8. 研究获得新证据才更新 reference index；文档标状态只在本轮验收完成后修改。

## 6. 最终交付记录

`verification-record.md` 必须包含：

- 基线 commit、最终 commit/未提交状态、实际更改文件及职责。
- C0–C4 每阶段完成项与剩余项。
- 各命令、日期、退出码、失败原因及修复；不得伪造未跑测试。
- 浏览器版本、素材fps/时长/编码、双主题截图位置与实际观察。
- 事务故障注入结果、内容保留/恢复验证、幂等验证。
- 性能观测和帧精度支持矩阵，明确 VFR/其他格式未验证项。
- 新增依赖及原因（预期没有）、未修改引擎/算法声明对应 diff。
- 第二期尚未实施事项。

报告主结果必须说明用户现在如何发现并修复漏切、数据应用是否安全、哪些限制仍存在。只有 C0–C4 必需项完成才可称第一期完成；不要用“已搭好页面，之后可接逻辑”交付。
