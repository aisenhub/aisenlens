#include "yuv_to_hsv.h"

#include <algorithm>
#include <cstdint>

namespace aisenshot::internal {
namespace {

struct Rgb {
  int r = 0;
  int g = 0;
  int b = 0;
};

int clamp8(int value) { return std::max(0, std::min(255, value)); }

Rgb yuv_to_rgb(int y, int u, int v, ColorMatrix matrix, bool full_range) {
  int y_scaled = y;
  int u_scaled = u - 128;
  int v_scaled = v - 128;
  if (!full_range) {
    y_scaled = (std::max(0, y - 16) * 255 + 109) / 219;
    u_scaled = ((u - 128) * 255 + (u >= 128 ? 112 : -112)) / 224;
    v_scaled = ((v - 128) * 255 + (v >= 128 ? 112 : -112)) / 224;
  }
  int r = y_scaled;
  int g = y_scaled;
  int b = y_scaled;
  if (matrix == ColorMatrix::BT601) {
    r = y_scaled + (1436 * v_scaled) / 1024;
    g = y_scaled - (352 * u_scaled + 731 * v_scaled) / 1024;
    b = y_scaled + (1815 * u_scaled) / 1024;
  } else if (matrix == ColorMatrix::BT2020) {
    r = y_scaled + (1450 * v_scaled) / 1024;
    g = y_scaled - (164 * u_scaled + 488 * v_scaled) / 1024;
    b = y_scaled + (1714 * u_scaled) / 1024;
  } else {
    r = y_scaled + (1613 * v_scaled) / 1024;
    g = y_scaled - (192 * u_scaled + 480 * v_scaled) / 1024;
    b = y_scaled + (1900 * u_scaled) / 1024;
  }
  return {clamp8(r), clamp8(g), clamp8(b)};
}

Rgb read_rgb(const FrameView& frame, std::uint32_t x, std::uint32_t y) {
  if (frame.pixel_format == PixelFormat::RGBA || frame.pixel_format == PixelFormat::RGBX) {
    const std::uint8_t* pixel = frame.planes[0].data + y * frame.planes[0].stride_bytes + x * 4U;
    return {pixel[0], pixel[1], pixel[2]};
  }
  const std::uint8_t* y_plane = frame.planes[0].data + y * frame.planes[0].stride_bytes + x;
  const std::uint32_t chroma_x = x / 2U;
  const std::uint32_t chroma_y = y / 2U;
  int u = 128;
  int v = 128;
  if (frame.pixel_format == PixelFormat::I420) {
    u = frame.planes[1].data[chroma_y * frame.planes[1].stride_bytes + chroma_x];
    v = frame.planes[2].data[chroma_y * frame.planes[2].stride_bytes + chroma_x];
  } else {
    const std::uint8_t* uv = frame.planes[1].data + chroma_y * frame.planes[1].stride_bytes + chroma_x * 2U;
    u = uv[0];
    v = uv[1];
  }
  return yuv_to_rgb(*y_plane, u, v, frame.matrix, frame.full_range);
}

}  // namespace

bool read_hsv_sample(const FrameView& frame, std::uint32_t x, std::uint32_t y, HsvSample* output) {
  if (!output || x >= frame.coded_width || y >= frame.coded_height) return false;
  const Rgb rgb = read_rgb(frame, x, y);
  const int max_value = std::max({rgb.r, rgb.g, rgb.b});
  const int min_value = std::min({rgb.r, rgb.g, rgb.b});
  const int delta = max_value - min_value;
  output->luma = (2126 * rgb.r + 7152 * rgb.g + 722 * rgb.b + 5000) / 10000;
  output->saturation = max_value == 0 ? 0 : (delta * 255 + max_value / 2) / max_value;
  if (delta == 0) {
    output->hue = 0;
  } else if (max_value == rgb.r) {
    output->hue = (43 * (rgb.g - rgb.b) / delta + 256) % 256;
  } else if (max_value == rgb.g) {
    output->hue = (85 + 43 * (rgb.b - rgb.r) / delta) % 256;
  } else {
    output->hue = (171 + 43 * (rgb.r - rgb.g) / delta) % 256;
  }
  return true;
}

}  // namespace aisenshot::internal
