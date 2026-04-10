// Loud-failure helpers for build-time scrapers/generators.
//
// Upstream tlidb drift (new skills, new heroes, renamed enums) used to surface
// as console.warn messages that were trivial to miss. These helpers turn such
// drift into hard errors so the build stops until a human investigates.

export const assertCount = (
  label: string,
  actual: number,
  expected: number,
): void => {
  if (actual !== expected) {
    throw new Error(
      `[${label}] count mismatch: found ${actual}, expected ${expected}. ` +
        `Upstream tlidb data has drifted — investigate and, if intended, bump the expected count.`,
    );
  }
};

export const assertNonEmpty = <T>(label: string, items: readonly T[]): void => {
  if (items.length === 0) {
    throw new Error(
      `[${label}] no entries extracted — upstream HTML structure likely changed.`,
    );
  }
};

export const assertAtLeast = (
  label: string,
  actual: number,
  minimum: number,
): void => {
  if (actual < minimum) {
    throw new Error(
      `[${label}] count too low: found ${actual}, expected at least ${minimum}.`,
    );
  }
};

export const failBuild = (message: string): never => {
  throw new Error(message);
};
