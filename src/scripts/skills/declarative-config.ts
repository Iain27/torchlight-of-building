import { type TemplateBuilder, ts } from "@/src/tli/mod-parser";
import {
  findColumn,
  parseNumericValue,
  validateAllLevels,
} from "./progression-table";
import type {
  ParsedLevelValues,
  SkillCategory,
  SupportParserInput,
} from "./types";
import { createConstantLevels, findMatch } from "./utils";

// Declarative templates always extract a single {value:...} capture, but
// `ts(runtimeString)` cannot infer that at the type level. Re-type the
// builder so `findMatch` returns the known capture shape.
const tsValue = (template: string): TemplateBuilder<{ value: number }> =>
  ts(template) as unknown as TemplateBuilder<{ value: number }>;

interface DescriptField {
  fieldName: string;
  template: string;
}

interface ConstantField {
  fieldName: string;
  value: number;
}

interface ConstantFromDescriptField {
  fieldName: string;
  template: string;
}

interface NumericColumnField {
  fieldName: string;
  column: string;
}

export interface DeclarativeParserConfig {
  skillName: string;
  categories: SkillCategory[];
  descriptFields?: DescriptField[];
  numericColumnFields?: NumericColumnField[];
  constants?: ConstantField[];
  preConstants?: ConstantField[];
  constantsFromDescript?: ConstantFromDescriptField[];
  delegateTo?: string;
}

