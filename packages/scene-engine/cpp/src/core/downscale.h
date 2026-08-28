#pragma once

#include <cstdint>

#include "aisenshot/config.h"
#include "aisenshot/frame_view.h"

namespace aisenshot::internal {

struct AnalysisSize {
  std::uint32_t width = 0;
  std::uint32_t height = 0;
};

AnalysisSize choose_analysis_size(const FrameView& frame, const EngineConfig& config);
std::uint32_t map_sample_coordinate(std::uint32_t sample, std::uint32_t sample_extent,
                                    std::uint32_t visible_origin, std::uint32_t visible_extent);

}  // namespace aisenshot::internal
