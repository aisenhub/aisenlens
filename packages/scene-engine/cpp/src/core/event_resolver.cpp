#include "aisenshot/event_resolver.h"

#include <algorithm>

namespace aisenshot {

std::vector<ResolvedEvent> EventResolver::resolve(const std::vector<SceneEvent>& input,
                                                   std::int64_t merge_tolerance_us) {
  std::vector<SceneEvent> sorted = input;
  std::sort(sorted.begin(), sorted.end(), [](const SceneEvent& left, const SceneEvent& right) {
    if (left.timestamp_us != right.timestamp_us) return left.timestamp_us < right.timestamp_us;
    if (left.type != right.type) return static_cast<int>(left.type) < static_cast<int>(right.type);
    return left.source < right.source;
  });
  std::vector<ResolvedEvent> output;
  for (const SceneEvent& event : sorted) {
    const std::uint32_t bit = 1U << event.source;
    if (!output.empty()) {
      ResolvedEvent& previous = output.back();
      const bool same_hard_cut = previous.event.type == SceneEventType::HardCut && event.type == SceneEventType::HardCut;
      const bool same_fade = previous.event.type == SceneEventType::Fade && event.type == SceneEventType::Fade;
      const bool close = event.timestamp_us - previous.event.timestamp_us <= merge_tolerance_us;
      const bool fade_contains_hard = (previous.event.type == SceneEventType::Fade && event.type == SceneEventType::HardCut &&
                                       event.timestamp_us >= previous.event.transition_start_us && event.timestamp_us <= previous.event.transition_end_us);
      const bool hard_inside_fade = (previous.event.type == SceneEventType::HardCut && event.type == SceneEventType::Fade &&
                                     previous.event.timestamp_us >= event.transition_start_us && previous.event.timestamp_us <= event.transition_end_us);
      if ((close && (same_hard_cut || same_fade || fade_contains_hard)) || hard_inside_fade) {
        previous.source_mask |= bit;
        if (event.type == SceneEventType::Fade) previous.event = event;
        continue;
      }
    }
    output.push_back({event, bit});
  }
  return output;
}

}  // namespace aisenshot
