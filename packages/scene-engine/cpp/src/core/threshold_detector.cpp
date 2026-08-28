#include "aisenshot/threshold_detector.h"

namespace aisenshot {

ThresholdDetector::ThresholdDetector(const EngineConfig& config) : config_(config) {}

bool ThresholdDetector::is_fade_out(std::int32_t luma) const {
  return config_.threshold_mode == ThresholdMode::Floor ? luma < config_.threshold_luma_q : luma >= config_.threshold_luma_q;
}

bool ThresholdDetector::is_fade_in(std::int32_t luma) const { return !is_fade_out(luma); }

bool ThresholdDetector::emit_fade(const FrameView& frame, SceneEvent* event) {
  const std::int64_t duration = frame.timestamp_us - fade_start_us_;
  if (duration < config_.minimum_scene_duration_us || !event) return false;
  const std::int64_t fraction = 1000 + config_.fade_bias_q;
  const std::int64_t boundary = fade_start_us_ + (duration * fraction + 1000) / 2000;
  event->type = SceneEventType::Fade;
  event->timestamp_us = boundary;
  event->presentation_index = frame.presentation_index;
  event->score_q = frame.timestamp_us > fade_start_us_ ? static_cast<std::int32_t>(duration) : 0;
  event->threshold_q = config_.threshold_luma_q;
  event->transition_start_us = fade_start_us_;
  event->transition_end_us = frame.timestamp_us;
  event->boundary_timestamp_us = boundary;
  event->direction = config_.threshold_mode == ThresholdMode::Floor ? 0 : 1;
  event->source = static_cast<std::uint8_t>(DetectorKind::Threshold);
  last_scene_cut_us_ = frame.timestamp_us;
  return true;
}

bool ThresholdDetector::process(const FrameView& frame, const SharedFrameMetrics& metrics,
                                SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  last_timestamp_us_ = frame.timestamp_us;
  const std::int32_t luma = metrics.mean_luma_q;
  if (!processed_) {
    processed_ = true;
    fade_out_ = is_fade_out(luma);
    fade_start_us_ = frame.timestamp_us;
    fade_start_index_ = frame.presentation_index;
    last_scene_cut_us_ = frame.timestamp_us;
    return true;
  }
  if (fade_out_ && is_fade_in(luma)) {
    if (emit_fade(frame, event)) *emitted = true;
    fade_out_ = false;
    fade_start_us_ = frame.timestamp_us;
    fade_start_index_ = frame.presentation_index;
  } else if (!fade_out_ && is_fade_out(luma)) {
    fade_out_ = true;
    fade_start_us_ = frame.timestamp_us;
    fade_start_index_ = frame.presentation_index;
  }
  return true;
}

bool ThresholdDetector::flush(SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  if (fade_out_ && config_.emit_final_fade && last_timestamp_us_ - fade_start_us_ >= config_.minimum_scene_duration_us) {
    event->type = SceneEventType::Fade;
    event->timestamp_us = fade_start_us_;
    event->presentation_index = fade_start_index_;
    event->score_q = 0;
    event->threshold_q = config_.threshold_luma_q;
    event->transition_start_us = fade_start_us_;
    event->transition_end_us = last_timestamp_us_;
    event->boundary_timestamp_us = fade_start_us_;
    event->direction = config_.threshold_mode == ThresholdMode::Floor ? 0 : 1;
    event->source = static_cast<std::uint8_t>(DetectorKind::Threshold);
    *emitted = true;
  }
  return true;
}

void ThresholdDetector::reset() {
  processed_ = false;
  fade_out_ = false;
  fade_start_us_ = 0;
  fade_start_index_ = 0;
  last_scene_cut_us_ = 0;
  last_timestamp_us_ = 0;
}

ThresholdDetectorState ThresholdDetector::export_state() const {
  return {processed_, fade_out_, fade_start_us_, fade_start_index_, last_scene_cut_us_, last_timestamp_us_};
}

bool ThresholdDetector::import_state(const ThresholdDetectorState& state) {
  processed_ = state.processed;
  fade_out_ = state.fade_out;
  fade_start_us_ = state.fade_start_us;
  fade_start_index_ = state.fade_start_index;
  last_scene_cut_us_ = state.last_scene_cut_us;
  last_timestamp_us_ = state.last_timestamp_us;
  return true;
}

}  // namespace aisenshot
