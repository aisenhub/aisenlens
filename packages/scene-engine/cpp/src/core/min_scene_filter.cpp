#include "aisenshot/min_scene_filter.h"

#include <algorithm>

namespace aisenshot {

MinSceneFilter::MinSceneFilter(std::int64_t minimum_scene_duration_us)
    : minimum_scene_duration_us_(std::max<std::int64_t>(0, minimum_scene_duration_us)) {}

std::vector<ResolvedEvent> MinSceneFilter::filter(const std::vector<ResolvedEvent>& input) const {
  std::vector<ResolvedEvent> sorted = input;
  std::sort(sorted.begin(), sorted.end(), [](const ResolvedEvent& left, const ResolvedEvent& right) {
    return left.event.timestamp_us < right.event.timestamp_us;
  });
  std::vector<ResolvedEvent> output;
  for (const ResolvedEvent& event : sorted) {
    if (output.empty() || event.event.timestamp_us - output.back().event.timestamp_us >= minimum_scene_duration_us_) {
      output.push_back(event);
    } else {
      // Keep evidence/source provenance when a candidate is suppressed.
      output.back().source_mask |= event.source_mask;
    }
  }
  return output;
}

}  // namespace aisenshot
