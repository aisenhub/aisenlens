#include "aisenshot/adaptive_detector.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

namespace {

void testLookaheadAndIsolatedPeak() {
  aisenshot::EngineConfig config;
  config.adaptive_window_width = 2;
  config.adaptive_threshold_q = 3000;
  config.adaptive_min_content_score_q = 100;
  config.minimum_scene_duration_us = 0;
  aisenshot::AdaptiveDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA);
  aisenshot::SceneEvent event{};
  bool emitted = true;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  const int scores[] = {0, 100, 100, 9000, 100, 100, 100};
  int event_count = 0;
  for (int i = 0; i < 7; ++i) {
    frame.view.timestamp_us = static_cast<std::int64_t>(i) * 100'000;
    frame.view.presentation_index = static_cast<std::uint64_t>(i);
    aisenshot::SharedFrameMetrics metrics{};
    metrics.has_previous = i != 0;
    metrics.content_score_q = scores[i];
    EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
    if (emitted) {
      ++event_count;
      EXPECT_EQ(event.presentation_index, 3U);
      EXPECT_EQ(event.timestamp_us, 300'000);
    }
  }
  EXPECT_EQ(event_count, 1);
  EXPECT_EQ(detector.lookahead_frames(), 2U);
}

void testZeroNeighborAndFlushReset() {
  aisenshot::EngineConfig config;
  config.adaptive_window_width = 1;
  config.adaptive_threshold_q = 3000;
  config.adaptive_min_content_score_q = 1;
  config.minimum_scene_duration_us = 0;
  aisenshot::AdaptiveDetector detector(config);
  aisenshot_test::SyntheticFrame frame(aisenshot::PixelFormat::RGBA);
  aisenshot::SceneEvent event{};
  bool emitted = false;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  aisenshot::SharedFrameMetrics metrics{};
  metrics.has_previous = true;
  metrics.content_score_q = 0;
  frame.view.presentation_index = 1;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  frame.view.presentation_index = 2;
  metrics.content_score_q = 5000;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  frame.view.presentation_index = 3;
  metrics.content_score_q = 0;
  EXPECT_TRUE(detector.process(frame.view, metrics, &event, &emitted, &error));
  EXPECT_TRUE(emitted);
  EXPECT_EQ(event.presentation_index, 2U);
  detector.reset();
  EXPECT_TRUE(detector.flush(&event, &emitted, &error));
  EXPECT_FALSE(emitted);
}

}  // namespace

int run_adaptive_detector_tests() {
  testLookaheadAndIsolatedPeak();
  testZeroNeighborAndFlushReset();
  return 0;
}
