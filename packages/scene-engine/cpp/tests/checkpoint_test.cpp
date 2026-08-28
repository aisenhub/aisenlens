#include "aisenshot/checkpoint.h"
#include "test_harness.h"

namespace {

void testRoundTripAndValidation() {
  aisenshot::CheckpointState state{};
  state.config_hash = 0x11223344ULL;
  state.last_timestamp_us = 1234567;
  state.last_presentation_index = 99;
  std::vector<std::uint8_t> bytes;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  EXPECT_TRUE(aisenshot::serialize_checkpoint(state, &bytes, &error));
  aisenshot::CheckpointState restored{};
  EXPECT_TRUE(aisenshot::deserialize_checkpoint(bytes, state.config_hash, 1, &restored, &error));
  EXPECT_EQ(restored.last_timestamp_us, state.last_timestamp_us);
  EXPECT_EQ(restored.last_presentation_index, state.last_presentation_index);
  bytes[0] ^= 0xFF;
  EXPECT_FALSE(aisenshot::deserialize_checkpoint(bytes, state.config_hash, 1, &restored, &error));
  EXPECT_EQ(error, aisenshot::ErrorCode::InvalidCheckpoint);
}

void testTruncatedAndWrongVersionDoNotMutate() {
  aisenshot::CheckpointState state{};
  state.config_hash = 7;
  std::vector<std::uint8_t> bytes;
  aisenshot::ErrorCode error = aisenshot::ErrorCode::InvalidArgument;
  EXPECT_TRUE(aisenshot::serialize_checkpoint(state, &bytes, &error));
  aisenshot::CheckpointState restored{};
  restored.last_timestamp_us = 88;
  auto truncated = bytes;
  truncated.pop_back();
  EXPECT_FALSE(aisenshot::deserialize_checkpoint(truncated, 7, 1, &restored, &error));
  EXPECT_EQ(restored.last_timestamp_us, 88);
  EXPECT_FALSE(aisenshot::deserialize_checkpoint(bytes, 8, 1, &restored, &error));
  EXPECT_EQ(restored.last_timestamp_us, 88);
}

}  // namespace

int run_checkpoint_tests() {
  testRoundTripAndValidation();
  testTruncatedAndWrongVersionDoNotMutate();
  return 0;
}
