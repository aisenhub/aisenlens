#include "aisenshot/scene_engine_abi.h"

#include <algorithm>
#include <cstring>
#include <new>
#include <vector>

#include "aisenshot/scene_engine.h"

struct asen_engine_t {
  aisenshot::SceneEngine engine;
  explicit asen_engine_t(const aisenshot::EngineConfig& config) : engine(config) {}
};

namespace {

asen_status map_status(aisenshot::ErrorCode error) {
  using aisenshot::ErrorCode;
  switch (error) {
    case ErrorCode::None: return ASEN_STATUS_OK;
    case ErrorCode::InvalidConfiguration: return ASEN_STATUS_INVALID_CONFIGURATION;
    case ErrorCode::UnsupportedPixelFormat: return ASEN_STATUS_UNSUPPORTED_PIXEL_FORMAT;
    case ErrorCode::TimestampOutOfOrder: return ASEN_STATUS_TIMESTAMP_OUT_OF_ORDER;
    case ErrorCode::PresentationIndexOutOfOrder: return ASEN_STATUS_PRESENTATION_INDEX_OUT_OF_ORDER;
    case ErrorCode::EngineFlushed: return ASEN_STATUS_ENGINE_FLUSHED;
    case ErrorCode::InvalidCheckpoint: return ASEN_STATUS_INVALID_CHECKPOINT;
    case ErrorCode::InvalidArgument: return ASEN_STATUS_INVALID_ARGUMENT;
    default: return ASEN_STATUS_INVALID_FRAME;
  }
}

aisenshot::EngineConfig convert_config(const asen_config* input) {
  aisenshot::EngineConfig config{};
  if (!input) return config;
  config.version = input->version;
  config.detector = static_cast<aisenshot::DetectorKind>(input->detector);
  config.threshold_enabled = input->threshold_enabled != 0;
  config.threshold_mode = static_cast<aisenshot::ThresholdMode>(input->threshold_mode);
  config.emit_final_fade = input->emit_final_fade != 0;
  config.analysis_width = input->analysis_width;
  config.analysis_height = input->analysis_height;
  config.content_threshold_q = input->content_threshold_q;
  config.content_luma_weight_q = input->content_luma_weight_q;
  config.content_hue_weight_q = input->content_hue_weight_q;
  config.content_saturation_weight_q = input->content_saturation_weight_q;
  config.minimum_scene_duration_us = input->minimum_scene_duration_us;
  config.adaptive_threshold_q = input->adaptive_threshold_q;
  config.adaptive_window_width = input->adaptive_window_width;
  config.adaptive_min_content_score_q = input->adaptive_min_content_score_q;
  config.threshold_luma_q = input->threshold_luma_q;
  config.fade_bias_q = input->fade_bias_q;
  return config;
}

aisenshot::FrameView convert_frame(const asen_frame_view& input) {
  aisenshot::FrameView frame{};
  frame.pixel_format = static_cast<aisenshot::PixelFormat>(input.pixel_format);
  frame.plane_count = input.plane_count;
  frame.bit_depth = input.bit_depth;
  frame.full_range = input.full_range != 0;
  for (int i = 0; i < 3; ++i) frame.planes[i] = {input.planes[i].data, input.planes[i].size_bytes, input.planes[i].stride_bytes};
  frame.coded_width = input.coded_width;
  frame.coded_height = input.coded_height;
  frame.visible_x = input.visible_x;
  frame.visible_y = input.visible_y;
  frame.visible_width = input.visible_width;
  frame.visible_height = input.visible_height;
  frame.matrix = static_cast<aisenshot::ColorMatrix>(input.matrix);
  frame.primaries = static_cast<aisenshot::ColorPrimaries>(input.primaries);
  frame.transfer = static_cast<aisenshot::TransferFunction>(input.transfer);
  frame.presentation_index = input.presentation_index;
  frame.timestamp_us = input.timestamp_us;
  frame.duration_us = input.duration_us;
  return frame;
}

void copy_event(const aisenshot::SceneEvent& input, asen_scene_event* output) {
  output->type = static_cast<uint8_t>(input.type);
  output->direction = input.direction;
  output->source = input.source;
  output->reserved = 0;
  output->timestamp_us = input.timestamp_us;
  output->presentation_index = input.presentation_index;
  output->score_q = input.score_q;
  output->threshold_q = input.threshold_q;
  output->delta_luma_q = input.delta_luma_q;
  output->delta_hue_q = input.delta_hue_q;
  output->delta_saturation_q = input.delta_saturation_q;
  output->transition_start_us = input.transition_start_us;
  output->transition_end_us = input.transition_end_us;
  output->boundary_timestamp_us = input.boundary_timestamp_us;
}

}  // namespace

