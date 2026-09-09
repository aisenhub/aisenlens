# O6 — 整体验证、性能、旧路径清理与交付

状态：已交付。前置：O0–O5已交付。verify:web、领域/浏览器/真实媒体回归、压力场景、lint、typecheck、build 与 UI detector 已运行；不能以旧workflow“已验证”替代本轮运行。

## 1. 测试入口

新测试集中 `tests/features/overview-analyze/`，采用现有Node test/浏览器基础设施，不新增框架。

- `test:overview-analyze`：O1待新增，目录内全部纯逻辑/仓储测试，空收集必须失败。
- `test:overview-analyze-browser`：O2–O4待新增，运行真实浏览器场景及必要故障注入；对运行条件给出清楚错误，不能条件不满足直接skip还声称通过。

本轮已核实存在的相关命令：typecheck、lint、build、test:workflow、test:workflow-browser、test:editor-history、test:retain-shot-map、test:auto-shot-contract、test:scene-calibration；工作区新校准还提供test:shot-calibration及test:shot-calibration-browser，O0重新核实。

最终执行：

```powershell
corepack pnpm typecheck
corepack pnpm lint
corepack pnpm test:overview-analyze
corepack pnpm test:overview-analyze-browser
corepack pnpm test:workflow
corepack pnpm test:workflow-browser
corepack pnpm test:editor-history
corepack pnpm test:retain-shot-map
corepack pnpm test:shot-calibration
corepack pnpm test:shot-calibration-browser
corepack pnpm test:auto-shot-contract
corepack pnpm test:scene-calibration
corepack pnpm build
```

按实际改动补充现有report/备份/视频导出测试；不要为UI更改重跑全部native引擎平台。每次修改组件依项目规则build；最终汇总通过后无新变化不反复跑同一批测试。已有不相关失败注明基线，不宣称整体全绿。

## 2. 领域验收矩阵

| 范围 | 必测 |
| --- | --- |
| Structure | 单镜、同层冲突、Sequence部分包含拒绝、Section跨层、删除/校准失效保留summary |
| Research | 时间范围半开/边界/媒体身份、同目标正文唯一、状态明确操作、证据失效可恢复 |
| Session | scope/target/playhead分离、筛选队列、临时范围、返回快照、非法URL/缺ID |
| Persistence | 写失败、冲突、晚到响应、跨项目/标签、数据库升级、备份round-trip |
| Statistics | 偶数中位、10秒箱边界/末箱/缺口、选区截到半镜、PTS与地图比例 |
| Continuity | 校准补切/移点/合并、正式Undo/Redo、版本变化后完成需复核 |
| Contents | 所有模板类型、原笔记/截图/音轨/Marker/报告与Learn回源 |

测试断言用户可观察结果和数据不变量，不靠搜索组件字符串充当行为测试，也不将实现常量复制一遍作为测试。

## 3. 两条核心端到端

### 顺序记录路径

打开已有项目→进入全片顺序→筛选→记录一镜→播放越过下一镜继续输入→保存并下一镜→选连续范围→范围研究并写问题/引用→返回原顺序队列→刷新→继续上次位置。

验收：target不随播放串写，筛选顺序/滚动恢复，原笔记与范围记录分别只有一份；无Scene仍能完成。

### 总览选段路径

总览就地预览→选择范围→创建单镜/多镜场景与上层结构→深入研究→切Scenes/Shots/Sound→截图/自定义字段/声音范围观察→写总结→返回总览→从已有成果再进入→定位校准→应用→返回→检查状态→备份并导入。

验收：同一观看运行时、结构合法、声画证据真实、总览位置恢复、校准后引用正确或明确待复核、报告含内容。

## 4. 故障与无障碍

媒体缺失、错误关联、解码失败、取帧旧响应、保存失败、存储空间不足、版本冲突、失效引用、缺失导航目标必须有实际恢复动作。无网络时本地已有素材/记录能继续使用；没有权限不伪装空项目。

键盘能选范围（时间输入替代拖动）、进入研究、切对象、保存下一镜与返回。输入框中文IME、Enter/Space/Delete不触发背景命令；焦点可见，面板关闭返回合理焦点，保存错误不抢走或丢掉输入。

不能因为快照/脚本失败关闭typecheck或删除关键用例。故障验证可在隔离测试库/fixture中执行，不破坏真实用户项目。

## 5. 布局与性能

Cinema/Studio × 1440×900、1280×720、768×1024、390×844，真实浏览器检查核心动作。窄屏允许面板切换，但不重建播放器、不隐藏唯一提交入口；色彩不承担唯一状态表达。

使用现有生成素材及带帧号可验证fixture，不提交用户视频。覆盖CFR、非整数fps、当前明确支持的VFR、无音轨/有音轨、长短镜混合。

压力数据1,000和3,000镜头：可视DOM/取帧请求有界，20次平移/切目标/切view后video/decoder/对象URL数量不无界增长。记录机器、浏览器、媒体时长/编码、冷/热缓存定位延迟、明显长任务和内存变化；不在未测设备上承诺固定毫秒数。

总览首屏不能强制等待全片逐帧解码才显示文字与已有范围。高频播放回调不重算全片统计或重渲染全部列表。复用既有虚拟化/可视区机制，必要时改组件行为而非盲目新增依赖。

## 6. 旧路径清理

1. ContextInspector按显式target切换，删除group存在即抢焦点逻辑。
2. 移除Scenes专属的大工作区挂载路径，新Viewer保持唯一，原成熟工具在新对应位置可用。
3. 合并ShotList/ShotBrowser重复搜索与写动作，不要求为省文件删掉必要不同展示；功能契约统一。
4. 清理workflowView==='scenes'的证据加载门控，改为真实消费者与生命周期。
5. 全部group消费者采用O1规则，删除跨kind occupied和至少两镜的旧隐含约束；不得只改创建入口。
6. 清理旧统计误导文案和假10秒窗口，减少直接shot.duration与PTS并行口径。
7. 更新旧workflow P04/P05说明其本范围被此计划取代，不篡改历史提交记录。
8. 删除无用组件/导入/重复状态与废弃入口前确认消费者；不触及无关校准研究工具。

## 7. 完成门槛与GitHub

所有本期需求都有真实实现和对应测试，关键风险已验证；未跑项如实列出且不能把必需未验项称为完成。更新verification-record和阶段状态，检查diff/文档链接/未跟踪文件，按总计划§7提交并push O6所有必要代码和记录。

最终向用户报告：两条流程现在如何操作、重要代码改变、测试结果、数据保护/媒体支持边界、分支与阶段GitHub提交链接、仍存在的限制。部署、合并main和第二期功能不在本任务授权内。
