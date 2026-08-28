#include "aisenshot/scene_engine.h"

#include <cstddef>

#include "aisenshot/content_detector.h"
#include "aisenshot/frame_metrics.h"

namespace aisenshot {
namespace {

void setError(ErrorCode* error, ErrorCode value) {
  if (error) *error = value;
}

bool isSupportedFormat(PixelFormat format) {
  return format == PixelFormat::I420 || format == PixelFormat::NV12 || format == PixelFormat::RGBX || format == PixelFormat::RGBA;
}

bool isValidConfig(const EngineConfig& config) {
  if (config.analysis_width == 0 || config.analysis_height == 0 || config.analysis_width > 4096 || config.analysis_height > 4096) return false;
  if (config.content_threshold_q < 0 || config.content_threshold_q > 10000 || config.minimum_scene_duration_us < 0) return false;
  const std::int64_t weight_sum = static_cast<std::int64_t>(config.content_luma_weight_q) + config.content_hue_weight_q + config.content_saturation_weight_q;
  if (config.content_luma_weight_q < 0 || config.content_hue_weight_q < 0 || config.content_saturation_weight_q < 0 || weight_sum <= 0) return false;
  if (config.adaptive_window_width == 0 || config.adaptive_window_width > 120 || config.adaptive_threshold_q == 0 || config.adaptive_min_content_score_q < 0 || config.adaptive_min_content_score_q > 10000) return false;
  if (config.threshold_luma_q < 0 || config.threshold_luma_q > 255 || config.fade_bias_q < -1000 || config.fade_bias_q > 1000) return false;
  return true;
}

std::uint8_t requiredPlaneCount(PixelFormat format) {
  return format == PixelFormat::I420 ? 3 : (format == PixelFormat::NV12 ? 2 : 1);
}

bool validateFrame(const FrameView& frame, ErrorCode* error) {
  if (!isSupportedFormat(frame.pixel_format)) {
    setError(error, ErrorCode::UnsupportedPixelFormat);
    return false;
  }
  if (frame.plane_count != requiredPlaneCount(frame.pixel_format)) {
    setError(error, ErrorCode::InvalidPlaneCount);
    return false;
  }
  if (frame.coded_width == 0 || frame.coded_height == 0) {
    setError(error, ErrorCode::InvalidDimensions);
    return false;
  }
  if (frame.visible_width == 0 || frame.visible_height == 0 || frame.visible_x > frame.coded_width || frame.visible_y > frame.coded_height || frame.visible_width > frame.coded_width - frame.visible_x || frame.visible_height > frame.coded_height - frame.visible_y) {
    setError(error, ErrorCode::InvalidVisibleRect);
    return false;
  }
  if (frame.bit_depth != 8) {
    setError(error, ErrorCode::InvalidBitDepth);
    return false;
  }
  if (frame.matrix == ColorMatrix::Unspecified || frame.primaries == ColorPrimaries::Unspecified || frame.transfer == TransferFunction::Unspecified) {
    setError(error, ErrorCode::InvalidColorMetadata);
    return false;
  }
  if (frame.duration_us < 0) {
    setError(error, ErrorCode::InvalidDuration);
    return false;
  }
  const std::uint32_t chroma_width = (frame.coded_width + 1U) / 2U;
  const std::uint32_t luma_min_stride = frame.pixel_format == PixelFormat::I420 || frame.pixel_format == PixelFormat::NV12 ? frame.coded_width : frame.coded_width * 4U;
  if (!frame.planes[0].data || frame.planes[0].stride_bytes < luma_min_stride || frame.planes[0].size_bytes < frame.planes[0].stride_bytes * frame.coded_height) {
    setError(error, ErrorCode::InvalidPlane);
    return false;
  }
  if (frame.pixel_format == PixelFormat::I420) {
    const std::uint32_t chroma_height = (frame.coded_height + 1U) / 2U;
    for (std::uint8_t plane = 1; plane < 3; ++plane) {
      if (!frame.planes[plane].data || frame.planes[plane].stride_bytes < chroma_width || frame.planes[plane].size_bytes < frame.planes[plane].stride_bytes * chroma_height) {
        setError(error, ErrorCode::InvalidPlane);
        return false;
      }
    }
  } else if (frame.pixel_format == PixelFormat::NV12) {
    if (!frame.planes[1].data || frame.planes[1].stride_bytes < chroma_width * 2U || frame.planes[1].size_bytes < frame.planes[1].stride_bytes * ((frame.coded_height + 1U) / 2U)) {
      setError(error, ErrorCode::InvalidPlane);
      return false;
    }
  }
  return true;
}

}  // namespace

SceneEngine::SceneEngine(const EngineConfig& config) : config_(config), config_valid_(isValidConfig(config)), content_detector_(config), adaptive_detector_(config), threshold_detector_(config), min_scene_filter_(config.minimum_scene_duration_us) {}
SceneEngine::~SceneEngine() = default;

bool SceneEngine::process(const FrameView& frame, SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (emitted) *emitted = false;
  if (error) *error = ErrorCode::None;
  if (!config_valid_) {
    setError(error, ErrorCode::InvalidConfiguration);
    return false;
  }
  if (flushed_) {
    setError(error, ErrorCode::EngineFlushed);
    return false;
  }
  if (!event || !emitted || !error || !validateFrame(frame, error)) return false;
  if (has_frame_ && frame.timestamp_us < last_timestamp_us_) {
    setError(error, ErrorCode::TimestampOutOfOrder);
    return false;
  }
  if (has_frame_ && frame.presentation_index <= last_presentation_index_) {
    setError(error, ErrorCode::PresentationIndexOutOfOrder);
    return false;
  }
  const bool had_previous_frame = has_frame_;
  SharedFrameMetrics metrics{};
  if (!compute_shared_frame_metrics(frame, config_, had_previous_frame ? &previous_metrics_ : nullptr, &metrics, error)) return false;
  has_frame_ = true;
  last_timestamp_us_ = frame.timestamp_us;
  last_presentation_index_ = frame.presentation_index;
  bool hard_cut_emitted = false;
  std::vector<SceneEvent> candidates;
  if (config_.detector == DetectorKind::Content) {
    if (!content_detector_.process(frame, metrics, event, &hard_cut_emitted, error)) return false;
    if (hard_cut_emitted) candidates.push_back(*event);
  } else if (config_.detector == DetectorKind::Adaptive) {
    if (!adaptive_detector_.process(frame, metrics, event, &hard_cut_emitted, error)) return false;
    if (hard_cut_emitted) candidates.push_back(*event);
  }
  if (config_.threshold_enabled) {
    bool fade_emitted = false;
    if (!threshold_detector_.process(frame, metrics, event, &fade_emitted, error)) return false;
    if (fade_emitted) candidates.push_back(*event);
  }
  previous_metrics_ = metrics;
  return publish_candidates(candidates, event, emitted, error);
}

bool SceneEngine::flush(SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) {
    setError(error, ErrorCode::InvalidArgument);
    return false;
  }
  *emitted = false;
  *error = ErrorCode::None;
  std::vector<SceneEvent> candidates;
  if (config_.threshold_enabled) {
    bool fade_emitted = false;
    if (!threshold_detector_.flush(event, &fade_emitted, error)) return false;
    if (fade_emitted) candidates.push_back(*event);
  }
  if (config_.detector == DetectorKind::Adaptive) {
    bool hard_emitted = false;
    if (!adaptive_detector_.flush(event, &hard_emitted, error)) return false;
    if (hard_emitted) candidates.push_back(*event);
  }
  if (config_.detector == DetectorKind::Content) {
    bool hard_emitted = false;
    if (!content_detector_.flush(event, &hard_emitted, error)) return false;
    if (hard_emitted) candidates.push_back(*event);
  }
  if (!publish_candidates(candidates, event, emitted, error)) return false;
  flushed_ = true;
  return true;
}