export const DECLARATIVE_PARSERS: DeclarativeParserConfig[] = [
  // === Pattern A: single value from descript ===
  {
    skillName: "Ice Bond",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "coldDmgPctVsFrostbitten",
        template:
          "{value:?dec%} additional cold damage against frostbitten enemies",
      },
    ],
  },
  {
    skillName: "Bull's Rage",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "meleeDmgPct",
        template: "{value:?dec%} additional melee skill damage",
      },
    ],
  },
  {
    skillName: "Entangled Pain",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "dmgPct",
        template:
          "{value:?dec%} additional damage over time taken by cursed enemies",
      },
    ],
  },
  {
    skillName: "Mana Boil",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "spellDmgPct",
        template: "{value:?dec%} additional spell damage while the skill lasts",
      },
    ],
  },
  {
    skillName: "Arcane Circle",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "spellDmgPctPerStack",
        template: "grants {value:?dec%} additional spell damage",
      },
    ],
  },
  {
    skillName: "Biting Cold",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "dmgPct",
        template: "{value:?dec%} additional cold damage taken",
      },
    ],
  },
  {
    skillName: "Timid",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "dmgPct",
        template: "{value:?dec%} additional hit damage taken by cursed enemies",
      },
    ],
  },
  {
    skillName: "Electrocute",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "lightningDmgPct",
        template:
          "{value:?dec%} additional lightning damage taken by cursed enemies",
      },
    ],
  },
  {
    skillName: "Spell Amplification",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "spellDmgPct",
        template: "{value:?dec%} additional spell damage",
      },
    ],
  },
  {
    skillName: "Precise: Spell Amplification",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "spellDmgPct",
        template: "{value:?dec%} additional spell damage",
      },
    ],
  },
  {
    skillName: "Deep Pain",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "dotDmgPct",
        template: "{value:?dec%} additional damage over time",
      },
    ],
  },
  {
    skillName: "Precise: Erosion Amplification",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "erosionDmgPct",
        template: "{value:?dec%} additional erosion damage",
      },
    ],
  },
  {
    skillName: "Erosion Amplification",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "erosionDmgPct",
        template: "{value:?dec%} additional erosion damage",
      },
    ],
  },
  {
    skillName: "Electric Conversion",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "lightningDmgPct",
        template: "{value:?dec%} additional lightning damage",
      },
    ],
  },
  {
    skillName: "Precise: Electric Conversion",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "lightningDmgPct",
        template: "{value:?dec%} additional lightning damage",
      },
    ],
  },
  {
    skillName: "Frigid Domain",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "coldDmgPct",
        template:
          "{value:?dec%} additional cold damage against enemies affected by the skill",
      },
    ],
  },
  {
    skillName: "Precise: Frigid Domain",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "coldDmgPct",
        template:
          "{value:?dec%} additional cold damage against enemies affected by the skill",
      },
    ],
  },
  {
    skillName: "Precise: Swiftness",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "movementSpeedPct",
        template: "{value:?dec%} movement speed",
      },
    ],
  },

  // === Pattern A + constants ===
  {
    skillName: "Precise: Deep Pain",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "dotDmgPct",
        template: "{value:?dec%} additional damage over time",
      },
    ],
    constants: [{ fieldName: "afflictionPerSec", value: 30 }],
  },
  {
    skillName: "Ice Focus",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "coldDmgPct",
        template: "{value:?dec%} additional Cold Damage",
      },
    ],
    constants: [{ fieldName: "inflictFrostbitePct", value: 100 }],
  },
  {
    skillName: "Domain Expansion",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "areaDmgPct",
        template: "{value:?dec%} additional area damage",
      },
    ],
    constants: [{ fieldName: "skillAreaPct", value: 20 }],
  },
  {
    skillName: "Precise: Domain Expansion",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "areaDmgPct",
        template: "{value:?dec%} additional area damage",
      },
    ],
    constants: [
      { fieldName: "skillAreaPct", value: 20 },
      { fieldName: "condAreaDmgPct", value: 4 },
    ],
  },

  // === Pattern A + constantFromDescript ===
  {
    skillName: "Secret Origin Unleash",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "spellDmgPct",
        template: "{value:?dec%} additional spell damage while the skill lasts",
      },
    ],
    constantsFromDescript: [
      {
        fieldName: "cspdPctPerFocusBlessing",
        template: "{value:+int}% cast speed for every stack of focus blessing",
      },
    ],
  },
  {
    skillName: "Summon Thunder Magus",
    categories: ["passive"],
    preConstants: [{ fieldName: "aspdAndCspdPct", value: 6 }],
    descriptFields: [
      {
        fieldName: "dmgPct",
        template:
          "{_:+int}% additional attack and cast speed and {value:?dec%} additional damage to the summoner",
      },
    ],
  },
  {
    skillName: "Summon Fire Magus",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "critRating",
        template:
          "giving the summoner {value:?int} attack and spell critical strike rating",
      },
    ],
  },

  // === Two values from descript ===
  {
    skillName: "Corruption",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "dmgPct",
        template: "{value:?dec%} additional erosion damage taken",
      },
      {
        fieldName: "inflictWiltPct",
        template:
          "{value:?dec%} chance to wilt when you are hit by a cursed enemy",
      },
    ],
  },
  {
    skillName: "Fearless Warcry",
    categories: ["active"],
    descriptFields: [
      {
        fieldName: "slashStrikeSkillDmgPerEnemy",
        template:
          "{value:?dec%} additional damage dealt by slash-strike skills for each enemy",
      },
      {
        fieldName: "slashStrikeSkillAilmentDmgPerEnemy",
        template:
          "{value:?dec%} additional ailment damage dealt by slash-strike skills per enemy",
      },
    ],
  },
  {
    skillName: "Precise: Cruelty",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "attackDmgPct",
        template: "{value:?dec%} additional attack damage",
      },
      {
        fieldName: "auraEffPctPerCrueltyStack",
        template: "{value:?dec%} additional aura effect per stack of the buff",
      },
    ],
  },
  {
    skillName: "Corrosion Focus",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "erosionDmgPct",
        template: "{value:?dec%} additional erosion damage",
      },
      { fieldName: "inflictWiltPct", template: "{value:?dec%} wilt chance" },
    ],
    constants: [{ fieldName: "BaseWiltFlatDmg", value: 2 }],
  },
  {
    skillName: "Precise: Fearless",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "meleeCritRatingPct",
        template: "{value:?dec%} critical strike rating for melee skills",
      },
      {
        fieldName: "meleeDmgPct",
        template: "{value:?dec%} additional melee skill damage",
      },
    ],
    constants: [{ fieldName: "meleeAspdPct", value: 8 }],
  },
  {
    skillName: "Energy Fortress",
    categories: ["passive"],
    descriptFields: [
      { fieldName: "energyShield", template: "{value:?dec} max energy shield" },
      {
        fieldName: "energyShieldPct",
        template: "{value:?dec%} additional max energy shield",
      },
    ],
  },
  {
    skillName: "Steadfast",
    categories: ["passive"],
    descriptFields: [
      { fieldName: "armor", template: "{value:?dec} Armor" },
      { fieldName: "armorPct", template: "{value:?dec%} additional Armor" },
    ],
  },
  {
    skillName: "Nimbleness",
    categories: ["passive"],
    descriptFields: [
      { fieldName: "evasion", template: "{value:?dec} Evasion" },
      { fieldName: "evasionPct", template: "{value:?dec%} additional Evasion" },
    ],
  },
  {
    skillName: "Precise Projectiles",
    categories: ["passive"],
    descriptFields: [
      {
        fieldName: "projectileDmgPct",
        template: "{value:?dec%} additional Projectile Damage",
      },
      {
        fieldName: "ailmentDmgPct",
        template: "{value:?dec%} additional Ailment Damage",
      },
    ],
    constants: [{ fieldName: "projectileSpeedPct", value: 10 }],
  },

  // === Numeric column ===
  {
    skillName: "Thunder Spike",
    categories: ["active"],
    numericColumnFields: [
      { fieldName: "weaponAtkDmgPct", column: "effectiveness of added damage" },
      { fieldName: "addedDmgEffPct", column: "effectiveness of added damage" },
    ],
  },

  // === Delegates ===
  {
    skillName: "Precise: Energy Fortress",
    categories: ["passive"],
    delegateTo: "Energy Fortress",
  },
  {
    skillName: "Precise: Steadfast",
    categories: ["passive"],
    delegateTo: "Steadfast",
  },
  {
    skillName: "Precise: Nimbleness",
    categories: ["passive"],
    delegateTo: "Nimbleness",
  },
  {
    skillName: "Precise: Precise Projectiles",
    categories: ["passive"],
    delegateTo: "Precise Projectiles",
  },
  {
    skillName: "Precise: Ice Focus",
    categories: ["passive"],
    delegateTo: "Ice Focus",
  },
];

