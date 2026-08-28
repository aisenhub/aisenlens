#pragma once

namespace aisenshot {

enum class ErrorCode {
  None = 0,
  InvalidArgument,
  InvalidConfiguration,
  UnsupportedPixelFormat,
  InvalidPlaneCount,
  InvalidPlane,
  InvalidStride,
  InvalidDimensions,
  InvalidVisibleRect,
  InvalidBitDepth,
  InvalidColorMetadata,
  InvalidDuration,
  TimestampOutOfOrder,
  PresentationIndexOutOfOrder,
  EngineFlushed,
  InvalidCheckpoint,
};

}  // namespace aisenshot
