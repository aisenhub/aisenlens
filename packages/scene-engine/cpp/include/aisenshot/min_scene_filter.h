#pragma once

#include <cstdint>
#include <vector>

#include "aisenshot/event_resolver.h"

namespace aisenshot {

class MinSceneFilter {
 public:
  explicit MinSceneFilter(std::int64_t minimum_scene_duration_us);

  std::vector<ResolvedEvent> filter(const std::vector<ResolvedEvent>& input) const;

 private:
  std::int64_t minimum_scene_duration_us_ = 0;
};

}  // namespace aisenshot
