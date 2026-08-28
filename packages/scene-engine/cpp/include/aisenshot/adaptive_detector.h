#pragma once

#include <cstddef>
#include <cstdint>
#include <vector>

#include "aisenshot/config.h"
#include "aisenshot/error.h"
#include "aisenshot/frame_metrics.h"
#include "aisenshot/frame_view.h"
#include "aisenshot/scene_event.h"

namespace aisenshot {

struct AdaptiveDetectorEntryState {
  std::int32_t score_q = 0;
  std::int64_t timestamp_us = 0;
  std::uint64_t presentation_index = 0;
  std::int32_t delta_luma_q = 0;
  std::int32_t delta_hue_q = 0;
  std::int32_t delta_saturation_q = 0;
};

struct AdaptiveDetectorState {
  std::vector<AdaptiveDetectorEntryState> window;
  std::uint64_t last_emitted_index = 0;
  bool has_emitted = false;
  std::int64_t last_event_timestamp_us = 0;
};

class AdaptiveDetector {
 public:
  explicit AdaptiveDetector(const EngineConfig& config = {});

  std::uint32_t lookahead_frames() const;
  bool process(const FrameView& frame, const SharedFrameMetrics& metrics,
               SceneEvent* event, bool* emitted, ErrorCode* error);
  bool flush(SceneEvent* event, bool* emitted, ErrorCode* error);
  void reset();
  AdaptiveDetectorState export_state() const;
  bool import_state(const AdaptiveDetectorState& state);

 private:
  struct Entry {
    std::int32_t score_q = 0;
    std::int64_t timestamp_us = 0;
    std::uint64_t presentation_index = 0;
    std::int32_t delta_luma_q = 0;
    std::int32_t delta_hue_q = 0;
    std::int32_t delta_saturation_q = 0;
  };

  bool evaluate(std::size_t center, SceneEvent* event);
  EngineConfig config_{};
  std::vector<Entry> window_;
  std::uint64_t last_emitted_index_ = 0;
  bool has_emitted_ = false;
  std::int64_t last_event_timestamp_us_ = 0;
};

}  // namespace aisenshot
