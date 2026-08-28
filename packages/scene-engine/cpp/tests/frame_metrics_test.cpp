#include "aisenshot/frame_metrics.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

namespace {

using aisenshot::ColorMatrix;
using aisenshot::EngineConfig;
using aisenshot::ErrorCode;
using aisenshot::PixelFormat;
using aisenshot::SharedFrameMetrics;
using aisenshot_test::SyntheticFrame;

void testFirstAndRepeatedFrameMetrics() {
  EngineConfig config;
  SyntheticFrame first(PixelFormat::RGBA, 0, 0, 33'333, 9, 7, 5);
  first.fill_rgba(20, 40, 60);
  SharedFrameMetrics current{};
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(first.view, config, nullptr, &current, &error));
  EXPECT_EQ(error, ErrorCode::None);
  EXPECT_FALSE(current.has_previous);
  EXPECT_EQ(current.delta_luma_q, 0);
  EXPECT_EQ(current.content_score_q, 0);
  SharedFrameMetrics next{};
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(first.view, config, &current, &next, &error));
  EXPECT_TRUE(next.has_previous);
  EXPECT_EQ(next.delta_luma_q, 0);
  EXPECT_EQ(next.delta_hue_q, 0);
  EXPECT_EQ(next.delta_saturation_q, 0);
  EXPECT_EQ(next.content_score_q, 0);
}

void testBrightnessAndHueChanges() {
  EngineConfig config;
  SyntheticFrame dark(PixelFormat::RGBA, 0, 0, 33'333, 7, 5);
  SyntheticFrame bright(PixelFormat::RGBA, 700'000, 1, 33'333, 7, 5);
  dark.fill_rgba(0, 0, 0);
  bright.fill_rgba(255, 255, 255);
  SharedFrameMetrics baseline{};
  SharedFrameMetrics changed{};
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(dark.view, config, nullptr, &baseline, &error));
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(bright.view, config, &baseline, &changed, &error));
  EXPECT_EQ(changed.delta_luma_q, 255);
  EXPECT_EQ(changed.content_score_q, 3333);

  SyntheticFrame red(PixelFormat::RGBA, 0, 0);
  SyntheticFrame blue(PixelFormat::RGBA, 700'000, 1);
  red.fill_rgba(255, 0, 0);
  blue.fill_rgba(0, 0, 255);
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(red.view, config, nullptr, &baseline, &error));
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(blue.view, config, &baseline, &changed, &error));
  EXPECT_TRUE(changed.delta_hue_q > 80);
  EXPECT_TRUE(changed.content_score_q > 1000);
}

void testFormatsPaddingOddDimensionsAndColorMetadata() {
  EngineConfig config;
  SyntheticFrame i420(PixelFormat::I420, 0, 0, 33'333, 9, 7, 3);
  SyntheticFrame nv12(PixelFormat::NV12, 0, 0, 33'333, 9, 7, 3);
  i420.fill_yuv(235, 128, 128);
  nv12.fill_yuv(235, 128, 128);
  SharedFrameMetrics a{};
  SharedFrameMetrics b{};
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(i420.view, config, nullptr, &a, &error));
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(nv12.view, config, nullptr, &b, &error));
  EXPECT_EQ(a.mean_luma_q, b.mean_luma_q);
  EXPECT_EQ(a.sample_width, 69U);
  EXPECT_EQ(a.sample_height, 54U);
  i420.view.visible_x = 1;
  i420.view.visible_y = 1;
  i420.view.visible_width = 7;
  i420.view.visible_height = 5;
  i420.view.matrix = ColorMatrix::BT601;
  EXPECT_TRUE(aisenshot::compute_shared_frame_metrics(i420.view, config, nullptr, &a, &error));
}

}  // namespace

int run_frame_metrics_tests() {
  testFirstAndRepeatedFrameMetrics();
  testBrightnessAndHueChanges();
  testFormatsPaddingOddDimensionsAndColorMetadata();
  return 0;
}