bool SceneEngine::read_events(std::uint64_t offset, SceneEvent* events, std::uint32_t capacity,
                              std::uint32_t* written, std::uint64_t* total, ErrorCode* error) const {
  if (!written || !total || !error || (capacity > 0 && !events)) {
    if (error) *error = ErrorCode::InvalidArgument;
    return false;
  }
  const auto filtered = min_scene_filter_.filter(resolved_history_);
  *total = filtered.size();
  *written = 0;
  if (offset > filtered.size()) { *error = ErrorCode::InvalidArgument; return false; }
  const std::uint64_t available = filtered.size() - offset;
  const std::uint32_t count = static_cast<std::uint32_t>(std::min<std::uint64_t>(available, capacity));
  for (std::uint32_t i = 0; i < count; ++i) events[i] = filtered[static_cast<std::size_t>(offset + i)].event;
  *written = count;
  *error = ErrorCode::None;
  return true;
}

bool SceneEngine::publish_candidates(const std::vector<SceneEvent>& candidates, SceneEvent* event, bool* emitted, ErrorCode* error) {
  if (!event || !emitted || !error) return false;
  *emitted = false;
  if (candidates.empty()) return true;
  const auto resolved = EventResolver::resolve(candidates, 0);
  resolved_history_.insert(resolved_history_.end(), resolved.begin(), resolved.end());
  const auto filtered = min_scene_filter_.filter(resolved_history_);
  if (filtered.size() > delivered_event_count_) {
    *event = filtered[delivered_event_count_].event;
    ++delivered_event_count_;
    *emitted = true;
  }
  return true;
}

