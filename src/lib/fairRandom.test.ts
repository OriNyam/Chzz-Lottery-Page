import { describe, expect, it } from "vitest";
import { secureRandomInt, secureShuffle } from "./fairRandom";

describe("secureRandomInt", () => {
  it("rejects values outside the unbiased range before applying modulo", () => {
    const sequence = [0xffff_ffff, 7];
    let calls = 0;

    const result = secureRandomInt(10, (values) => {
      values[0] = sequence[calls];
      calls += 1;
      return values;
    });

    expect(calls).toBe(2);
    expect(result).toBe(7);
  });

  it("rejects invalid ranges", () => {
    expect(() => secureRandomInt(0)).toThrow(RangeError);
    expect(() => secureRandomInt(1.5)).toThrow(RangeError);
  });
});

describe("secureShuffle", () => {
  it("uses Fisher-Yates swaps on a copy without changing the source", () => {
    const source = ["a", "b", "c", "d"];
    const picks = [1, 0, 0];

    const shuffled = secureShuffle(source, () => picks.shift() ?? 0);

    expect(shuffled).toEqual(["d", "c", "a", "b"]);
    expect(source).toEqual(["a", "b", "c", "d"]);
  });
});
