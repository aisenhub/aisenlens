#pragma once

#include "aisenshot/config.h"
#include "aisenshot/error.h"
#include "aisenshot/frame_metrics.h"
#include "aisenshot/frame_view.h"
#include "aisenshot/scene_event.h"

namespace aisenshot {

struct ContentDetectorState {
  bool has_event = false;
  std::int64_t last_event_timestamp_us = 0;
};

class ContentDetector {
 public:
  explicit ContentDetector(const EngineConfig& config = {});

  bool process(const FrameView& frame, const SharedFrameMetrics& metrics,
               SceneEvent* event, bool* emitted, ErrorCode* error);
  bool flush(SceneEvent* event, bool* emitted, ErrorCode* error);
  void reset();
  ContentDetectorState export_state() const;
  bool import_state(const ContentDetectorState& state);

 private:
  EngineConfig config_{};
  bool has_event_ = false;
  std::int64_t last_event_timestamp_us_ = 0;
};

}  // namespace aisenshot
