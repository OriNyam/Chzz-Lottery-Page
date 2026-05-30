const UINT32_RANGE = 0x1_0000_0000;

type FillRandomValues = (values: Uint32Array) => Uint32Array;

function defaultFillRandomValues(values: Uint32Array): Uint32Array {
  return crypto.getRandomValues(values);
}

/**
 * Returns an unbiased integer in [0, maxExclusive).
 * Rejection sampling removes modulo bias before the remainder is calculated.
 */
export function secureRandomInt(
  maxExclusive: number,
  fillRandomValues: FillRandomValues = defaultFillRandomValues
): number {
  if (
    !Number.isSafeInteger(maxExclusive) ||
    maxExclusive <= 0 ||
    maxExclusive > UINT32_RANGE
  ) {
    throw new RangeError("maxExclusive must be an integer between 1 and 2^32");
  }

  const limit = Math.floor(UINT32_RANGE / maxExclusive) * maxExclusive;
  const values = new Uint32Array(1);

  do {
    fillRandomValues(values);
  } while (values[0] >= limit);

  return values[0] % maxExclusive;
}

/**
 * Produces a uniformly shuffled copy using Fisher-Yates and a CSPRNG.
 */
export function secureShuffle<T>(
  items: readonly T[],
  randomInt: (maxExclusive: number) => number = secureRandomInt
): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}
