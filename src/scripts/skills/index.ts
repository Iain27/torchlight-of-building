import {
  berserkingBladeParser,
  chainLightningParser,
  chargingWarcryParser,
  frostSpikeParser,
  iceLancesParser,
  lightningShotParser,
  mindControlParser,
  shacklesOfMaliceParser,
  simpleSpellParser,
  simpleWeaponAttackParser,
  slashStrikeParser,
  spectralSlashParser,
  spellDescOnlyParser,
} from "./active-parsers";
import {
  DECLARATIVE_PARSERS,
  executeDeclarativeParser,
} from "./declarative-config";
import type { SkillCategory, SkillParserEntry } from "./types";

// Note: Support skill parsers have been removed. Support skills now use
// generic text-based parsing via fixedAffixes and templates in generated data.

export const SKILL_PARSERS: SkillParserEntry[] = [
  ...DECLARATIVE_PARSERS.map((config) => ({
    skillName: config.skillName,
    categories: config.categories,
    parser: (input: Parameters<SkillParserEntry["parser"]>[0]) =>
      executeDeclarativeParser(config, input, DECLARATIVE_PARSERS),
  })),
  {
    skillName: "Frost Spike",
    categories: ["active"],
    parser: frostSpikeParser,
  },
  {
    skillName: "Charging Warcry",
    categories: ["active"],
    parser: chargingWarcryParser,
  },
  {
    skillName: "Mind Control",
    categories: ["active"],
    parser: mindControlParser,
  },
  {
    skillName: "Chain Lightning",
    categories: ["active"],
    parser: chainLightningParser,
  },
  { skillName: "Ice Lances", categories: ["active"], parser: iceLancesParser },
  {
    skillName: "Spectral Slash",
    categories: ["active"],
    parser: spectralSlashParser,
  },
  {
    skillName: "Berserking Blade",
    categories: ["active"],
    parser: berserkingBladeParser,
  },
  {
    skillName: "Lightning Shot",
    categories: ["active"],
    parser: lightningShotParser,
  },
  {
    skillName: "Shackles of Malice",
    categories: ["active"],
    parser: shacklesOfMaliceParser,
  },
  {
    skillName: "Leap Attack",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Rocket Jump",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Swift Shadow Raid",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Blink Arrow",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Burning Shot",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Electrifying Shot",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Rain of Arrows",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Charged Pummel",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Focused Shot",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Blazing Bullet",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Split Shot",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Savage Charge",
    categories: ["active"],
    parser: simpleWeaponAttackParser,
  },
  {
    skillName: "Flame Slash",
    categories: ["active"],
    parser: slashStrikeParser,
  },
  {
    skillName: "Thunder Slash",
    categories: ["active"],
    parser: slashStrikeParser,
  },
  { skillName: "Icy Blade", categories: ["active"], parser: slashStrikeParser },
  { skillName: "Whirlwind", categories: ["active"], parser: slashStrikeParser },
  {
    skillName: "Lightning Beam",
    categories: ["active"],
    parser: simpleSpellParser,
  },
  {
    skillName: "Fire Burst",
    categories: ["active"],
    parser: spellDescOnlyParser,
  },
];

export const getParserForSkill = (
  skillName: string,
  category: SkillCategory,
): SkillParserEntry | undefined => {
  return SKILL_PARSERS.find(
    (entry) =>
      entry.skillName === skillName && entry.categories.includes(category),
  );
};
