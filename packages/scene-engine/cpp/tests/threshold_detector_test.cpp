#include "aisenshot/threshold_detector.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

namespace {

void testFloorFadeAndBias() {
  aisenshot::EngineConfig config;
  config.threshold_luma_q = 100;
  config.threshold_mode = aisenshot::ThresholdMode::Floor;
  config.fade_bias_q = 0;
  config.minimum_scene_duration_us = 0;
  aisenshot::ThresholdDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA);
  aisenshot::SharedFrameMetrics metrics{};
  aisenshot::SceneEvent event{};
  bool emitted = false;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  frame.view.timestamp_us = 0;
  metrics.mean_luma_q = 180;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  frame.view.timestamp_us = 1'000'000;
  metrics.mean_luma_q = 50;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_FALSE(emitted);
  frame.view.timestamp_us = 3'000'000;
  metrics.mean_luma_q = 180;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_TRUE(emitted);
  EXPECT_EQ(event.type, aisenshot::SceneEventType::Fade);
  EXPECT_EQ(event.transition_start_us, 1'000'000);
  EXPECT_EQ(event.transition_end_us, 3'000'000);
  EXPECT_EQ(event.boundary_timestamp_us, 2'000'000);
}

void testFinalFadeCeilingAndReset() {
  aisenshot::EngineConfig config;
  config.threshold_luma_q = 200;
  config.threshold_mode = aisenshot::ThresholdMode::Ceiling;
  config.minimum_scene_duration_us = 0;
  config.emit_final_fade = true;
  aisenshot::ThresholdDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA, 100, 7);
  aisenshot::SharedFrameMetrics metrics{};
  metrics.mean_luma_q = 100;
  aisenshot::SceneEvent event{};
  bool emitted = false;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  frame.view.timestamp_us = 900;
  metrics.mean_luma_q = 220;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_FALSE(emitted);
  frame.view.timestamp_us = 1'900;
  EXPECT_TRUE(detector.flush(&event, &emitted, &error));
  EXPECT_TRUE(emitted);
  EXPECT_EQ(event.type, aisenshot::SceneEventType::Fade);
  EXPECT_EQ(event.timestamp_us, 900);
  detector.reset();
  EXPECT_TRUE(detector.flush(&event, &emitted, &error));
  EXPECT_FALSE(emitted);
}

}  // namespace

int run_threshold_detector_tests() {
  testFloorFadeAndBias();
  testFinalFadeCeilingAndReset();
  return 0;
}
