#include "aisenshot/event_resolver.h"
#include "aisenshot/min_scene_filter.h"
#include "test_harness.h"

namespace {

aisenshot::SceneEvent event(aisenshot::SceneEventType type, std::int64_t timestamp, std::uint8_t source) {
  aisenshot::SceneEvent result{};
  result.type = type;
  result.timestamp_us = timestamp;
  result.source = source;
  result.transition_start_us = timestamp - 100;
  result.transition_end_us = timestamp + 100;
  return result;
}

void testResolverOrderAndMerge() {
  std::vector<aisenshot::SceneEvent> input = {
      event(aisenshot::SceneEventType::HardCut, 1000, 2),
      event(aisenshot::SceneEventType::HardCut, 1000, 1),
  };
  const auto resolved = aisenshot::EventResolver::resolve(input, 0);
  EXPECT_EQ(resolved.size(), 1U);
  EXPECT_EQ(resolved[0].source_mask, (1U << 1) | (1U << 2));
}

void testFadeContainsHardCutAndMinimumFilter() {
  auto fade = event(aisenshot::SceneEventType::Fade, 2000, 3);
  fade.transition_start_us = 1800;
  fade.transition_end_us = 2200;
  const auto resolved = aisenshot::EventResolver::resolve({event(aisenshot::SceneEventType::HardCut, 2000, 1), fade}, 0);
  EXPECT_EQ(resolved.size(), 1U);
  EXPECT_EQ(resolved[0].event.type, aisenshot::SceneEventType::Fade);
  aisenshot::MinSceneFilter filter(500);
  const auto filtered = filter.filter({
      {event(aisenshot::SceneEventType::HardCut, 1000, 1), 2},
      {event(aisenshot::SceneEventType::HardCut, 1200, 2), 4},
      {event(aisenshot::SceneEventType::HardCut, 1600, 3), 8},
  });
  EXPECT_EQ(filtered.size(), 2U);
  EXPECT_EQ(filtered[0].source_mask, 6U);
}

}  // namespace

int run_event_resolver_tests() {
  testResolverOrderAndMerge();
  testFadeContainsHardCutAndMinimumFilter();
  return 0;
}
