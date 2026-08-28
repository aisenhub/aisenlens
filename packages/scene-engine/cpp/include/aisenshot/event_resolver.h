#pragma once

#include <cstdint>
#include <vector>

#include "aisenshot/scene_event.h"

namespace aisenshot {

struct ResolvedEvent {
  SceneEvent event{};
  std::uint32_t source_mask = 0;
};

class EventResolver {
 public:
  static std::vector<ResolvedEvent> resolve(const std::vector<SceneEvent>& input,
                                            std::int64_t merge_tolerance_us = 0);
};

}  // namespace aisenshot
