#include "synthetic_frame_factory.h"

#include <algorithm>

namespace aisenshot_test {

SyntheticFrame::SyntheticFrame(aisenshot::PixelFormat format, std::int64_t timestamp_us, std::uint64_t presentation_index, std::int64_t duration_us, std::uint32_t width, std::uint32_t height, std::uint32_t padding) {
  view.pixel_format = format;
  view.coded_width = width;
  view.coded_height = height;
  view.visible_width = width;
  view.visible_height = height;
  view.bit_depth = 8;
  view.matrix = aisenshot::ColorMatrix::BT709;
  view.primaries = aisenshot::ColorPrimaries::BT709;
  view.transfer = aisenshot::TransferFunction::SRGB;
  view.presentation_index = presentation_index;
  view.timestamp_us = timestamp_us;
  view.duration_us = duration_us;
  const std::uint32_t chroma_width = (width + 1U) / 2U;
  const std::uint32_t chroma_height = (height + 1U) / 2U;
  if (format == aisenshot::PixelFormat::I420) {
    view.plane_count = 3;
    const std::uint32_t y_stride = width + padding;
    const std::uint32_t uv_stride = chroma_width + padding;
    storage[0].resize(y_stride * height, 16);
    storage[1].resize(uv_stride * chroma_height, 128);
    storage[2].resize(uv_stride * chroma_height, 128);
    view.planes[0] = {storage[0].data(), static_cast<std::uint32_t>(storage[0].size()), y_stride};
    view.planes[1] = {storage[1].data(), static_cast<std::uint32_t>(storage[1].size()), uv_stride};
    view.planes[2] = {storage[2].data(), static_cast<std::uint32_t>(storage[2].size()), uv_stride};
  } else if (format == aisenshot::PixelFormat::NV12) {
    view.plane_count = 2;
    const std::uint32_t y_stride = width + padding;
    const std::uint32_t uv_stride = chroma_width * 2U + padding;
    storage[0].resize(y_stride * height, 16);
    storage[1].resize(uv_stride * chroma_height, 128);
    view.planes[0] = {storage[0].data(), static_cast<std::uint32_t>(storage[0].size()), y_stride};
    view.planes[1] = {storage[1].data(), static_cast<std::uint32_t>(storage[1].size()), uv_stride};
  } else {
    view.plane_count = 1;
    const std::uint32_t stride = width * 4U + padding;
    storage[0].resize(stride * height, 0);
    view.planes[0] = {storage[0].data(), static_cast<std::uint32_t>(storage[0].size()), stride};
  }
}

void SyntheticFrame::fill_rgba(std::uint8_t r, std::uint8_t g, std::uint8_t b, std::uint8_t a) {
  if (view.pixel_format != aisenshot::PixelFormat::RGBA && view.pixel_format != aisenshot::PixelFormat::RGBX) return;
  for (std::uint32_t y = 0; y < view.coded_height; ++y) {
    for (std::uint32_t x = 0; x < view.coded_width; ++x) {
      auto* pixel = storage[0].data() + y * view.planes[0].stride_bytes + x * 4U;
      pixel[0] = r;
      pixel[1] = g;
      pixel[2] = b;
      pixel[3] = a;
    }
  }
}

void SyntheticFrame::fill_yuv(std::uint8_t y, std::uint8_t u, std::uint8_t v) {
  if (view.pixel_format == aisenshot::PixelFormat::I420 || view.pixel_format == aisenshot::PixelFormat::NV12) {
    std::fill(storage[0].begin(), storage[0].end(), y);
    if (view.pixel_format == aisenshot::PixelFormat::I420) {
      std::fill(storage[1].begin(), storage[1].end(), u);
      std::fill(storage[2].begin(), storage[2].end(), v);
    } else {
      for (std::size_t i = 0; i + 1 < storage[1].size(); i += 2) {
        storage[1][i] = u;
        storage[1][i + 1] = v;
      }
    }
  }
}

}  // namespace aisenshot_test
