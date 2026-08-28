cmake_minimum_required(VERSION 3.24)

project(aisenlens_scene_engine LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

option(AISENSHOT_ENABLE_SANITIZERS "Enable address and undefined behavior sanitizers when supported" OFF)
option(AISENSHOT_BUILD_WASM "Build the baseline Emscripten module" OFF)

add_library(aisenshot_scene_engine_core STATIC
  cpp/src/core/detector_pipeline.cpp
  cpp/src/core/downscale.cpp
  cpp/src/core/yuv_to_hsv.cpp
  cpp/src/core/frame_metrics.cpp
  cpp/src/core/content_detector.cpp
  cpp/src/core/adaptive_detector.cpp
  cpp/src/core/threshold_detector.cpp
  cpp/src/core/event_resolver.cpp
  cpp/src/core/min_scene_filter.cpp
  cpp/src/core/checkpoint.cpp
  cpp/src/core/scene_engine_abi.cpp
  cpp/src/core/scene_engine.cpp
)
target_include_directories(aisenshot_scene_engine_core PUBLIC cpp/include)

if(MSVC)
  target_compile_options(aisenshot_scene_engine_core PRIVATE /W4 /permissive-)
else()
  target_compile_options(aisenshot_scene_engine_core PRIVATE -Wall -Wextra -Wpedantic)
endif()

if(AISENSHOT_ENABLE_SANITIZERS AND NOT MSVC)
  target_compile_options(aisenshot_scene_engine_core PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
  target_link_options(aisenshot_scene_engine_core PRIVATE -fsanitize=address,undefined)
endif()

if(AISENSHOT_BUILD_WASM)
  if(NOT EMSCRIPTEN)
    message(FATAL_ERROR "AISENSHOT_BUILD_WASM requires configuring with emcmake")
  endif()

  include(cmake/EmscriptenOptions.cmake)

  if(AISENSHOT_WASM_SIMD)
    target_compile_options(aisenshot_scene_engine_core PRIVATE -msimd128)
  endif()

  add_executable(aisenshot_scene_engine_wasm
    cpp/src/wasm/wasm_entry.cpp
  )
  target_link_libraries(aisenshot_scene_engine_wasm PRIVATE aisenshot_scene_engine_core)
  aisenshot_configure_wasm_target(aisenshot_scene_engine_wasm)
endif()

include(CTest)
if(BUILD_TESTING)
  add_library(aisenshot_scene_engine_abi_c_smoke OBJECT cpp/tests/scene_engine_abi_smoke.c)
  target_include_directories(aisenshot_scene_engine_abi_c_smoke PRIVATE cpp/include)
  add_executable(aisenshot_scene_engine_tests
    cpp/tests/test_main.cpp
    cpp/tests/synthetic_frame_factory.cpp
    cpp/tests/scene_engine_test.cpp
    cpp/tests/frame_metrics_test.cpp
    cpp/tests/content_detector_test.cpp
    cpp/tests/adaptive_detector_test.cpp
    cpp/tests/threshold_detector_test.cpp
    cpp/tests/event_resolver_test.cpp
    cpp/tests/checkpoint_test.cpp
    cpp/tests/scene_engine_abi_test.cpp
  )
  target_link_libraries(aisenshot_scene_engine_tests PRIVATE aisenshot_scene_engine_core)
  target_include_directories(aisenshot_scene_engine_tests PRIVATE cpp/tests)
  if(MSVC)
    target_compile_options(aisenshot_scene_engine_tests PRIVATE /W4 /permissive-)
  else()
    target_compile_options(aisenshot_scene_engine_tests PRIVATE -Wall -Wextra -Wpedantic)
  endif()
  if(AISENSHOT_ENABLE_SANITIZERS AND NOT MSVC)
    target_compile_options(aisenshot_scene_engine_tests PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(aisenshot_scene_engine_tests PRIVATE -fsanitize=address,undefined)
  endif()
  add_test(NAME aisenshot_scene_engine_tests COMMAND aisenshot_scene_engine_tests)
endif()