extern "C" {

uint32_t asen_abi_version(void) { return ASEN_ABI_VERSION; }

asen_status asen_create(const asen_config* config, asen_engine_t** out_engine) {
  if (!out_engine) return ASEN_STATUS_INVALID_ARGUMENT;
  *out_engine = nullptr;
  try {
    auto* engine = new asen_engine_t(convert_config(config));
    *out_engine = engine;
    return ASEN_STATUS_OK;
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

asen_status asen_destroy(asen_engine_t* engine) {
  if (!engine) return ASEN_STATUS_INVALID_ARGUMENT;
  delete engine;
  return ASEN_STATUS_OK;
}

asen_status asen_process_frame(asen_engine_t* engine, const asen_frame_view* frame, asen_scene_event* event, uint8_t* emitted) {
  if (!engine || !frame || !event || !emitted) return ASEN_STATUS_INVALID_ARGUMENT;
  try {
    bool did_emit = false;
    aisenshot::ErrorCode error = aisenshot::ErrorCode::None;
    aisenshot::SceneEvent native_event{};
    const bool ok = engine->engine.process(convert_frame(*frame), &native_event, &did_emit, &error);
    *emitted = did_emit ? 1U : 0U;
    if (did_emit) copy_event(native_event, event);
    return ok ? map_status(error) : map_status(error);
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

asen_status asen_reserve_frame(const asen_engine_t* engine, uint32_t width, uint32_t height, uint8_t pixel_format, asen_frame_layout* layout) {
  if (!engine || !layout || width == 0 || height == 0) return ASEN_STATUS_INVALID_ARGUMENT;
  if (width > UINT32_MAX / 4U) return ASEN_STATUS_INVALID_ARGUMENT;
  const uint64_t chroma_width = (static_cast<uint64_t>(width) + 1U) / 2U;
  const uint64_t chroma_height = (static_cast<uint64_t>(height) + 1U) / 2U;
  uint64_t total = 0;
  *layout = {};
  if (pixel_format == static_cast<uint8_t>(aisenshot::PixelFormat::I420)) {
    layout->plane_count = 3; layout->strides[0] = width; layout->strides[1] = static_cast<uint32_t>(chroma_width); layout->strides[2] = layout->strides[1];
    const uint64_t y_size = static_cast<uint64_t>(width) * height;
    const uint64_t uv_size = chroma_width * chroma_height;
    total = y_size + uv_size * 2U; layout->sizes[0] = static_cast<uint32_t>(y_size); layout->sizes[1] = static_cast<uint32_t>(uv_size); layout->sizes[2] = layout->sizes[1];
  } else if (pixel_format == static_cast<uint8_t>(aisenshot::PixelFormat::NV12)) {
    layout->plane_count = 2; layout->strides[0] = width; layout->strides[1] = static_cast<uint32_t>(chroma_width * 2U);
    const uint64_t y_size = static_cast<uint64_t>(width) * height;
    const uint64_t uv_size = chroma_width * chroma_height * 2U;
    total = y_size + uv_size; layout->sizes[0] = static_cast<uint32_t>(y_size); layout->sizes[1] = static_cast<uint32_t>(uv_size);
  } else if (pixel_format == static_cast<uint8_t>(aisenshot::PixelFormat::RGBX) || pixel_format == static_cast<uint8_t>(aisenshot::PixelFormat::RGBA)) {
    layout->plane_count = 1; layout->strides[0] = width * 4U; total = static_cast<uint64_t>(width) * height * 4U; layout->sizes[0] = static_cast<uint32_t>(total);
  } else {
    return ASEN_STATUS_UNSUPPORTED_PIXEL_FORMAT;
  }
  if (total > UINT32_MAX) return ASEN_STATUS_INVALID_ARGUMENT;
  layout->total_bytes = static_cast<uint32_t>(total);
  return ASEN_STATUS_OK;
}

asen_status asen_flush(asen_engine_t* engine, asen_scene_event* event, uint8_t* emitted) {
  if (!engine || !event || !emitted) return ASEN_STATUS_INVALID_ARGUMENT;
  try {
    bool did_emit = false;
    aisenshot::ErrorCode error = aisenshot::ErrorCode::None;
    aisenshot::SceneEvent native_event{};
    const bool ok = engine->engine.flush(&native_event, &did_emit, &error);
    *emitted = did_emit ? 1U : 0U;
    if (did_emit) copy_event(native_event, event);
    return ok ? map_status(error) : map_status(error);
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

asen_status asen_read_events(const asen_engine_t* engine, uint64_t offset, asen_scene_event* events, uint32_t capacity, uint32_t* written, uint64_t* total) {
  if (!engine || !written || !total || (capacity > 0 && !events)) return ASEN_STATUS_INVALID_ARGUMENT;
  try {
    std::vector<aisenshot::SceneEvent> native_events(capacity);
    aisenshot::ErrorCode error = aisenshot::ErrorCode::None;
    const bool ok = engine->engine.read_events(offset, native_events.data(), capacity, written, total, &error);
    if (ok) for (uint32_t i = 0; i < *written; ++i) copy_event(native_events[i], &events[i]);
    return ok ? map_status(error) : map_status(error);
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

asen_status asen_export_checkpoint(const asen_engine_t* engine, uint64_t config_hash, uint8_t* buffer, uint32_t capacity, uint32_t* required) {
  if (!engine || !required) return ASEN_STATUS_INVALID_ARGUMENT;
  try {
    std::vector<uint8_t> bytes;
    aisenshot::ErrorCode error = aisenshot::ErrorCode::None;
    if (!engine->engine.export_checkpoint(config_hash, &bytes, &error)) return map_status(error);
    *required = static_cast<uint32_t>(bytes.size());
    if (!buffer) return ASEN_STATUS_OK;
    if (capacity < bytes.size()) return ASEN_STATUS_INVALID_ARGUMENT;
    std::memcpy(buffer, bytes.data(), bytes.size());
    return ASEN_STATUS_OK;
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

asen_status asen_import_checkpoint(asen_engine_t* engine, const uint8_t* buffer, uint32_t size, uint64_t expected_config_hash) {
  if (!engine || !buffer || size == 0) return ASEN_STATUS_INVALID_ARGUMENT;
  try {
    aisenshot::ErrorCode error = aisenshot::ErrorCode::None;
    std::vector<uint8_t> bytes(buffer, buffer + size);
    const bool ok = engine->engine.import_checkpoint(bytes, expected_config_hash, &error);
    return ok ? map_status(error) : map_status(error);
  } catch (...) {
    return ASEN_STATUS_INTERNAL_ERROR;
  }
}

}  // extern "C"
