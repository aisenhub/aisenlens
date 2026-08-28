#pragma once

#include <cstdint>

namespace aisenshot {

enum class PixelFormat : std::uint8_t {
  I420 = 0,
  NV12,
  RGBX,
  RGBA,
};

enum class ColorMatrix : std::uint8_t {
  Unspecified = 0,
  BT601,
  BT709,
  BT2020,
};

enum class ColorPrimaries : std::uint8_t {
  Unspecified = 0,
  BT601,
  BT709,
  BT2020,
};

enum class TransferFunction : std::uint8_t {
  Unspecified = 0,
  BT1886,
  SRGB,
  PQ,
  HLG,
};

struct PlaneView {
  const std::uint8_t* data = nullptr;
  std::uint32_t size_bytes = 0;
  std::uint32_t stride_bytes = 0;
};

struct FrameView {
  PixelFormat pixel_format = PixelFormat::RGBA;
  PlaneView planes[3]{};
  std::uint8_t plane_count = 0;
  std::uint32_t coded_width = 0;
  std::uint32_t coded_height = 0;
  std::uint32_t visible_x = 0;
  std::uint32_t visible_y = 0;
  std::uint32_t visible_width = 0;
  std::uint32_t visible_height = 0;
  std::uint8_t bit_depth = 8;
  ColorMatrix matrix = ColorMatrix::Unspecified;
  ColorPrimaries primaries = ColorPrimaries::Unspecified;
  TransferFunction transfer = TransferFunction::Unspecified;
  bool full_range = false;
  std::uint64_t presentation_index = 0;
  std::int64_t timestamp_us = 0;
  std::int64_t duration_us = 0;
};

}  // namespace aisenshot
