#include "test_harness.h"

int run_scene_engine_tests();
int run_frame_metrics_tests();
int run_content_detector_tests();
int run_adaptive_detector_tests();
int run_threshold_detector_tests();
int run_event_resolver_tests();
int run_checkpoint_tests();
int run_scene_engine_abi_tests();

int main() {
  const int result = run_scene_engine_tests();
  run_frame_metrics_tests();
  run_content_detector_tests();
  run_adaptive_detector_tests();
  run_threshold_detector_tests();
  run_event_resolver_tests();
  run_checkpoint_tests();
  run_scene_engine_abi_tests();
  if (aisenshot_test::failures != 0) return aisenshot_test::failures;
  return result;
}
