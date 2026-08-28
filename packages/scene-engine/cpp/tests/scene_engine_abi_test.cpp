#include "aisenshot/scene_engine_abi.h"
#include "synthetic_frame_factory.h"
#include "test_harness.h"

#include <cstddef>
#include <vector>

static_assert(offsetof(asen_frame_view, planes) == 8, "ABI frame plane offset changed");
static_assert(offsetof(asen_scene_event, timestamp_us) == 8, "ABI event timestamp offset changed");
static_assert(sizeof(asen_plane_view) == 16, "ABI plane layout changed");

namespace {

asen_frame_view to_abi(const aisenshot_test::SyntheticFrame& source) {
  asen_frame_view frame = {};
  frame.pixel_format = static_cast<uint8_t>(source.view.pixel_format);
  frame.plane_count = source.view.plane_count;
  frame.bit_depth = source.view.bit_depth;
  frame.full_range = source.view.full_range ? 1U : 0U;
  for (int i = 0; i < 3; ++i) {
    frame.planes[i].data = source.view.planes[i].data;
    frame.planes[i].size_bytes = source.view.planes[i].size_bytes;
    frame.planes[i].stride_bytes = source.view.planes[i].stride_bytes;
  }
  frame.coded_width = source.view.coded_width;
  frame.coded_height = source.view.coded_height;
  frame.visible_width = source.view.visible_width;
  frame.visible_height = source.view.visible_height;
  frame.matrix = static_cast<uint8_t>(source.view.matrix);
  frame.primaries = static_cast<uint8_t>(source.view.primaries);
  frame.transfer = static_cast<uint8_t>(source.view.transfer);
  frame.presentation_index = source.view.presentation_index;
  frame.timestamp_us = source.view.timestamp_us;
  frame.duration_us = source.view.duration_us;
  return frame;
}

void testAbiContentParity() {
  asen_config config = {};
  config.version = 1;
  config.detector = 1;
  config.analysis_width = 96;
  config.analysis_height = 54;
  config.content_threshold_q = 1000;
  config.content_luma_weight_q = 3333;
  config.content_hue_weight_q = 3333;
  config.content_saturation_weight_q = 3334;
  config.adaptive_threshold_q = 3000;
  config.adaptive_window_width = 2;
  config.adaptive_min_content_score_q = 1500;
  asen_engine_t* engine = nullptr;
  EXPECT_EQ(asen_abi_version(), ASEN_ABI_VERSION);
  EXPECT_EQ(asen_create(&config, &engine), ASEN_STATUS_OK);
  asen_frame_layout layout = {};
  EXPECT_EQ(asen_reserve_frame(engine, 9, 7, 1, &layout), ASEN_STATUS_OK);
  EXPECT_EQ(layout.plane_count, 2U);
  EXPECT_EQ(asen_reserve_frame(engine, 9, 7, 99, &layout), ASEN_STATUS_UNSUPPORTED_PIXEL_FORMAT);
  aisenshot_test::SyntheticFrame first(aisenshot::PixelFormat::RGBA, 0, 0);
  aisenshot_test::SyntheticFrame second(aisenshot::PixelFormat::RGBA, 700'000, 1);
  first.fill_rgba(0, 0, 0);
  second.fill_rgba(255, 255, 255);
  asen_scene_event event = {};
  uint8_t emitted = 1;
  auto first_abi = to_abi(first);
  auto second_abi = to_abi(second);
  EXPECT_EQ(asen_process_frame(engine, &first_abi, &event, &emitted), ASEN_STATUS_OK);
  EXPECT_EQ(emitted, 0U);
  EXPECT_EQ(asen_process_frame(engine, &second_abi, &event, &emitted), ASEN_STATUS_OK);
  EXPECT_EQ(emitted, 1U);
  EXPECT_EQ(event.timestamp_us, 700'000);
  uint32_t written = 0;
  uint64_t total = 0;
  EXPECT_EQ(asen_read_events(engine, 0, nullptr, 0, &written, &total), ASEN_STATUS_OK);
  EXPECT_EQ(total, 1U);
  asen_scene_event batch[1] = {};
  EXPECT_EQ(asen_read_events(engine, 0, batch, 1, &written, &total), ASEN_STATUS_OK);
  EXPECT_EQ(written, 1U);
  EXPECT_EQ(batch[0].timestamp_us, 700'000);
  uint32_t required = 0;
  EXPECT_EQ(asen_export_checkpoint(engine, 0x42, nullptr, 0, &required), ASEN_STATUS_OK);
  EXPECT_TRUE(required > 0U);
  std::vector<uint8_t> checkpoint(required);
  EXPECT_EQ(asen_export_checkpoint(engine, 0x42, checkpoint.data(), required, &required), ASEN_STATUS_OK);
  asen_engine_t* restored = nullptr;
  EXPECT_EQ(asen_create(&config, &restored), ASEN_STATUS_OK);
  EXPECT_EQ(asen_import_checkpoint(restored, checkpoint.data(), static_cast<uint32_t>(checkpoint.size()), 0x42), ASEN_STATUS_OK);
  EXPECT_EQ(asen_import_checkpoint(restored, checkpoint.data(), static_cast<uint32_t>(checkpoint.size()), 0x43), ASEN_STATUS_INVALID_CHECKPOINT);
  EXPECT_EQ(asen_destroy(restored), ASEN_STATUS_OK);
  EXPECT_EQ(asen_destroy(engine), ASEN_STATUS_OK);
}

}  // namespace

int run_scene_engine_abi_tests() {
  testAbiContentParity();
  return 0;
}
