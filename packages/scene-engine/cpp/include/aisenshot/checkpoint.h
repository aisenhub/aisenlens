#pragma once

#include <cstdint>
#include <vector>

#include "aisenshot/error.h"
#include "aisenshot/adaptive_detector.h"
#include "aisenshot/content_detector.h"
#include "aisenshot/frame_metrics.h"
#include "aisenshot/threshold_detector.h"
#include "aisenshot/event_resolver.h"

namespace aisenshot {

struct CheckpointState {
  std::uint32_t schema_version = 1;
  std::uint32_t engine_state_version = 1;
  std::uint64_t config_hash = 0;
  std::int64_t last_timestamp_us = 0;
  std::uint64_t last_presentation_index = 0;
  bool has_frame = false;
  bool flushed = false;
  SharedFrameMetrics previous_metrics{};
  ContentDetectorState content{};
  AdaptiveDetectorState adaptive{};
  ThresholdDetectorState threshold{};
  std::vector<ResolvedEvent> resolved_history;
  std::uint64_t delivered_event_count = 0;
};

bool serialize_checkpoint(const CheckpointState& state, std::vector<std::uint8_t>* output,
                          ErrorCode* error);
bool deserialize_checkpoint(const std::vector<std::uint8_t>& input,
                            std::uint64_t expected_config_hash,
                            std::uint32_t expected_engine_state_version,
                            CheckpointState* output, ErrorCode* error);

}  // namespace aisenshot
