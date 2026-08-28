#include "aisenshot/content_detector.h"

namespace aisenshot {

ContentDetector::ContentDetector(const EngineConfig& config) : config_(config) {}

bool ContentDetector::process(const FrameView& frame, const SharedFrameMetrics& metrics,
                              SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  if (!metrics.has_previous) return true;
  if (metrics.content_score_q < config_.content_threshold_q) return true;
  if (has_event_ && frame.timestamp_us - last_event_timestamp_us_ < config_.minimum_scene_duration_us) return true;
  event->type = SceneEventType::HardCut;
  event->timestamp_us = frame.timestamp_us;
  event->presentation_index = frame.presentation_index;
  event->score_q = metrics.content_score_q;
  event->threshold_q = config_.content_threshold_q;
  event->delta_luma_q = metrics.delta_luma_q;
  event->delta_hue_q = metrics.delta_hue_q;
  event->delta_saturation_q = metrics.delta_saturation_q;
  event->source = static_cast<std::uint8_t>(DetectorKind::Content);
  *emitted = true;
  has_event_ = true;
  last_event_timestamp_us_ = frame.timestamp_us;
  return true;
}

bool ContentDetector::flush(SceneEvent*, bool* emitted, ErrorCode* error) {
  if (!emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  return true;
}

void ContentDetector::reset() {
  has_event_ = false;
  last_event_timestamp_us_ = 0;
}

ContentDetectorState ContentDetector::export_state() const {
  return {has_event_, last_event_timestamp_us_};
}

bool ContentDetector::import_state(const ContentDetectorState& state) {
  has_event_ = state.has_event;
  last_event_timestamp_us_ = state.last_event_timestamp_us;
  return true;
}

}  // namespace aisenshot
