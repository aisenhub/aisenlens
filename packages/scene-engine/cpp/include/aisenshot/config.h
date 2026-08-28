#pragma once

#include <cstdint>

namespace aisenshot {

enum class DetectorKind : std::uint8_t {
  None = 0,
  Content,
  Adaptive,
  Threshold,
};

enum class ThresholdMode : std::uint8_t {
  Floor = 0,
  Ceiling,
};

struct EngineConfig {
  std::uint32_t version = 1;
  DetectorKind detector = DetectorKind::None;
  std::uint32_t analysis_width = 96;
  std::uint32_t analysis_height = 54;
  // Decision values use a 0..10000 fixed-point scale.
  std::int32_t content_threshold_q = 2700;
  std::int32_t content_luma_weight_q = 3333;
  std::int32_t content_hue_weight_q = 3333;
  std::int32_t content_saturation_weight_q = 3334;
  std::int64_t minimum_scene_duration_us = 600'000;
  // Adaptive ratio uses 1000 == 1.0; 3000 is the PySceneDetect-style 3.0 baseline.
  std::uint32_t adaptive_threshold_q = 3000;
  std::uint32_t adaptive_window_width = 2;
  std::int32_t adaptive_min_content_score_q = 1500;
  bool threshold_enabled = false;
  std::int32_t threshold_luma_q = 12;
  ThresholdMode threshold_mode = ThresholdMode::Floor;
  std::int32_t fade_bias_q = 0;
  bool emit_final_fade = false;
};

}  // namespace aisenshot
