#include "aisenshot/scene_engine.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

namespace {

using aisenshot::ErrorCode;
using aisenshot::PixelFormat;
using aisenshot::SceneEngine;
using aisenshot::SceneEvent;
using aisenshot_test::SyntheticFrame;

bool process(SceneEngine& engine, const SyntheticFrame& frame, ErrorCode expected = ErrorCode::None) {
  SceneEvent event{};
  bool emitted = true;
  ErrorCode error = ErrorCode::InvalidArgument;
  const bool accepted = engine.process(frame.view, &event, &emitted, &error);
  EXPECT_EQ(error, expected);
  return accepted;
}

void testCreateDestroyAndFlush() {
  SceneEngine engine;
  SceneEvent event{};
  bool emitted = true;
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(engine.flush(&event, &emitted, &error));
  EXPECT_FALSE(emitted);
  EXPECT_EQ(error, ErrorCode::None);
  EXPECT_TRUE(engine.flush(&event, &emitted, &error));
  EXPECT_EQ(error, ErrorCode::None);
}

void testFormatsAndReset() {
  SceneEngine engine;
  SyntheticFrame i420(PixelFormat::I420, 0, 0, 33'333, 9, 7, 3);
  SyntheticFrame nv12(PixelFormat::NV12, 33'333, 1, 33'333, 9, 7, 3);
  SyntheticFrame rgbx(PixelFormat::RGBX, 66'666, 2);
  SyntheticFrame rgba(PixelFormat::RGBA, 99'999, 3);
  EXPECT_TRUE(process(engine, i420));
  EXPECT_TRUE(process(engine, nv12));
  EXPECT_TRUE(process(engine, rgbx));
  EXPECT_TRUE(process(engine, rgba));
  engine.reset();
  EXPECT_TRUE(process(engine, i420));
}

void testOrderingAndInvalidFrames() {
  SceneEngine engine;
  SyntheticFrame first(PixelFormat::RGBA, 100, 1);
  EXPECT_TRUE(process(engine, first));
  SyntheticFrame timestampBack(PixelFormat::RGBA, 99, 2);
  EXPECT_FALSE(process(engine, timestampBack, ErrorCode::TimestampOutOfOrder));
  SyntheticFrame indexBack(PixelFormat::RGBA, 101, 1);
  EXPECT_FALSE(process(engine, indexBack, ErrorCode::PresentationIndexOutOfOrder));
  SyntheticFrame badStride(PixelFormat::RGBA, 102, 3);
  badStride.view.planes[0].stride_bytes = 1;
  EXPECT_FALSE(process(engine, badStride, ErrorCode::InvalidPlane));
  SyntheticFrame emptyPlane(PixelFormat::NV12, 103, 4);
  emptyPlane.view.planes[1].data = nullptr;
  EXPECT_FALSE(process(engine, emptyPlane, ErrorCode::InvalidPlane));
  SyntheticFrame zeroDimensions(PixelFormat::RGBA, 104, 5);
  zeroDimensions.view.coded_width = 0;
  EXPECT_FALSE(process(engine, zeroDimensions, ErrorCode::InvalidDimensions));
  SyntheticFrame badVisible(PixelFormat::RGBA, 105, 6);
  badVisible.view.visible_x = badVisible.view.coded_width;
  EXPECT_FALSE(process(engine, badVisible, ErrorCode::InvalidVisibleRect));
  SyntheticFrame badDepth(PixelFormat::RGBA, 106, 7);
  badDepth.view.bit_depth = 10;
  EXPECT_FALSE(process(engine, badDepth, ErrorCode::InvalidBitDepth));
  SyntheticFrame badColor(PixelFormat::RGBA, 107, 8);
  badColor.view.matrix = aisenshot::ColorMatrix::Unspecified;
  EXPECT_FALSE(process(engine, badColor, ErrorCode::InvalidColorMetadata));
}

void testFlushLifecycle() {
  SceneEngine engine;
  SyntheticFrame frame(PixelFormat::RGBA, 0, 0);
  EXPECT_TRUE(process(engine, frame));
  SceneEvent event{};
  bool emitted = true;
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(engine.flush(&event, &emitted, &error));
  EXPECT_FALSE(emitted);
  EXPECT_FALSE(process(engine, frame, ErrorCode::EngineFlushed));
  engine.reset();
  EXPECT_TRUE(process(engine, frame));
}

void testContentDetectorIntegration() {
  aisenshot::EngineConfig config;
  config.detector = aisenshot::DetectorKind::Content;
  config.content_threshold_q = 1000;
  config.minimum_scene_duration_us = 0;
  SceneEngine engine(config);
  SyntheticFrame first(PixelFormat::RGBA, 0, 0);
  SyntheticFrame second(PixelFormat::RGBA, 700'000, 1);
  first.fill_rgba(0, 0, 0);
  second.fill_rgba(255, 255, 255);
  SceneEvent event{};
  bool emitted = true;
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(engine.process(first.view, &event, &emitted, &error));
  EXPECT_FALSE(emitted);
  EXPECT_TRUE(engine.process(second.view, &event, &emitted, &error));
  EXPECT_TRUE(emitted);
  EXPECT_EQ(event.type, aisenshot::SceneEventType::HardCut);
  EXPECT_EQ(event.timestamp_us, 700'000);
  EXPECT_EQ(event.source, static_cast<std::uint8_t>(aisenshot::DetectorKind::Content));
}

void testInvalidConfiguration() {
  aisenshot::EngineConfig config;
  config.content_luma_weight_q = 0;
  config.content_hue_weight_q = 0;
  config.content_saturation_weight_q = 0;
  SceneEngine engine(config);
  SyntheticFrame frame(PixelFormat::RGBA, 0, 0);
  EXPECT_FALSE(process(engine, frame, ErrorCode::InvalidConfiguration));
}

void testCheckpointResumeParity() {
  aisenshot::EngineConfig config;
  config.detector = aisenshot::DetectorKind::Content;
  config.content_threshold_q = 1000;
  config.minimum_scene_duration_us = 0;
  SceneEngine continuous(config);
  SceneEngine resumed(config);
  SyntheticFrame first(PixelFormat::RGBA, 0, 0);
  SyntheticFrame second(PixelFormat::RGBA, 700'000, 1);
  first.fill_rgba(0, 0, 0);
  second.fill_rgba(255, 255, 255);
  SceneEvent eventA{};
  bool emittedA = false;
  ErrorCode error = ErrorCode::InvalidArgument;
  EXPECT_TRUE(continuous.process(first.view, &eventA, &emittedA, &error));
  std::vector<std::uint8_t> checkpoint;
  EXPECT_TRUE(continuous.export_checkpoint(0x1234, &checkpoint, &error));
  EXPECT_TRUE(resumed.import_checkpoint(checkpoint, 0x1234, &error));
  SceneEvent eventB{};
  bool emittedB = false;
  EXPECT_TRUE(continuous.process(second.view, &eventA, &emittedA, &error));
  EXPECT_TRUE(resumed.process(second.view, &eventB, &emittedB, &error));
  EXPECT_EQ(emittedA, emittedB);
  EXPECT_EQ(eventA.timestamp_us, eventB.timestamp_us);
  EXPECT_EQ(eventA.score_q, eventB.score_q);
  std::vector<std::uint8_t> after_event;
  EXPECT_TRUE(continuous.export_checkpoint(0x1234, &after_event, &error));
  SceneEngine replay(config);
  EXPECT_TRUE(replay.import_checkpoint(after_event, 0x1234, &error));
  SyntheticFrame third(PixelFormat::RGBA, 1'400'000, 2);
  third.fill_rgba(0, 0, 0);
  SceneEvent eventC{};
  bool emittedC = false;
  EXPECT_TRUE(continuous.process(third.view, &eventA, &emittedA, &error));
  EXPECT_TRUE(replay.process(third.view, &eventC, &emittedC, &error));
  EXPECT_EQ(emittedA, emittedC);
  EXPECT_EQ(eventA.timestamp_us, eventC.timestamp_us);
  auto corrupted = checkpoint;
  corrupted[0] ^= 1U;
  EXPECT_FALSE(resumed.import_checkpoint(corrupted, 0x1234, &error));
}

}  // namespace

int run_scene_engine_tests() {
  testCreateDestroyAndFlush();
  testFormatsAndReset();
  testOrderingAndInvalidFrames();
  testFlushLifecycle();
  testContentDetectorIntegration();
  testInvalidConfiguration();
  testCheckpointResumeParity();
  return 0;
}
