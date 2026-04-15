import { ALL_GEAR_AFFIXES } from "@/src/tli/all-affixes";
import type {
  BaseGearAffix,
  EquipmentType,
} from "@/src/tli/gear-data-types";

// Precompute regex for each affix template so reverse lookup is fast.
// Template "+(47-59)% Gear Physical Damage" becomes /^\+\d+(?:\.\d+)?% Gear Physical Damage$/.
interface CompiledTemplate {
  regex: RegExp;
  affix: BaseGearAffix;
}

const escapeRegex = (s: string): string =>
  s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const compile = (affix: BaseGearAffix): CompiledTemplate | undefined => {
  const template = affix.craftableAffix;
  let pattern = "";
  let lastIndex = 0;
  const rangeRe = /\((-?\d+(?:\.\d+)?)[-–](-?\d+(?:\.\d+)?)\)/g;
  let m = rangeRe.exec(template);
  while (m !== null) {
    pattern += escapeRegex(template.slice(lastIndex, m.index));
    pattern += "-?\\d+(?:\\.\\d+)?";
    lastIndex = m.index + m[0].length;
    m = rangeRe.exec(template);
  }
  pattern += escapeRegex(template.slice(lastIndex));
  try {
    return { regex: new RegExp(`^${pattern}$`, "i"), affix };
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

export const lookupAffixTier = (
  text: string,
  equipmentType: EquipmentType,
): string | undefined => {
  const trimmed = text.trim();
  if (trimmed === "") return undefined;
  const candidates = indexByType.get(equipmentType);
  if (candidates === undefined) return undefined;
  for (const { regex, affix } of candidates) {
    if (regex.test(trimmed)) return affix.tier;
  }
  return undefined;
};
