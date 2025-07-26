+++
title = "Fast Fixed Float Formatting"
date = 2024-12-28
+++

I recently was dumping out data from a physics simulator to a file for
plotting/analysis and was annoyed by how long it was taking to write the output
file. The file's output specification is fairly simple, each state was just a
collection of several doubles printed with formatting similar to printf's `%f`
format string. Each field has both a width and a precision, and was separated
by a single space.

| Field     | Width | Precision |
| --------- | ----- | --------- |
| Pos X/Y/Z | 14    | 6         |
| Vel X/Y/Z | 14    | 6         |
| Acc X/Y/Z | 14    | 6         |
| Quat      | 16    | 9         |
| Quat Rate | 16    | 9         |

However, there is one important difference from `%f` in that this file
specification states that numbers too large to fit in the given width are
clamped to the closest number in the range this means that a writing 1000.123 to
a field specified as `6.2F` should be written as `999.99`, not as `1000.12`.

Historically, formatting has been done with printf, looking something like this
(assuming normalization to data ranges has already occurred):

```cpp
std::string format_state_printf(const State &state)
{
    char data[14 * 3 * 3 + 16 * 2 * 4 + 18];
    snprintf(data,
             sizeof(data),
             "%14.6f %14.6f %14.6f "
             "%14.6f %14.6f %14.6f "
             "%14.6f %14.6f %14.6f "
             "%16.9f %16.9f %16.9f %16.9f "
             "%16.9f %16.9f %16.9f %16.9f\n",
             state.pos.x, state.pos.y, state.pos.z,
             state.vel.x, state.vel.y, state.vel.z,
             state.acc.x, state.acc.y, state.acc.z,
             state.quat.q1, state.quat.q2, state.quat.q3, state.quat.q4,
             state.quat_rate.q1, state.quat_rate.q2, state.quat_rate.q3, state.quat_rate.q4);

    return std::string(data, sizeof(data));
}
```

