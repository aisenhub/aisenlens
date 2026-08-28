# AisenShot Phase 2 Content Detector 交接记录

日期：2026-08-27  
状态：已完成实现、native 回归、WASM 构建与 Worker contract 验证；产品 Web 接入由 Phase 10–11 管理。

## 已冻结的规则

- 分析尺寸在 `analysis_width × analysis_height` 以内保持 visible rect 宽高比，采用像素中心的确定性最近邻映射。
- I420/NV12 根据 `FrameView` 的 matrix 与 full/limited range 做整数定点 YUV 转换；RGBX/RGBA 读取前三个字节作为 RGB。
- Luma、Hue、Saturation 量化为 0..255；Hue 差异使用 256 环形最短距离。
- Content score 为 0..10000 定点值，按三分量权重归一化；首帧不触发，分数大于或等于阈值时触发。
- 事件使用输入帧的 `timestamp_us` 和 `presentation_index`，默认最短镜头时长为 600000 微秒。

## Golden 用例

测试入口：`packages/scene-engine/cpp/tests/frame_metrics_test.cpp`、`content_detector_test.cpp`。

| 输入序列 | 预期指标/事件 |
| --- | --- |
| 同一 RGB 帧 → 同一 RGB 帧 | 首帧 `has_previous=false`；随后三项 delta 和 score 均为 0 |
| 黑色 → 白色（RGBA） | `delta_luma_q=255`，默认等权 `content_score_q=3333` |
| 红色 → 蓝色（RGBA） | `delta_hue_q>80`，score 超过 1000 |
| 白色 I420 → 白色 NV12，9×7、padding=3 | mean luma 相同，分析尺寸 69×54 |
| Content threshold=5000，score=5000 | 产生一个 hard-cut，保留真实微秒时间、索引和三项 evidence |
| 连续候选间隔小于 600000 微秒 | 后续候选被最短镜头约束抑制 |

## 验证结果

- native Debug CTest：通过。
- native Release CTest：通过。
- native Debug + Address/UBSan CTest：通过。
- Web `pnpm build`：通过。
- 禁止依赖审计：Content 仅读取 `SharedFrameMetrics`，未引入 React、WebCodecs、OpenCV、Python 或第三方像素库。

本阶段参考 PySceneDetect 的 Content 检测思路，但颜色转换、下采样、定点量化和阈值并不承诺与其默认实现数值等价。
