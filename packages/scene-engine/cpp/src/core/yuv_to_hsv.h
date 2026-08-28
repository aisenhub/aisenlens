#pragma once

#include <cstdint>

#include "aisenshot/frame_view.h"

namespace aisenshot::internal {

struct HsvSample {
  std::int32_t luma = 0;
  std::int32_t hue = 0;
  std::int32_t saturation = 0;
};

bool read_hsv_sample(const FrameView& frame, std::uint32_t x, std::uint32_t y, HsvSample* output);

}  // namespace aisenshot::internal