It is trivial to convert this over to using [libfmt](https://fmt.dev/latest/)
for a decent performance improvement:

```cpp
std::string format_state_fmt(const State &state)
{
    return fmt::format(
        "{:14.6f} {:14.6f} {:14.6f} "
        "{:14.6f} {:14.6f} {:14.6f} "
        "{:14.6f} {:14.6f} {:14.6f} "
        "{:16.9f} {:16.9f} {:16.9f} {:16.9f} "
        "{:16.9f} {:16.9f} {:16.9f} {:16.9f}\n",
        state.pos.x, state.pos.y, state.pos.z,
        state.vel.x, state.vel.y, state.vel.z,
        state.acc.x, state.acc.y, state.acc.z,
        state.quat.q1, state.quat.q2, state.quat.q3, state.quat.q4,
        state.quat_rate.q1, state.quat_rate.q2, state.quat_rate.q3, state.quat_rate.q4);
}
```

`fmt::format` can also be given a [string with
`FMT_COMPILE`](https://fmt.dev/latest/api/#compile-api) to generate efficient
formatting code at compile time, which is even faster!

| Benchmark                        | Time    | CPU     | Iterations |
| -------------------------------- | ------- | ------- | ---------- |
| `printf`                         | 2258 ns | 2253 ns | 304277     |
| `std::format`                    | 2094 ns | 2090 ns | 330882     |
| `fmt::format`                    | 1564 ns | 1561 ns | 437419     |
| `fmt::format` with `FMT_COMPILE` | 1230 ns | 1227 ns | 558531     |

I could have left it here, successfully cutting out 50% of the runtime, but was
still curious... could we do even better? None of the solutions so far have
taken into consideration that we know the range of values in `State` have been
clamped to be within a known range, and these solutions are also general purpose
formatting libraries. What if we knew we were only ever going to write a fixed
precision string which was known to fit in the width specified?

After experimenting with a few versions of a formatting function, I eventually
ended up with the following implementation. Notable design considerations:

1. The function is templatized on the width and precision fields rather than
   containing parameters. I experimented with parameters, but found that using
   parameters resulted in code that was no better than `FMT_COMPILE`, while
   being a whole lot uglier to read!
2. Inlining `digit` doesn't make it any faster on my machine, in fact it made it
   somewhat slower!
3. In order to avoid overflow resulting in likely invalid characters being
   written to the output string, this function will clamp values to the
   permitted formatting range.

```cpp
#ifndef FORMAT_FIXED_H
#define FORMAT_FIXED_H

#include <cmath>
#include <bit>
namespace detail {
    size_t constexpr pow(size_t base, size_t exponent)
    {
        return exponent == 0 ? 1 : base * pow(base, exponent - 1);
    }
} // namespace detail

template <size_t WIDTH, size_t PRECISION>
void format_fixed(char* data, double value)
{
    static_assert(WIDTH > PRECISION + 1);
    // -1 for decimal point
    constexpr auto INTEGER_WIDTH = WIDTH - PRECISION - 1;

    // Handling wider numbers requires a larger integer type than
    // 64 bit used in this implementation.
    static_assert(2 <= INTEGER_WIDTH && INTEGER_WIDTH <= 9);
    static_assert(2 <= PRECISION && PRECISION <= 9);

    constexpr auto PRECISION10 = detail::pow(10, PRECISION);
    constexpr auto MAX_VALUE = (detail::pow(10, WIDTH - 1) - 1.0) / PRECISION10;
    constexpr auto MIN_VALUE = -(detail::pow(10, WIDTH - 2) - 1.0) / PRECISION10;

    // We do this instead of comparing against zero to catch -nan and -0.0
    const bool negative = std::bit_cast<uint64_t>(value) >> 63;

    if (std::isnan(value)) {
        for (size_t i = 0; i < WIDTH - 3; ++i) {
            *data = ' ';
            ++data;
        }
        if (negative) {
            *(data - 1) = '-';
        }

        *data = 'n';
        ++data;
        *data = 'a';
        ++data;
        *data = 'n';
        ++data;
        return;
    }

    // Clamp value to valid range for formatting
    value = std::min(std::max(MIN_VALUE, value), MAX_VALUE);

    char fill = ' ';

    // Now turn the double into a fixed point representation, the
    // static_asserts earlier ensure this will fit.
    auto number = static_cast<uint_fast64_t>(std::abs(value)) * PRECISION10;
    {
        double fractionalPart = std::abs(value) - std::floor(std::abs(value));
        fractionalPart *= PRECISION10;
        uint_fast64_t fractionalFixed = static_cast<uint_fast64_t>(fractionalPart);
        if (fractionalPart - std::floor(fractionalPart) >= 0.5) {
            fractionalFixed += 1;
        }
        number += fractionalFixed;
    }

    auto digit = [&](uint_fast64_t offset) {
        if (number > offset - 1) {
            if (fill == ' ' && negative) {
                *(data - 1) = '-';
            }
            fill = '0';

            // You might think this looks rather odd, shouldn't we be using
            // result = div(number, offset)
            // which gives us both a quotient (to be written)
            // and a remainder (the next value of number)
            // However, in experimentation this has shown to be nearly 50% slower!
            auto dat = number / offset;
            number -= dat * offset;
            *data = static_cast<char>('0' + dat);
            ++data;
        } else {
            *data = fill;
            ++data;
        }
    };

    // First, the integer part.
    if constexpr (INTEGER_WIDTH > 8) digit(100'000'000 * PRECISION10); // 9
    if constexpr (INTEGER_WIDTH > 7) digit(10'000'000 * PRECISION10); // 8
    if constexpr (INTEGER_WIDTH > 6) digit(1'000'000 * PRECISION10); // 7
    if constexpr (INTEGER_WIDTH > 5) digit(100'000 * PRECISION10); // 6
    if constexpr (INTEGER_WIDTH > 4) digit(10'000 * PRECISION10); // 5
    if constexpr (INTEGER_WIDTH > 3) digit(1'000 * PRECISION10); // 4
    if constexpr (INTEGER_WIDTH > 2) digit(100 * PRECISION10); // 3
    digit(10 * PRECISION10); // 2

    // If we haven't written the negative sign yet, do so now as we'll always
    // write at least one digit
    if (fill == ' ' && negative) {
        *(data - 1) = '-';
    }

    // Unconditionally write at least one digit before the decimal point
    {
        auto dat = number / PRECISION10;
        number -= dat * PRECISION10;
        *data = static_cast<char>('0' + dat);
        ++data;
    }

    // Decimal point
    *data = '.';
    ++data;

    // Write the fractional part
    fill = '0';

    if constexpr (PRECISION > 8) digit(100'000'000); // 9
    if constexpr (PRECISION > 7) digit(10'000'000); // 8
    if constexpr (PRECISION > 6) digit(1'000'000); // 7
    if constexpr (PRECISION > 5) digit(100'000); // 6
    if constexpr (PRECISION > 4) digit(10'000); // 5
    if constexpr (PRECISION > 3) digit(1'000); // 4
    if constexpr (PRECISION > 2) digit(100); // 3
    digit(10); // 2
    *data = static_cast<char>('0' + number); // 1
}

#endif
```

The `format_state_fixed` function to actually print the state is a bit uglier than the other ones when using this:

```cpp
std::string format_state_fixed(const State &state)
{
    std::string result(14 * 3 * 3 + 16 * 2 * 4 + 17, ' ');
    auto data = result.data();

    format_fixed<14, 6>(data, state.pos.x);
    format_fixed<14, 6>(data + 15, state.pos.y);
    format_fixed<14, 6>(data + 30, state.pos.z);

    format_fixed<14, 6>(data + 45, state.vel.x);
    format_fixed<14, 6>(data + 60, state.vel.y);
    format_fixed<14, 6>(data + 75, state.vel.z);

    format_fixed<14, 6>(data + 90, state.acc.x);
    format_fixed<14, 6>(data + 105, state.acc.y);
    format_fixed<14, 6>(data + 120, state.acc.z);

    format_fixed<16, 9>(data + 135, state.quat.q1);
    format_fixed<16, 9>(data + 152, state.quat.q2);
    format_fixed<16, 9>(data + 169, state.quat.q3);
    format_fixed<16, 9>(data + 186, state.quat.q4);

    format_fixed<16, 9>(data + 203, state.quat_rate.q1);
    format_fixed<16, 9>(data + 220, state.quat_rate.q2);
    format_fixed<16, 9>(data + 237, state.quat_rate.q3);
    format_fixed<16, 9>(data + 254, state.quat_rate.q4);

    data[270] = '\n';

    return result;
}
```

However, when this is the primary bottleneck for an output, it seems to be worth
it! Adding the results to the table presented earlier shows a 10x performance
improvement. At this point I suspect not much more improvement is possible. I'd
love to be proven wrong if someone has a better implementation.

| Benchmark                        | Time    | CPU     | Iterations |
| -------------------------------- | ------- | ------- | ---------- |
| `printf`                         | 2258 ns | 2253 ns | 304277     |
| `std::format`                    | 2094 ns | 2090 ns | 330882     |
| `fmt::format`                    | 1564 ns | 1561 ns | 437419     |
| `fmt::format` with `FMT_COMPILE` | 1230 ns | 1227 ns | 558531     |
| `format_fixed`                   | 170 ns  | 169 ns  | 4040267    |
| Hardcoded state string           | 24.1 ns | 24.0 ns | 28911035   |

---

All benchmarks were captured with code resembling the following:

```cpp
#include <benchmark/benchmark.h>

static void FormatStateFixed(benchmark::State &state)
{
    State s = {
        .pos = {.x = 1.0, .y = 2.0, .z = 3.0},
        .vel = {.x = 1.0, .y = 2.0, .z = 3.0},
        .acc = {.x = 1.0, .y = 2.0, .z = 3.0},
        .quat = {.q1 = 0.123, .q2 = 0.456, .q3 = 0.789, .q4 = .134},
        .quat_rate = {.q1 = 0.423, .q2 = 0.459, .q3 = 0.989, .q4 = .034},
    };

    for (auto _ : state)
    {
        auto str = format_state_fixed(s);
        benchmark::DoNotOptimize(str);
    }
}
BENCHMARK(FormatStateFixed);

BENCHMARK_MAIN();
```

The numbers presented here were run with:

```
Run on (12 X 4075.68 MHz CPU s)
CPU Caches:
  L1 Data 32 KiB (x6)
  L1 Instruction 32 KiB (x6)
  L2 Unified 256 KiB (x6)
  L3 Unified 12288 KiB (x1)
Load Average: 1.96, 1.34, 1.13
```
