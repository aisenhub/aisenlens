# AisenShot Production v1 归档

> 状态：当前本地 production 基线；在完成最终提交、推送和 Git 标签后，该提交即为可回归的 v1 发布点。

## 范围

- 普通 Web 编辑器开放：`general`（通用/影视）与 `short-form`（短视频）。
- 保留为 research、默认隐藏：`animation-gameplay`（动画/游戏）与 `talking-head`（访谈/Vlog）。
- 运行链路：浏览器顺序解码 → Worker → WASM Scene Engine → 候选审阅 → 用户确认应用；不保留旧 Canvas/seek 生产路径。

## 冻结配置

| preset | version | detector | 转场 | 最短镜头 | config hash |
| --- | ---: | --- | --- | ---: | --- |
| 通用/影视 (`general`) | 1 | Adaptive | 仅硬切 | 0.8s | `fnv1a64-v1:3ba804f6a898c7bf` |
| 短视频 (`short-form`) | 1 | Adaptive | 仅硬切 | 0.4s | `fnv1a64-v1:3eff6e7231489b76` |

完整 canonical config 与用户批准记录见 [archive/production-v1-promotion.json](archive/production-v1-promotion.json)。

## 已归档证据

- Phase 11 的任务生命周期、强媒体身份、canonical config hash、暂停/继续、中断、候选审阅、应用前恢复快照、分组协调、项目/媒体切换和持久化恢复已通过 Web 产品链路验证。
- 当前 production v1 的通用/影视、短视频基线已按用户人工测试批准冻结；后续测试仅可用于创建新 candidate 版本，不得直接改写本表。
- 动画/游戏在多条动画素材中出现明显漏切；访谈/Vlog未完成专项验证，因此二者不进入 production。

## 已知限制与未关闭项

1. search/holdout 数据集尚未达到长期统计门槛；当前 production v1 是有明确用户批准记录的冻结基线，不等同于完整 holdout 晋升。
2. 性能与内存生产基线、许可证与持续检查、缺失媒体重新选择文件的 Edge 交互证据、最终全矩阵验收仍在后续工程计划中。
3. 当前只验收 Web；Desktop、Android、iOS 不在本版本验收范围。

## 后续版本流程

每次参数优化均按 `v1.1-candidate` 等新版本进行：登记素材与标注 → search 调参 → 独立 holdout/用户批准 → 新 promotion record → 更新本归档与 [OPTIMIZATION_LOG.md](OPTIMIZATION_LOG.md)。旧 production 版本持续作为回归对照。
