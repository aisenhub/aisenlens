#pragma once

#include <cstdint>

namespace aisenshot {

enum class SceneEventType : std::uint8_t {
  HardCut = 0,
  Fade,
};

struct SceneEvent {
  SceneEventType type = SceneEventType::HardCut;
  std::int64_t timestamp_us = 0;
  std::uint64_t presentation_index = 0;
  std::int32_t score_q = 0;
  std::int32_t threshold_q = 0;
  std::int32_t delta_luma_q = 0;
  std::int32_t delta_hue_q = 0;
  std::int32_t delta_saturation_q = 0;
  std::int64_t transition_start_us = 0;
  std::int64_t transition_end_us = 0;
  std::int64_t boundary_timestamp_us = 0;
  std::uint8_t direction = 0;
  std::uint8_t source = 0;
};

}  // namespace aisenshot
