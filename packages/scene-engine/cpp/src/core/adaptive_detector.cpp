#include "aisenshot/adaptive_detector.h"

namespace aisenshot {

AdaptiveDetector::AdaptiveDetector(const EngineConfig& config) : config_(config) {
  window_.reserve(static_cast<std::size_t>(config_.adaptive_window_width) * 2U + 1U);
}

std::uint32_t AdaptiveDetector::lookahead_frames() const { return config_.adaptive_window_width; }

bool AdaptiveDetector::evaluate(std::size_t center, SceneEvent* event) {
  const std::size_t width = config_.adaptive_window_width;
  if (center >= window_.size() || window_.empty()) return false;
  const Entry& target = window_[center];
  if (has_emitted_ && target.presentation_index <= last_emitted_index_) return false;
  if (has_emitted_ && target.timestamp_us - last_event_timestamp_us_ < config_.minimum_scene_duration_us) return false;
  if (target.score_q < config_.adaptive_min_content_score_q) return false;
  std::int64_t neighbor_sum = 0;
  std::size_t neighbor_count = 0;
  const std::size_t begin = center > width ? center - width : 0;
  const std::size_t end = (center + width + 1U < window_.size()) ? center + width + 1U : window_.size();
  for (std::size_t i = begin; i < end; ++i) {
    if (i == center) continue;
    neighbor_sum += window_[i].score_q;
    ++neighbor_count;
  }
  if (neighbor_count == 0) return false;
  const std::int64_t neighbor_average = (neighbor_sum + static_cast<std::int64_t>(neighbor_count) / 2) / static_cast<std::int64_t>(neighbor_count);
  if (neighbor_average == 0) {
    if (target.score_q <= 0) return false;
  } else if (static_cast<std::int64_t>(target.score_q) * 1000 < static_cast<std::int64_t>(config_.adaptive_threshold_q) * neighbor_average) {
    return false;
  }
  event->type = SceneEventType::HardCut;
  event->timestamp_us = target.timestamp_us;
  event->presentation_index = target.presentation_index;
  event->score_q = target.score_q;
  event->threshold_q = static_cast<std::int32_t>(config_.adaptive_threshold_q);
  event->delta_luma_q = target.delta_luma_q;
  event->delta_hue_q = target.delta_hue_q;
  event->delta_saturation_q = target.delta_saturation_q;
  event->source = static_cast<std::uint8_t>(DetectorKind::Adaptive);
  has_emitted_ = true;
  last_emitted_index_ = target.presentation_index;
  last_event_timestamp_us_ = target.timestamp_us;
  return true;
}

bool AdaptiveDetector::process(const FrameView& frame, const SharedFrameMetrics& metrics,
                               SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  if (!metrics.has_previous) return true;
  window_.push_back({metrics.content_score_q, frame.timestamp_us, frame.presentation_index,
                     metrics.delta_luma_q, metrics.delta_hue_q, metrics.delta_saturation_q});
  const std::size_t required = static_cast<std::size_t>(config_.adaptive_window_width) * 2U + 1U;
  if (window_.size() < required) return true;
  if (evaluate(config_.adaptive_window_width, event)) *emitted = true;
  window_.erase(window_.begin());
  return true;
}

bool AdaptiveDetector::flush(SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  if (window_.size() > 1U) {
    const std::size_t center = window_.size() / 2U;
    if (evaluate(center, event)) *emitted = true;
  }
  window_.clear();
  return true;
}

void AdaptiveDetector::reset() {
  window_.clear();
  has_emitted_ = false;
  last_emitted_index_ = 0;
  last_event_timestamp_us_ = 0;
}

AdaptiveDetectorState AdaptiveDetector::export_state() const {
  AdaptiveDetectorState state{};
  state.last_emitted_index = last_emitted_index_;
  state.has_emitted = has_emitted_;
  state.last_event_timestamp_us = last_event_timestamp_us_;
  state.window.reserve(window_.size());
  for (const Entry& entry : window_) {
    state.window.push_back({entry.score_q, entry.timestamp_us, entry.presentation_index,
                            entry.delta_luma_q, entry.delta_hue_q, entry.delta_saturation_q});
  }
  return state;
}

bool AdaptiveDetector::import_state(const AdaptiveDetectorState& state) {
  const std::size_t max_window = static_cast<std::size_t>(config_.adaptive_window_width) * 2U + 1U;
  if (state.window.size() > max_window) return false;
  window_.clear();
  for (const auto& entry : state.window) {
    window_.push_back({entry.score_q, entry.timestamp_us, entry.presentation_index,
                       entry.delta_luma_q, entry.delta_hue_q, entry.delta_saturation_q});
  }
  last_emitted_index_ = state.last_emitted_index;
  has_emitted_ = state.has_emitted;
  last_event_timestamp_us_ = state.last_event_timestamp_us;
  return true;
}

}  // namespace aisenshot
