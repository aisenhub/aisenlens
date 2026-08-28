#pragma once

#include "aisenshot/error.h"
#include "aisenshot/frame_view.h"
#include "aisenshot/scene_event.h"

namespace aisenshot {

class ISceneDetector {
 public:
  virtual ~ISceneDetector() = default;
  virtual const char* id() const = 0;
  virtual std::uint32_t lookahead_frames() const = 0;
  virtual void reset() = 0;
  virtual bool process(const FrameView& frame, SceneEvent* event, bool* emitted, ErrorCode* error) = 0;
  virtual bool flush(SceneEvent* event, bool* emitted, ErrorCode* error) = 0;
};

}  // namespace aisenshot
