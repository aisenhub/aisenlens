#ifndef AISENSHOT_SCENE_ENGINE_ABI_H
#define AISENSHOT_SCENE_ENGINE_ABI_H

#include <stdint.h>

#ifdef __cplusplus
extern "C" {
#endif

#define ASEN_ABI_VERSION 1u

typedef struct asen_engine_t asen_engine_t;

typedef enum asen_status {
  ASEN_STATUS_OK = 0,
  ASEN_STATUS_INVALID_ARGUMENT = 1,
  ASEN_STATUS_INVALID_CONFIGURATION = 2,
  ASEN_STATUS_UNSUPPORTED_PIXEL_FORMAT = 3,
  ASEN_STATUS_INVALID_FRAME = 4,
  ASEN_STATUS_TIMESTAMP_OUT_OF_ORDER = 5,
  ASEN_STATUS_PRESENTATION_INDEX_OUT_OF_ORDER = 6,
  ASEN_STATUS_ENGINE_FLUSHED = 7,
  ASEN_STATUS_INVALID_CHECKPOINT = 8,
  ASEN_STATUS_INTERNAL_ERROR = 255
} asen_status;

typedef struct asen_config {
  uint32_t version;
  uint8_t detector;
  uint8_t threshold_enabled;
  uint8_t threshold_mode;
  uint8_t emit_final_fade;
  uint32_t analysis_width;
  uint32_t analysis_height;
  int32_t content_threshold_q;
  int32_t content_luma_weight_q;
  int32_t content_hue_weight_q;
  int32_t content_saturation_weight_q;
  int64_t minimum_scene_duration_us;
  uint32_t adaptive_threshold_q;
  uint32_t adaptive_window_width;
  int32_t adaptive_min_content_score_q;
  int32_t threshold_luma_q;
  int32_t fade_bias_q;
} asen_config;

typedef struct asen_plane_view {
  const uint8_t* data;
  uint32_t size_bytes;
  uint32_t stride_bytes;
} asen_plane_view;

typedef struct asen_frame_view {
  uint8_t pixel_format;
  uint8_t plane_count;
  uint8_t bit_depth;
  uint8_t full_range;
  asen_plane_view planes[3];
  uint32_t coded_width;
  uint32_t coded_height;
  uint32_t visible_x;
  uint32_t visible_y;
  uint32_t visible_width;
  uint32_t visible_height;
  uint8_t matrix;
  uint8_t primaries;
  uint8_t transfer;
  uint8_t reserved;
  uint64_t presentation_index;
  int64_t timestamp_us;
  int64_t duration_us;
} asen_frame_view;

typedef struct asen_scene_event {
  uint8_t type;
  uint8_t direction;
  uint8_t source;
  uint8_t reserved;
  int64_t timestamp_us;
  uint64_t presentation_index;
  int32_t score_q;
  int32_t threshold_q;
  int32_t delta_luma_q;
  int32_t delta_hue_q;
  int32_t delta_saturation_q;
  int64_t transition_start_us;
  int64_t transition_end_us;
  int64_t boundary_timestamp_us;
} asen_scene_event;

typedef struct asen_frame_layout {
  uint32_t plane_count;
  uint32_t strides[3];
  uint32_t sizes[3];
  uint32_t total_bytes;
} asen_frame_layout;

uint32_t asen_abi_version(void);
asen_status asen_create(const asen_config* config, asen_engine_t** out_engine);
asen_status asen_destroy(asen_engine_t* engine);
asen_status asen_process_frame(asen_engine_t* engine, const asen_frame_view* frame,
                               asen_scene_event* event, uint8_t* emitted);
asen_status asen_reserve_frame(const asen_engine_t* engine, uint32_t width, uint32_t height,
                               uint8_t pixel_format, asen_frame_layout* layout);
asen_status asen_flush(asen_engine_t* engine, asen_scene_event* event, uint8_t* emitted);
asen_status asen_read_events(const asen_engine_t* engine, uint64_t offset, asen_scene_event* events,
                             uint32_t capacity, uint32_t* written, uint64_t* total);
asen_status asen_export_checkpoint(const asen_engine_t* engine, uint64_t config_hash,
                                   uint8_t* buffer, uint32_t capacity, uint32_t* required);
asen_status asen_import_checkpoint(asen_engine_t* engine, const uint8_t* buffer,
                                   uint32_t size, uint64_t expected_config_hash);

#ifdef __cplusplus
}
#endif

#endif
