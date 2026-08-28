#pragma once

#include <iostream>

namespace aisenshot_test {

inline int failures = 0;

inline void expect(bool condition, const char* expression, const char* file, int line) {
  if (condition) return;
  ++failures;
  std::cerr << file << ":" << line << " EXPECT failed: " << expression << '\n';
}

}  // namespace aisenshot_test

#define EXPECT_TRUE(value) ::aisenshot_test::expect((value), #value, __FILE__, __LINE__)
#define EXPECT_FALSE(value) ::aisenshot_test::expect(!(value), "!" #value, __FILE__, __LINE__)
#define EXPECT_EQ(left, right) ::aisenshot_test::expect((left) == (right), #left " == " #right, __FILE__, __LINE__)
