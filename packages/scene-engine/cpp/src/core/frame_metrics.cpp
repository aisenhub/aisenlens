#include "aisenshot/frame_metrics.h"

#include <algorithm>
#include <cstddef>
#include <cstdint>
#if defined(__wasm_simd128__)
#include <wasm_simd128.h>
#endif

#include "downscale.h"
#include "yuv_to_hsv.h"

namespace aisenshot {
namespace {

bool valid_frame_for_metrics(const FrameView& frame) {
  return frame.coded_width > 0 && frame.coded_height > 0 && frame.visible_width > 0 && frame.visible_height > 0 &&
      frame.visible_x <= frame.coded_width - frame.visible_width && frame.visible_y <= frame.coded_height - frame.visible_height &&
      frame.bit_depth == 8 && frame.plane_count > 0 && frame.planes[0].data != nullptr;
}

int hue_distance(int left, int right) {
  const int distance = std::abs(left - right);
  return std::min(distance, 256 - distance);
}

struct DeltaSums {
  std::int64_t luma = 0;
  std::int64_t hue = 0;
  std::int64_t saturation = 0;
};

DeltaSums accumulate_delta_sums(const std::uint8_t* luma, const std::uint8_t* hue,
                                const std::uint8_t* saturation, const SharedFrameMetrics& previous,
                                std::size_t count) {
  DeltaSums sums{};
#if defined(__wasm_simd128__)
  // SIMD is limited to byte-wise delta accumulation; RGB/YUV conversion and
  // all detector decisions stay on the shared scalar reference path.
  const v128_t zero = wasm_i8x16_splat(0);
  alignas(16) std::uint32_t lanes[4];
  const auto sum_vector = [&](v128_t value) {
    const v128_t pairwise_u16 = wasm_u16x8_extadd_pairwise_u8x16(value);
    const v128_t pairwise_u32 = wasm_u32x4_extadd_pairwise_u16x8(pairwise_u16);
    wasm_v128_store(lanes, pairwise_u32);
    std::int64_t total = 0;
    for (const auto lane : lanes) total += lane;
    return total;
  };
  std::size_t index = 0;
  for (; index + 16 <= count; index += 16) {
    const v128_t current_luma = wasm_v128_load(luma + index);
    const v128_t previous_luma = wasm_v128_load(previous.luma_plane.data() + index);
    const v128_t current_hue = wasm_v128_load(hue + index);
    const v128_t previous_hue = wasm_v128_load(previous.hue_plane.data() + index);
    const v128_t current_saturation = wasm_v128_load(saturation + index);
    const v128_t previous_saturation = wasm_v128_load(previous.saturation_plane.data() + index);
    const v128_t luma_delta = wasm_u8x16_max(wasm_u8x16_sub_sat(current_luma, previous_luma), wasm_u8x16_sub_sat(previous_luma, current_luma));
    const v128_t hue_delta = wasm_u8x16_max(wasm_u8x16_sub_sat(current_hue, previous_hue), wasm_u8x16_sub_sat(previous_hue, current_hue));
    const v128_t hue_wrap = wasm_i8x16_sub(zero, hue_delta);
    const v128_t saturation_delta = wasm_u8x16_max(wasm_u8x16_sub_sat(current_saturation, previous_saturation), wasm_u8x16_sub_sat(previous_saturation, current_saturation));
    const v128_t hue_distance_vector = wasm_u8x16_min(hue_delta, hue_wrap);
    sums.luma += sum_vector(luma_delta);
    sums.hue += sum_vector(hue_distance_vector);
    sums.saturation += sum_vector(saturation_delta);
  }
  for (; index < count; ++index) {
    sums.luma += std::abs(static_cast<int>(luma[index]) - previous.luma_plane[index]);
    sums.hue += hue_distance(hue[index], previous.hue_plane[index]);
    sums.saturation += std::abs(static_cast<int>(saturation[index]) - previous.saturation_plane[index]);
  }
#else
  for (std::size_t index = 0; index < count; ++index) {
    sums.luma += std::abs(static_cast<int>(luma[index]) - previous.luma_plane[index]);
    sums.hue += hue_distance(hue[index], previous.hue_plane[index]);
    sums.saturation += std::abs(static_cast<int>(saturation[index]) - previous.saturation_plane[index]);
  }
#endif
  return sums;
}

}  // namespace

bool compute_shared_frame_metrics(const FrameView& frame, const EngineConfig& config,
                                  const SharedFrameMetrics* previous, SharedFrameMetrics* output,
                                  ErrorCode* error) {
  if (error) *error = ErrorCode::None;
  if (!output || !error || !valid_frame_for_metrics(frame) || config.analysis_width == 0 || config.analysis_height == 0) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  const internal::AnalysisSize size = internal::choose_analysis_size(frame, config);
  if (size.width == 0 || size.height == 0) {
    *error = ErrorCode::InvalidDimensions;
    return false;
  }
  std::int64_t luma_sum = 0;
  std::int64_t luma_delta_sum = 0;
  std::int64_t hue_delta_sum = 0;
  std::int64_t saturation_delta_sum = 0;
  const bool has_previous = previous && previous->sample_width == size.width && previous->sample_height == size.height &&
      previous->luma_plane.size() == static_cast<std::size_t>(size.width) * size.height;
  const std::size_t sample_count = static_cast<std::size_t>(size.width) * size.height;
  SharedFrameMetrics result{};
  result.sample_width = size.width;
  result.sample_height = size.height;
  result.luma_plane.resize(sample_count);
  result.hue_plane.resize(sample_count);
  result.saturation_plane.resize(sample_count);
  result.has_previous = has_previous;
  for (std::uint32_t sy = 0; sy < size.height; ++sy) {
    const std::uint32_t y = internal::map_sample_coordinate(sy, size.height, frame.visible_y, frame.visible_height);
    for (std::uint32_t sx = 0; sx < size.width; ++sx) {
      const std::uint32_t x = internal::map_sample_coordinate(sx, size.width, frame.visible_x, frame.visible_width);
      internal::HsvSample sample{};
      if (!internal::read_hsv_sample(frame, x, y, &sample)) {
        *error = ErrorCode::InvalidPlane;
        return false;
      }
      luma_sum += sample.luma;
      const std::size_t index = static_cast<std::size_t>(sy) * size.width + sx;
      result.luma_plane[index] = static_cast<std::uint8_t>(sample.luma);
      result.hue_plane[index] = static_cast<std::uint8_t>(sample.hue);
      result.saturation_plane[index] = static_cast<std::uint8_t>(sample.saturation);
    }
  }
  if (has_previous) {
    const DeltaSums sums = accumulate_delta_sums(result.luma_plane.data(), result.hue_plane.data(), result.saturation_plane.data(), *previous, sample_count);
    luma_delta_sum = sums.luma;
    hue_delta_sum = sums.hue;
    saturation_delta_sum = sums.saturation;
  }
  const std::int64_t count = static_cast<std::int64_t>(size.width) * size.height;
  const int mean_luma = static_cast<int>((luma_sum + count / 2) / count);
  result.mean_luma_q = mean_luma;
  result.sample_width = size.width;
  result.sample_height = size.height;
  if (has_previous) {
    result.delta_luma_q = static_cast<int>((luma_delta_sum + count / 2) / count);
    result.delta_hue_q = static_cast<int>((hue_delta_sum + count / 2) / count);
    result.delta_saturation_q = static_cast<int>((saturation_delta_sum + count / 2) / count);
    const std::int64_t weighted = static_cast<std::int64_t>(result.delta_luma_q) * config.content_luma_weight_q +
        static_cast<std::int64_t>(result.delta_hue_q) * config.content_hue_weight_q +
        static_cast<std::int64_t>(result.delta_saturation_q) * config.content_saturation_weight_q;
    const std::int64_t weight_sum = static_cast<std::int64_t>(config.content_luma_weight_q) + config.content_hue_weight_q + config.content_saturation_weight_q;
    result.content_score_q = weight_sum > 0 ? static_cast<int>((weighted * 10000 + 127 * weight_sum) / (255 * weight_sum)) : 0;
  }
  if (!has_previous) {
    result.delta_hue_q = 0;
    result.delta_saturation_q = 0;
  }
  *output = result;
  return true;
}

}  // namespace aisenshot
