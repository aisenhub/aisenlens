#include "aisenshot/content_detector.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

namespace {

void testThresholdAndEventEvidence() {
  aisenshot::EngineConfig config;
  config.content_threshold_q = 5000;
  config.minimum_scene_duration_us = 0;
  aisenshot::ContentDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA, 1'000'000, 42);
  aisenshot::SharedFrameMetrics metrics{};
  metrics.has_previous = true;
  metrics.content_score_q = 5000;
  metrics.delta_luma_q = 10;
  metrics.delta_hue_q = 20;
  metrics.delta_saturation_q = 30;
  aisenshot::SceneEvent event{};
  bool emitted = false;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_TRUE(emitted);
  EXPECT_EQ(event.timestamp_us, 1'000'000);
  EXPECT_EQ(event.presentation_index, 42U);
  EXPECT_EQ(event.score_q, 5000);
  EXPECT_EQ(event.threshold_q, 5000);
  EXPECT_EQ(event.delta_hue_q, 20);
}

void testFirstFrameBelowThresholdAndMinimumDuration() {
  aisenshot::EngineConfig config;
  config.content_threshold_q = 100;
  config.minimum_scene_duration_us = 600'000;
  aisenshot::ContentDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA, 1'000'000, 1);
  aisenshot::SharedFrameMetrics metrics{};
  metrics.content_score_q = 99;
  aisenshot::SceneEvent event{};
  bool emitted = true;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_FALSE(emitted);
  metrics.has_previous = true;
  metrics.content_score_q = 100;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_TRUE(emitted);
  frame.view.timestamp_us = 1'500'000;
  frame.view.presentation_index = 2;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_FALSE(emitted);
  detector.reset();
  EXPECT_TRUE(detector.flush(&event, &emitted, &error));
  EXPECT_FALSE(emitted);
}

}  // namespace

int run_content_detector_tests() {
  testThresholdAndEventEvidence();
  testFirstFrameBelowThresholdAndMinimumDuration();
  return 0;
}