bool SceneEngine::export_checkpoint(std::uint64_t config_hash, std::vector<std::uint8_t>* output, ErrorCode* error) const {
  CheckpointState state{};
  state.config_hash = config_hash;
  state.last_timestamp_us = last_timestamp_us_;
  state.last_presentation_index = last_presentation_index_;
  state.has_frame = has_frame_;
  state.flushed = flushed_;
  state.previous_metrics = previous_metrics_;
  state.content = content_detector_.export_state();
  state.adaptive = adaptive_detector_.export_state();
  state.threshold = threshold_detector_.export_state();
  state.resolved_history = resolved_history_;
  state.delivered_event_count = delivered_event_count_;
  return serialize_checkpoint(state, output, error);
}

bool SceneEngine::import_checkpoint(const std::vector<std::uint8_t>& input, std::uint64_t expected_config_hash, ErrorCode* error) {
  if (!error) return false;
  CheckpointState state{};
  if (!deserialize_checkpoint(input, expected_config_hash, 1, &state, error)) return false;
  if (!adaptive_detector_.import_state(state.adaptive) || !content_detector_.import_state(state.content) || !threshold_detector_.import_state(state.threshold)) {
    *error = ErrorCode::InvalidCheckpoint;
    return false;
  }
  config_valid_ = isValidConfig(config_);
  has_frame_ = state.has_frame;
  flushed_ = state.flushed;
  last_timestamp_us_ = state.last_timestamp_us;
  last_presentation_index_ = state.last_presentation_index;
  previous_metrics_ = state.previous_metrics;
  resolved_history_ = state.resolved_history;
  delivered_event_count_ = static_cast<std::size_t>(state.delivered_event_count);
  *error = ErrorCode::None;
  return true;
}

void SceneEngine::reset() {
  has_frame_ = false;
  flushed_ = false;
  last_timestamp_us_ = 0;
  last_presentation_index_ = 0;
  previous_metrics_ = {};
  content_detector_.reset();
  adaptive_detector_.reset();
  threshold_detector_.reset();
  resolved_history_.clear();
  delivered_event_count_ = 0;
}

}  // namespace aisenshot