export const executeDeclarativeParser = (
  config: DeclarativeParserConfig,
  input: SupportParserInput,
  allConfigs: DeclarativeParserConfig[],
): ParsedLevelValues => {
  if (config.delegateTo !== undefined) {
    const delegateConfig = allConfigs.find(
      (c) => c.skillName === config.delegateTo,
    );
    if (delegateConfig === undefined) {
      throw new Error(
        `${config.skillName}: delegateTo "${config.delegateTo}" not found`,
      );
    }
    return executeDeclarativeParser(delegateConfig, input, allConfigs);
  }

  const { skillName, progressionTable } = input;
  const result: ParsedLevelValues = {};

  // Process preConstants (constants that must appear before descriptFields in output)
  if (config.preConstants !== undefined && config.preConstants.length > 0) {
    for (const field of config.preConstants) {
      result[field.fieldName] = createConstantLevels(field.value);
    }
  }

  // Process descriptFields
  if (config.descriptFields !== undefined && config.descriptFields.length > 0) {
    const descriptCol = findColumn(progressionTable, "descript", skillName);

    for (const field of config.descriptFields) {
      const levels: Record<number, number> = {};

      for (const [levelStr, text] of Object.entries(descriptCol.rows)) {
        const level = Number(levelStr);
        const match = findMatch(text, tsValue(field.template), skillName);
        levels[level] = match.value;
      }

      validateAllLevels(levels, skillName);
      result[field.fieldName] = levels;
    }
  }

  // Process numericColumnFields
  if (
    config.numericColumnFields !== undefined &&
    config.numericColumnFields.length > 0
  ) {
    for (const field of config.numericColumnFields) {
      const col = findColumn(progressionTable, field.column, skillName);
      const levels: Record<number, number> = {};

      for (const [levelStr, text] of Object.entries(col.rows)) {
        const level = Number(levelStr);
        if (level <= 20 && text !== "") {
          levels[level] = parseNumericValue(text);
        }
      }

      const level20Value = levels[20];
      if (level20Value === undefined) {
        throw new Error(
          `${skillName}: level 20 value missing for ${field.fieldName}`,
        );
      }
      for (let level = 21; level <= 40; level++) {
        levels[level] = level20Value;
      }

      validateAllLevels(levels, skillName);
      result[field.fieldName] = levels;
    }
  }

  // Process constantsFromDescript
  if (
    config.constantsFromDescript !== undefined &&
    config.constantsFromDescript.length > 0
  ) {
    const descriptCol = findColumn(progressionTable, "descript", skillName);
    const level1Text = descriptCol.rows[1];
    if (level1Text === undefined) {
      throw new Error(`${skillName}: no descript found for level 1`);
    }

    for (const field of config.constantsFromDescript) {
      const match = findMatch(level1Text, tsValue(field.template), skillName);
      result[field.fieldName] = createConstantLevels(match.value);
    }
  }

  // Process constants
  if (config.constants !== undefined && config.constants.length > 0) {
    for (const field of config.constants) {
      result[field.fieldName] = createConstantLevels(field.value);
    }
  }

  return result;
};
