import { ALL_GEAR_AFFIXES } from "@/src/tli/all-affixes";
import type {
  BaseGearAffix,
  EquipmentType,
} from "@/src/tli/gear-data-types";

/**
 * Reverse-lookup for gear affix tiers.
 *
 * Each template (e.g. "+(341-442) gear Energy Shield") becomes:
 *   - a regex that captures each number in the rolled text
 *   - the template's range bounds
 *
 * Match is two-stage:
 *   1. pattern matches (structure/wording matches)
 *   2. each captured number falls within the corresponding range
 *
 * If no template matches all ranges, fall back to the template whose ranges
 * are *closest* to the rolled values — handles out-of-tier rolls from
 * crafting edge cases.
 */
interface CompiledTemplate {
  regex: RegExp;
  // One [min, max] per range in the template, in order.
  ranges: Array<[number, number]>;
  affix: BaseGearAffix;
}

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compile = (affix: BaseGearAffix): CompiledTemplate | undefined => {
  const template = affix.craftableAffix;
  let pattern = "";
  let lastIndex = 0;
  const ranges: Array<[number, number]> = [];
  const rangeRe = /\((-?\d+(?:\.\d+)?)[-–](-?\d+(?:\.\d+)?)\)/g;
  let m = rangeRe.exec(template);
  while (m !== null) {
    pattern += escapeRegex(template.slice(lastIndex, m.index));
    pattern += "(-?\\d+(?:\\.\\d+)?)";
    ranges.push([parseFloat(m[1]), parseFloat(m[2])]);
    lastIndex = m.index + m[0].length;
    m = rangeRe.exec(template);
  }
  pattern += escapeRegex(template.slice(lastIndex));
  try {
    return {
      regex: new RegExp(`^${pattern}$`, "i"),
      ranges,
      affix,
    };
  } catch {
    return undefined;
  }
};

const indexByType = new Map<EquipmentType, CompiledTemplate[]>();
for (const affix of ALL_GEAR_AFFIXES) {
  const compiled = compile(affix);
  if (compiled === undefined) continue;
  const list = indexByType.get(affix.equipmentType) ?? [];
  list.push(compiled);
  indexByType.set(affix.equipmentType, list);
}

// For templates with no ranges (fixed text), distance is 0 on match, Infinity otherwise.
// For templates with ranges, distance = sum of squared per-range distances outside the range.
const computeDistance = (
  values: number[],
  ranges: Array<[number, number]>,
): number => {
  if (values.length !== ranges.length) return Infinity;
  let total = 0;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    const [lo, hi] = ranges[i];
    if (v >= lo && v <= hi) continue;
    const d = v < lo ? lo - v : v - hi;
    total += d * d;
  }
  return total;
};

export const lookupAffixTier = (
  text: string,
  equipmentType: EquipmentType,
): string | undefined => {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const candidates = indexByType.get(equipmentType);
  if (candidates === undefined) return undefined;

  let best: { affix: BaseGearAffix; distance: number } | undefined;
  for (const { regex, ranges, affix } of candidates) {
    const m = regex.exec(trimmed);
    if (m === null) continue;
    const values = m.slice(1).map((s) => parseFloat(s));
    const distance = computeDistance(values, ranges);
    if (distance === 0) return affix.tier;
    if (best === undefined || distance < best.distance) {
      best = { affix, distance };
    }
  }
  return best?.affix.tier;
};
