# AisenShot Phase 3 Adaptive 交接记录

日期：2026-08-27  
状态：native Adaptive detector、WASM/Worker contract 与 checkpoint 生命周期验证已完成；产品 Web 接入由 Phase 10–11 管理。

## 规则

- `adaptive_window_width=2` 时保存 5 个 Content score，中心帧使用前后各两帧作为邻居。
- ratio 使用 1000 定点比例和交叉乘法比较，避免浮点累计差异；`adaptive_threshold_q=3000` 表示 3.0。
- 目标分数必须达到 `adaptive_min_content_score_q`；邻域均值为 0 时，只有正分目标触发。
- 事件时间和 presentation index 取窗口中心目标帧，而不是当前 look-ahead 帧。
- `flush()` 对尾部未满窗口执行一次确定性中心评估并清空窗口；`reset()` 清除全部延迟状态。

## 验证

- `adaptive_detector_test.cpp` 覆盖孤立高峰、两帧 look-ahead、零邻域、首帧、flush/reset。
- native Debug Phase 3 CTest：通过。
- Content 与 Adaptive 由单一 `DetectorKind` 选择，不会默认并行产生两个 hard-cut 流。
