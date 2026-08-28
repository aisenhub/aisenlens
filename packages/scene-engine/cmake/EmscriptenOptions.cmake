if(NOT EMSCRIPTEN)
  message(FATAL_ERROR "EmscriptenOptions.cmake requires the Emscripten CMake toolchain")
endif()

set(AISENSHOT_WASM_MODULE_NAME "scene-engine" CACHE STRING "Baseline WASM module filename without extension")
set(AISENSHOT_WASM_EXPORT_NAME "SceneEngineModule" CACHE STRING "Emscripten modularized factory name")
option(AISENSHOT_WASM_SIMD "Enable WebAssembly SIMD instructions for this target" OFF)
set(AISENSHOT_WASM_INITIAL_MEMORY 67108864 CACHE STRING "Baseline WASM initial memory in bytes")
set(AISENSHOT_WASM_MAXIMUM_MEMORY 67108864 CACHE STRING "Baseline WASM maximum memory in bytes")
set(AISENSHOT_WASM_OUTPUT_DIR "${CMAKE_CURRENT_SOURCE_DIR}/dist/wasm" CACHE PATH "Ignored output directory for baseline WASM")

if(NOT AISENSHOT_WASM_MAXIMUM_MEMORY STREQUAL AISENSHOT_WASM_INITIAL_MEMORY)
  message(FATAL_ERROR "Baseline WASM uses fixed memory; maximum memory must equal initial memory")
endif()

# Keep this list as the only native surface reachable from the generated module.
# Emscripten requires the leading underscore for native C symbols.
set(AISENSHOT_WASM_EXPORTED_FUNCTIONS
  "_asen_abi_version,_asen_create,_asen_destroy,_asen_process_frame,_asen_reserve_frame,_asen_flush,_asen_read_events,_asen_export_checkpoint,_asen_import_checkpoint,_malloc,_free"
  CACHE STRING "Stable C ABI and allocation functions exported from baseline WASM")

function(aisenshot_configure_wasm_target target)
  target_compile_options(${target} PRIVATE -fexceptions)
  if(AISENSHOT_WASM_SIMD)
    target_compile_options(${target} PRIVATE -msimd128)
  endif()
  target_link_options(${target} PRIVATE
    --no-entry
    "-sMODULARIZE=1"
    "-sEXPORT_ES6=1"
    "-sEXPORT_NAME=${AISENSHOT_WASM_EXPORT_NAME}"
    "-sENVIRONMENT=web,worker,node"
    "-sALLOW_MEMORY_GROWTH=0"
    "-sINITIAL_MEMORY=${AISENSHOT_WASM_INITIAL_MEMORY}"
    "-sNO_EXIT_RUNTIME=1"
    "-sEXPORTED_RUNTIME_METHODS=HEAPU8"
    "-sFILESYSTEM=0"
    "-sASSERTIONS=0"
    "-sDISABLE_EXCEPTION_CATCHING=0"
    "-sEXPORTED_FUNCTIONS=${AISENSHOT_WASM_EXPORTED_FUNCTIONS}"
  )

  set_target_properties(${target} PROPERTIES
    OUTPUT_NAME "${AISENSHOT_WASM_MODULE_NAME}"
    RUNTIME_OUTPUT_DIRECTORY "${AISENSHOT_WASM_OUTPUT_DIR}"
    ARCHIVE_OUTPUT_DIRECTORY "${AISENSHOT_WASM_OUTPUT_DIR}"
    LIBRARY_OUTPUT_DIRECTORY "${AISENSHOT_WASM_OUTPUT_DIR}"
  )
endfunction()
