#pragma once

#include "aisenshot/config.h"
#include "aisenshot/content_detector.h"
#include "aisenshot/adaptive_detector.h"
#include "aisenshot/threshold_detector.h"
#include "aisenshot/checkpoint.h"
#include "aisenshot/event_resolver.h"
#include "aisenshot/min_scene_filter.h"
#include <vector>
#include "aisenshot/error.h"
#include "aisenshot/frame_view.h"
#include "aisenshot/scene_event.h"

namespace aisenshot {

class SceneEngine {
 public:
  explicit SceneEngine(const EngineConfig& config = {});
  ~SceneEngine();

  SceneEngine(const SceneEngine&) = delete;
  SceneEngine& operator=(const SceneEngine&) = delete;

  bool process(const FrameView& frame, SceneEvent* event, bool* emitted, ErrorCode* error);
  bool flush(SceneEvent* event, bool* emitted, ErrorCode* error);
  bool read_events(std::uint64_t offset, SceneEvent* events, std::uint32_t capacity,
                   std::uint32_t* written, std::uint64_t* total, ErrorCode* error) const;
  bool export_checkpoint(std::uint64_t config_hash, std::vector<std::uint8_t>* output, ErrorCode* error) const;
  bool import_checkpoint(const std::vector<std::uint8_t>& input, std::uint64_t expected_config_hash, ErrorCode* error);
  void reset();

 private:
  EngineConfig config_{};
  bool has_frame_ = false;
  bool flushed_ = false;
  std::int64_t last_timestamp_us_ = 0;
  std::uint64_t last_presentation_index_ = 0;
  SharedFrameMetrics previous_metrics_{};
  bool config_valid_ = true;
  ContentDetector content_detector_;
  AdaptiveDetector adaptive_detector_;
  ThresholdDetector threshold_detector_;
  std::vector<ResolvedEvent> resolved_history_;
  std::size_t delivered_event_count_ = 0;
  MinSceneFilter min_scene_filter_;

  bool publish_candidates(const std::vector<SceneEvent>& candidates, SceneEvent* event, bool* emitted, ErrorCode* error);
};

}  // namespace aisenshot
