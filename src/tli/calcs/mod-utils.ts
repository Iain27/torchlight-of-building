import * as R from "remeda";
import { match } from "ts-pattern";
import type { Affix, DmgRange, Loadout } from "../core";
import type { ConditionThreshold, Mod, ModT, Stackable } from "../mod";
import { getAllAffixes } from "./affix-collectors";
import { type ModWithValue, multValue } from "./util";

export const findMod = <T extends Mod["type"]>(
  mods: Mod[],
  type: T,
): ModT<T> | undefined => {
  return mods.find((a) => a.type === type) as ModT<T> | undefined;
};

export const modExists = <T extends Mod["type"]>(
  mods: Mod[],
  type: T,
): boolean => {
  return findMod(mods, type) !== undefined;
};

export const filterMods = <T extends Mod["type"]>(
  mods: Mod[],
  type: T,
): ModT<T>[] => {
  return mods.filter((a) => a.type === type) as ModT<T>[];
};

export const sumByValue = (mods: Extract<Mod, { value: number }>[]): number => {
  return R.sumBy(mods, (m) => m.value);
};

export const calculateInc = (bonuses: number[]): number => {
  return R.pipe(bonuses, R.sum()) / 100;
};

export const calculateAddn = (bonuses: number[]): number => {
  return R.pipe(
    bonuses,
    R.reduce((b1, b2) => b1 * (1 + b2 / 100), 1),
  );
};

type ModTypeWithNumericValue = Extract<Mod, { value: number }>["type"];

// Calculates (1 + inc) * addn multiplier
// Overload 1: Filter mods by type first, then calculate
export function calcEffMult<T extends ModTypeWithNumericValue>(
  mods: Mod[],
  modType: T,
): number;
// Overload 2: Calculate directly from array of {value, addn?}
export function calcEffMult<T extends { value: number; addn?: boolean }>(
  mods: T[],
): number;
// Implementation
export function calcEffMult(mods: unknown[], modType?: Mod["type"]): number {
  const filtered =
    modType !== undefined ? filterMods(mods as Mod[], modType) : mods;
  const typed = filtered as { value: number; addn?: boolean }[];
  const incMods = typed.filter((m) => m.addn === undefined || m.addn === false);
  const addnMods = typed.filter((m) => m.addn === true);
  const inc = calculateInc(incMods.map((m) => m.value));
  const addn = calculateAddn(addnMods.map((m) => m.value));
  return (1 + inc) * addn;
}

export const collectModsFromAffixes = (affixes: Affix[]): Mod[] => {
  return affixes.flatMap((a) => a.affixLines.flatMap((l) => l.mods ?? []));
};

export const collectMods = (loadout: Loadout): Mod[] => {
  return collectModsFromAffixes(getAllAffixes(loadout));
};

export const condThresholdSatisfied = (
  actualValue: number,
  condThreshold: ConditionThreshold,
): boolean => {
  const { value: condValue, comparator } = condThreshold;
  return match(comparator)
    .with("lt", () => actualValue < condValue)
    .with("lte", () => actualValue <= condValue)
    .with("eq", () => actualValue === condValue)
    .with("gt", () => actualValue > condValue)
    .with("gte", () => actualValue >= condValue)
    .exhaustive();
};

export const hasValue = (mod: Mod): mod is ModWithValue => "value" in mod;

// Runtime guard for the `resolvedCond` mutual-exclusion invariant enforced in
// the ModBase type. `resolvedCond` mods are pushed directly from
// resolveModsForOffenseSkill and never flow through `filterModsByCond`,
// `normalizeStackables`, or the condThreshold gate. Combining resolvedCond
// with `per` / `cond` / `condThreshold` silently skips those code paths and
// produces wrong numbers. Returns true for valid mods; logs and drops invalid
// ones. Callers may filter via `mods.filter(assertModInvariants)`.
export const assertModInvariants = (mod: Mod): boolean => {
  if (mod.resolvedCond === undefined) return true;
  const bad: string[] = [];
  if (mod.per !== undefined) bad.push("per");
  if (mod.cond !== undefined) bad.push("cond");
  if (mod.condThreshold !== undefined) bad.push("condThreshold");
  if (bad.length === 0) return true;
  console.error(
    `Mod invariant violated: resolvedCond="${mod.resolvedCond}" cannot coexist with [${bad.join(", ")}] (type=${mod.type}, src=${mod.src ?? "?"}); dropping mod`,
  );
  return false;
};

const perModMatchesStackable = (
  mod: Mod,
  stackable: Stackable,
  stacks: number,
): boolean => {
  if (
    !("per" in mod) ||
    mod.per === undefined ||
    mod.per.stackable !== stackable
  ) {
    return false;
  }
  if (mod.condThreshold === undefined) {
    return true;
  }
  if (mod.condThreshold.target === stackable) {
    return condThresholdSatisfied(stacks, mod.condThreshold);
  }
  // condThreshold targets a different stackable than per.stackable.
  // We don't have that stackable's value here, so the threshold
  // cannot be checked. Drop the mod to avoid silently ignoring the threshold.
  console.error(
    `normalizeStackables: mod has per.stackable="${stackable}" but condThreshold.target="${mod.condThreshold.target}"; cannot evaluate threshold, dropping mod (type=${mod.type}, src=${mod.src ?? "?"})`,
  );
  return false;
};

export const normalizeStackables = (
  prenormalizedMods: Mod[],
  stackable: Stackable,
  stacks: number,
): Mod[] => {
  return prenormalizedMods
    .filter((mod) => perModMatchesStackable(mod, stackable, stacks))
    .map((mod) => normalizeStackable(mod, stackable, stacks))
    .filter((mod) => mod !== undefined);
};

export const normalizeStackable = <T extends Mod>(
  mod: T,
  stackable: Stackable,
  stacks: number,
): T | undefined => {
  if (
    !("per" in mod) ||
    mod.per === undefined ||
    mod.per.stackable !== stackable
  ) {
    return undefined;
  }

  if (!hasValue(mod)) {
    return undefined;
  }

  const div = mod.per.amt || 1;
  const stackCount = Math.min(stacks / div, mod.per.limit ?? Infinity);

  let newModValue: number | DmgRange;
  if (mod.per.multiplicative === true && typeof mod.value === "number") {
    newModValue = ((1 + mod.value / 100) ** stackCount - 1) * 100;
  } else {
    newModValue = multValue(mod.value, stackCount);
  }

  if (typeof newModValue === "number" && mod.per.valueLimit !== undefined) {
    return { ...mod, value: Math.min(newModValue, mod.per.valueLimit) } as T;
  } else {
    return { ...mod, value: newModValue } as T;
  }
};

// returns mods that don't need normalization
// excludes mods with `per`
export const filterOutPerMods = (mods: Mod[]): Mod[] => {
  return mods.filter((m) => !("per" in m && m.per !== undefined));
};

// Normalize a single stackable and push to target array
// Skips if value is undefined
export const pushNormalizedStackable = (
  targetMods: Mod[],
  prenormMods: Mod[],
  stackable: Stackable,
  value: number | undefined,
): void => {
  if (value !== undefined) {
    targetMods.push(...normalizeStackables(prenormMods, stackable, value));
  }
};
