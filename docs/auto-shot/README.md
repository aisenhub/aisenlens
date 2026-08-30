# AisenShot 自动分镜文档索引

> 当前状态：通用/影视与短视频已冻结为 production version 1；动画/游戏、访谈/Vlog 保留为 research，暂不在普通编辑器开放。

此目录是自动分镜长期维护文档的唯一入口。阶段过程报告、临时交接和一次性验证记录已在归档时提炼；它们不再单独维护，以避免和当前实现产生两套事实来源。

## 权威文档

| 文档 | 用途 | 更新时机 |
| --- | --- | --- |
| [ARCHITECTURE.md](ARCHITECTURE.md) | C++/WASM/Worker、媒体身份、任务与结果应用的长期架构边界 | 架构或公共契约改变时 |
| [CONTROL_SYSTEM.md](CONTROL_SYSTEM.md) | Web 控制面、预设、resolver、任务快照、候选审阅和标定入口 | 产品控制逻辑改变时 |
| [IMPLEMENTATION_PLAN.md](IMPLEMENTATION_PLAN.md) | 已完成阶段、未关闭工程任务和执行门槛 | 任务状态改变时 |
| [REGRESSION_CONTRACT.md](REGRESSION_CONTRACT.md) | 标注、评分、媒体可追溯和时间映射的稳定回归契约 | 评分或数据契约改变时 |
| [PRODUCTION_V1_ARCHIVE.md](PRODUCTION_V1_ARCHIVE.md) | 当前 production v1 的范围、冻结配置、验证证据和已知限制 | production 基线晋升时 |
| [OPTIMIZATION_LOG.md](OPTIMIZATION_LOG.md) | 后续每次测试、候选调参、拒绝和晋升的追加日志 | 每轮算法优化结束时 |
| [archive/production-v1-promotion.json](archive/production-v1-promotion.json) | 用户批准的 production v1 机器可读晋升记录 | 仅创建新 production 版本时 |

## 维护规则

1. 不直接修改 production v1 参数。任何参数变化先创建 candidate 版本，并在优化日志中登记证据、指标和结论。
2. Git 只保存文档、标注、媒体指纹、配置哈希和评分结果；真实视频保持本地且受 `.gitignore` 保护。
3. `IMPLEMENTATION_PLAN.md` 是工程任务状态来源，`OPTIMIZATION_LOG.md` 是实验与产品回归事实来源；两者不得互相替代。
4. 过程性命令输出、临时 handoff 和已被后续基线取代的阶段报告不再恢复为独立文档。需要历史事实时，以架构、实施计划和 production v1 归档中保留的结论为准。
