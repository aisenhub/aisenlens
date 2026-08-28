#include "aisenshot/scene_engine_abi.h"

int main(void) {
  asen_engine_t* engine = 0;
  asen_config config = {0};
  asen_scene_event event = {0};
  uint8_t emitted = 0;
  (void)asen_abi_version();
  (void)asen_create(&config, &engine);
  (void)asen_process_frame(engine, (const asen_frame_view*)0, &event, &emitted);
  (void)asen_destroy(engine);
  return 0;
}
