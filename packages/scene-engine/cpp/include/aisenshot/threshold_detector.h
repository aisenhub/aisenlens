#pragma once

#include "aisenshot/config.h"
#include "aisenshot/error.h"
#include "aisenshot/frame_metrics.h"
#include "aisenshot/frame_view.h"
#include "aisenshot/scene_event.h"

namespace aisenshot {

struct ThresholdDetectorState {
  bool processed = false;
  bool fade_out = false;
  std::int64_t fade_start_us = 0;
  std::uint64_t fade_start_index = 0;
  std::int64_t last_scene_cut_us = 0;
  std::int64_t last_timestamp_us = 0;
};

class ThresholdDetector {
 public:
  explicit ThresholdDetector(const EngineConfig& config = {});

  bool process(const FrameView& frame, const SharedFrameMetrics& metrics,
               SceneEvent* event, bool* emitted, ErrorCode* error);
  bool flush(SceneEvent* event, bool* emitted, ErrorCode* error);
  void reset();
  ThresholdDetectorState export_state() const;
  bool import_state(const ThresholdDetectorState& state);

 private:
  bool is_fade_out(std::int32_t luma) const;
  bool is_fade_in(std::int32_t luma) const;
  bool emit_fade(const FrameView& frame, SceneEvent* event);
  EngineConfig config_{};
  bool processed_ = false;
  bool fade_out_ = false;
  std::int64_t fade_start_us_ = 0;
  std::uint64_t fade_start_index_ = 0;
  std::int64_t last_scene_cut_us_ = 0;
  std::int64_t last_timestamp_us_ = 0;
};

}  // namespace aisenshot
