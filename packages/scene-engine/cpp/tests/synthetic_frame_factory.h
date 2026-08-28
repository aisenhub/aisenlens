#pragma once

#include <array>
#include <cstdint>
#include <vector>

#include "aisenshot/frame_view.h"

namespace aisenshot_test {

class SyntheticFrame {
 public:
  SyntheticFrame(aisenshot::PixelFormat format, std::int64_t timestamp_us = 0, std::uint64_t presentation_index = 0, std::int64_t duration_us = 33'333, std::uint32_t width = 8, std::uint32_t height = 6, std::uint32_t padding = 0);

  SyntheticFrame(const SyntheticFrame&) = delete;
  SyntheticFrame& operator=(const SyntheticFrame&) = delete;

  aisenshot::FrameView view{};
  std::array<std::vector<std::uint8_t>, 3> storage{};

  void fill_rgba(std::uint8_t r, std::uint8_t g, std::uint8_t b, std::uint8_t a = 255);
  void fill_yuv(std::uint8_t y, std::uint8_t u = 128, std::uint8_t v = 128);
};

}  // namespace aisenshot_test
