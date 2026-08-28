#include "downscale.h"

#include <algorithm>

namespace aisenshot::internal {

AnalysisSize choose_analysis_size(const FrameView& frame, const EngineConfig& config) {
  if (config.analysis_width == 0 || config.analysis_height == 0 || frame.visible_width == 0 || frame.visible_height == 0) {
    return {};
  }
  const std::uint64_t width_limited = static_cast<std::uint64_t>(config.analysis_height) * frame.visible_width / frame.visible_height;
  const std::uint64_t height_limited = static_cast<std::uint64_t>(config.analysis_width) * frame.visible_height / frame.visible_width;
  AnalysisSize result{};
  if (width_limited <= config.analysis_width) {
    result.width = static_cast<std::uint32_t>(std::max<std::uint64_t>(1, width_limited));
    result.height = config.analysis_height;
  } else {
    result.width = config.analysis_width;
    result.height = static_cast<std::uint32_t>(std::max<std::uint64_t>(1, height_limited));
  }
  return result;
}

std::uint32_t map_sample_coordinate(std::uint32_t sample, std::uint32_t sample_extent,
                                    std::uint32_t visible_origin, std::uint32_t visible_extent) {
  if (sample_extent <= 1 || visible_extent <= 1) return visible_origin;
  const std::uint64_t numerator = (static_cast<std::uint64_t>(sample) * 2U + 1U) * visible_extent;
  const std::uint32_t offset = static_cast<std::uint32_t>(numerator / (2U * sample_extent));
  return visible_origin + std::min(offset, visible_extent - 1U);
}

}  // namespace aisenshot::internal
