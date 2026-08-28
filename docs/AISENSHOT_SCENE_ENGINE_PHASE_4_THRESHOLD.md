# AisenShot Phase 4 Threshold/Fade 交接记录

日期：2026-08-27  
状态：Phase 4 全部完成。

## 已实现规则

- `floor` 模式在亮度跌破阈值时进入 fade-out，重新达到阈值时配对完成；`ceiling` 模式方向相反。
- `fade_bias_q` 使用 -1000..1000 定点范围，0 为区间中点；事件保留 start/end/boundary 三个微秒时间点。
- `emit_final_fade` 控制视频尾部未闭合 fade 是否输出，尾部边界固定为最后一次阈值穿越点。
- Threshold 只读取 `SharedFrameMetrics.mean_luma_q`，不重复读取像素。

## 验证

- native Debug Phase 4 CTest：通过。
- 已覆盖 floor/ceiling、完整/未闭合 fade、VFR 微秒时间、bias 和 reset。
- SceneEngine 统一收集同一帧的 hard-cut/fade 候选，经过 EventResolver 与 MinSceneFilter 后输出；同一帧的 fade 区间优先级和来源 mask 均保留。
- checkpoint core 使用显式 little-endian 字段，包含 schema、精确 engine state version、config hash、生命周期、前帧量化 metrics、Adaptive/Fade 状态、融合历史、最后时间点和 presentation index；截断、损坏及 hash/version 不匹配均拒绝且不修改输出状态。SceneEngine 连续运行与恢复运行的事件字段已通过 parity 测试。
