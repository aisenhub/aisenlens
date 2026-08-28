#include "aisenshot/scene_engine.h"

namespace aisenshot {

// Phase 1 deliberately has no detector. The pipeline boundary is represented by
// SceneEngine and will be populated by the Content detector in Phase 2.
bool empty_detector_pipeline(const FrameView&, SceneEvent*, bool* emitted, ErrorCode* error) {
  if (emitted) *emitted = false;
  if (error) *error = ErrorCode::None;
  return true;
}

}  // namespace aisenshot
