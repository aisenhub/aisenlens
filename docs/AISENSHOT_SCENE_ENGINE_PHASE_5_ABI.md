# AisenShot Phase 5 C ABI 交接记录

日期：2026-08-27  
状态：C ABI 基础、句柄、帧布局、批量事件读取、checkpoint 接口及 Emscripten baseline/SIMD 绑定已完成；跨编译器差异仍由工具链矩阵持续监控。

## 稳定边界

- `scene_engine_abi.h` 只包含 `<stdint.h>`、固定宽度字段、显式 `ASEN_ABI_VERSION` 和 opaque `asen_engine_t*`。
- 输入帧由调用方拥有，`asen_process_frame` 只在调用期间读取；事件写入调用方结构。
- `asen_read_events` 支持 offset/capacity 查询，输出不会暴露内部 vector 指针。
- checkpoint 支持先查询 required 长度，再写入调用方缓冲；导入校验失败不会改变句柄。
- C++ 异常不会穿过 ABI，错误统一映射为 `asen_status`。

## 验证

- 纯 C header smoke 编译通过。
- C++ ABI offset/size static assertions 通过。
- C ABI Content 与 C++ 引擎事件字段 parity 通过。
- native Debug Phase 5 CTest 通过。
- `asen_reserve_frame` 已提供 I420/NV12/RGBX/RGBA 的稳定 plane stride/size layout 查询。

MSVC 或第二套 ABI 兼容编译器当前未安装，尺寸兼容性仍需在可用环境补测。
