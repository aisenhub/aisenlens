#pragma once

#include <cstdint>
#include <vector>

#include "aisenshot/config.h"
#include "aisenshot/error.h"
#include "aisenshot/frame_view.h"

namespace aisenshot {

struct SharedFrameMetrics {
  // All decision values are deterministic integers. Luma, hue and saturation
  // are represented on a 0..255 scale; content_score_q is 0..10000.
  std::int32_t mean_luma_q = 0;
  std::int32_t delta_luma_q = 0;
  std::int32_t delta_hue_q = 0;
  std::int32_t delta_saturation_q = 0;
  std::int32_t content_score_q = 0;
  std::uint32_t sample_width = 0;
  std::uint32_t sample_height = 0;
  bool has_previous = false;
  // Quantized analysis surface retained for the next frame only.
  std::vector<std::uint8_t> luma_plane;
  std::vector<std::uint8_t> hue_plane;
  std::vector<std::uint8_t> saturation_plane;
};

bool compute_shared_frame_metrics(const FrameView& frame,
                                  const EngineConfig& config,
                                  const SharedFrameMetrics* previous,
                                  SharedFrameMetrics* output,
                                  ErrorCode* error);

}  // namespace aisenshot
