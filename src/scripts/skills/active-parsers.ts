import { t, ts } from "@/src/tli/mod-parser";
import {
  findColumn,
  parseNumericValue,
  validateAllLevels,
} from "./progression-table";
import type { SupportLevelParser } from "./types";
import { createConstantLevels, findMatch } from "./utils";

export const iceBondParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const descriptCol = findColumn(progressionTable, "descript", skillName);
  const coldDmgPctVsFrostbitten: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(descriptCol.rows)) {
    const level = Number(levelStr);
    const match = findMatch(
      text,
      ts("{value:?dec%} additional cold damage against frostbitten enemies"),
      skillName,
    );
    coldDmgPctVsFrostbitten[level] = match.value;
  }

  validateAllLevels(coldDmgPctVsFrostbitten, skillName);

  return { coldDmgPctVsFrostbitten };
};

export const bullsRageParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const descriptCol = findColumn(progressionTable, "descript", skillName);
  const meleeDmgPct: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(descriptCol.rows)) {
    const level = Number(levelStr);
    const match = findMatch(
      text,
      ts("{value:?dec%} additional melee skill damage"),
      skillName,
    );
    meleeDmgPct[level] = match.value;
  }

  validateAllLevels(meleeDmgPct, skillName);

  return { meleeDmgPct };
};

export const frostSpikeParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const addedDmgEffCol = findColumn(
    progressionTable,
    "effectiveness of added damage",
    skillName,
  );
  const damageCol = findColumn(progressionTable, "damage", skillName);
  const descriptCol = findColumn(progressionTable, "descript", skillName);

  const weaponAtkDmgPct: Record<number, number> = {};
  const addedDmgEffPct: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20) {
      addedDmgEffPct[level] = parseNumericValue(text);
    }
  }

  for (const [levelStr, text] of Object.entries(damageCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20) {
      const dmgMatch = findMatch(
        text,
        ts("deals {value:dec%} weapon attack damage"),
        skillName,
      );
      weaponAtkDmgPct[level] = dmgMatch.value;
    }
  }

  const level20WeaponDmg = weaponAtkDmgPct[20];
  const level20AddedDmgEff = addedDmgEffPct[20];

  if (level20WeaponDmg === undefined || level20AddedDmgEff === undefined) {
    throw new Error(
      `${skillName}: level 20 values missing, cannot fallback for levels 21-40`,
    );
  }

  for (let level = 21; level <= 40; level++) {
    if (weaponAtkDmgPct[level] === undefined) {
      weaponAtkDmgPct[level] = level20WeaponDmg;
    }
    if (addedDmgEffPct[level] === undefined) {
      addedDmgEffPct[level] = level20AddedDmgEff;
    }
  }

  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const convertPhysicalToColdPct = findMatch(
    descript,
    ts("converts {value:int%} of the skill's physical damage to cold damage"),
    skillName,
  ).value;

  const maxProjectile = findMatch(
    descript,
    ts(
      "max amount of projectiles that can be fired by this skill is {value:int}",
    ),
    skillName,
  ).value;

  const projectilePerFrostbiteRating = findMatch(
    descript,
    ts("{value:+int} projectile quantity for every {_:int} frostbite rating"),
    skillName,
  ).value;

  const baseProjectile = findMatch(
    descript,
    ts("fires {value:int} projectiles in its base state"),
    skillName,
  ).value;

  const dmgPctPerProjectile = findMatch(
    descript,
    ts(
      "{value:+int%} additional damage for every {_:+int} projectile quantity",
    ),
    skillName,
  ).value;

  validateAllLevels(weaponAtkDmgPct, skillName);
  validateAllLevels(addedDmgEffPct, skillName);

  return {
    weaponAtkDmgPct,
    addedDmgEffPct,
    convertPhysicalToColdPct: createConstantLevels(convertPhysicalToColdPct),
    maxProjectile: createConstantLevels(maxProjectile),
    projectilePerFrostbiteRating: createConstantLevels(
      projectilePerFrostbiteRating,
    ),
    baseProjectile: createConstantLevels(baseProjectile),
    dmgPctPerProjectile: createConstantLevels(dmgPctPerProjectile),
  };
};

export const chargingWarcryParser: SupportLevelParser = (input) => {
  const { skillName, description } = input;
  const firstDescription = description[0] ?? "";

  const dmgMatch = findMatch(
    firstDescription,
    ts(
      "shadow strike skills gain {dmg:int%} additional damage and Ailment Damage for every enemy",
    ),
    skillName,
  );

  return { shadowStrikeSkillDmgPerEnemy: createConstantLevels(dmgMatch.dmg) };
};

export const mindControlParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const addedDmgEffCol = findColumn(
    progressionTable,
    "effectiveness of added damage",
    skillName,
  );
  const damageCol = progressionTable.find(
    (col) => col.header.toLowerCase() === "damage",
  );
  if (damageCol === undefined) {
    throw new Error(`${skillName}: no "damage" column found`);
  }
  const descriptCol = findColumn(progressionTable, "descript", skillName);

  const addedDmgEffPct: Record<number, number> = {};
  const persistentDamage: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const match = t("{value:dec%}").match(text, skillName);
      addedDmgEffPct[level] = match.value;
    }
  }

  for (const [levelStr, text] of Object.entries(damageCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const match = findMatch(
        text,
        ts("deals {value:int} per second erosion damage over time"),
        skillName,
      );
      persistentDamage[level] = match.value;
    }
  }

  const level20AddedDmgEff = addedDmgEffPct[20];
  const level20PersistentDmg = persistentDamage[20];
  if (level20AddedDmgEff === undefined || level20PersistentDmg === undefined) {
    throw new Error(`${skillName}: level 20 values missing`);
  }
  for (let level = 21; level <= 40; level++) {
    addedDmgEffPct[level] = level20AddedDmgEff;
    persistentDamage[level] = level20PersistentDmg;
  }

  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const initialMaxChannel = findMatch(
    descript,
    ts("channels up to {value:int} stacks"),
    skillName,
  ).value;

  const additionalDmgPctPerMaxChannel = findMatch(
    descript,
    ts(
      "{value:dec} % additional damage for every {_:+int} additional max channeled stack",
    ),
    skillName,
  ).value;

  const initialMaxLinks = findMatch(
    descript,
    ts("initially has {value:int} maximum links"),
    skillName,
  ).value;

  const maxLinkPerChannel = findMatch(
    descript,
    ts("{value:+int} maximum link for every channeled stack"),
    skillName,
  ).value;

  const movementSpeedPctWhileChanneling = findMatch(
    descript,
    ts("{value:+int%} movement speed while channeling"),
    skillName,
  ).value;

  const restoreLifePctValue = findMatch(
    descript,
    ts("{value:dec%} max life per second per link"),
    skillName,
  ).value;

  validateAllLevels(addedDmgEffPct, skillName);
  validateAllLevels(persistentDamage, skillName);

  return {
    addedDmgEffPct,
    persistentDamage,
    initialMaxChannel: createConstantLevels(initialMaxChannel),
    additionalDmgPctPerMaxChannel: createConstantLevels(
      additionalDmgPctPerMaxChannel,
    ),
    initialMaxLinks: createConstantLevels(initialMaxLinks),
    maxLinkPerChannel: createConstantLevels(maxLinkPerChannel),
    movementSpeedPctWhileChanneling: createConstantLevels(
      movementSpeedPctWhileChanneling,
    ),
    restoreLifePctValue: createConstantLevels(restoreLifePctValue),
  };
};

export const entangledPainParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const dmgPct = levelsFromArray(STANDARD_CURSE_DMG_CURVE);
  validateAllLevels(dmgPct, skillName);
  return { dmgPct };
};

export const corruptionParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const dmgPct = levelsFromArray(STANDARD_CURSE_DMG_CURVE);
  const inflictWiltPct = createConstantLevels(10);
  validateAllLevels(dmgPct, skillName);
  validateAllLevels(inflictWiltPct, skillName);
  return { dmgPct, inflictWiltPct };
};

// Mana Boil: +0.35 additional spell damage per level, from 10% (L1) to 23.65% (L40).
const MANA_BOIL_SPELL_DMG_PCT = [
  10, 10.35, 10.7, 11.05, 11.4, 11.75, 12.1, 12.45, 12.8, 13.15, 13.5, 13.85,
  14.2, 14.55, 14.9, 15.25, 15.6, 15.95, 16.3, 16.65, 17, 17.35, 17.7, 18.05,
  18.4, 18.75, 19.1, 19.45, 19.8, 20.15, 20.5, 20.85, 21.2, 21.55, 21.9, 22.25,
  22.6, 22.95, 23.3, 23.65,
];

export const manaBoilParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const spellDmgPct = levelsFromArray(MANA_BOIL_SPELL_DMG_PCT);
  validateAllLevels(spellDmgPct, skillName);
  return { spellDmgPct };
};

export const arcaneCircleParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const descriptCol = findColumn(progressionTable, "descript", skillName);
  const spellDmgPctPerStack: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(descriptCol.rows)) {
    const level = Number(levelStr);
    const match = findMatch(
      text,
      ts("grants {value:?dec%} additional spell damage"),
      skillName,
    );
    spellDmgPctPerStack[level] = match.value;
  }

  validateAllLevels(spellDmgPctPerStack, skillName);

  return { spellDmgPctPerStack };
};

export const chainLightningParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const addedDmgEffCol = findColumn(
    progressionTable,
    "effectiveness of added damage",
    skillName,
  );
  const damageCol = progressionTable.find(
    (col) => col.header.toLowerCase() === "damage",
  );
  if (damageCol === undefined) {
    throw new Error(`${skillName}: no "damage" column found`);
  }
  const descriptCol = findColumn(progressionTable, "descript", skillName);

  const addedDmgEffPct: Record<number, number> = {};
  const spellDmgMin: Record<number, number> = {};
  const spellDmgMax: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      addedDmgEffPct[level] = parseNumericValue(text);
    }
  }

  for (const [levelStr, text] of Object.entries(damageCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const match = findMatch(
        text,
        ts("deals {min:int}-{max:int} spell lightning damage"),
        skillName,
      );
      spellDmgMin[level] = match.min;
      spellDmgMax[level] = match.max;
    }
  }

  const level20AddedDmgEff = addedDmgEffPct[20];
  const level20SpellDmgMin = spellDmgMin[20];
  const level20SpellDmgMax = spellDmgMax[20];
  if (
    level20AddedDmgEff === undefined ||
    level20SpellDmgMin === undefined ||
    level20SpellDmgMax === undefined
  ) {
    throw new Error(`${skillName}: level 20 values missing`);
  }
  for (let level = 21; level <= 40; level++) {
    addedDmgEffPct[level] = level20AddedDmgEff;
    spellDmgMin[level] = level20SpellDmgMin;
    spellDmgMax[level] = level20SpellDmgMax;
  }

  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const jump = findMatch(
    descript,
    ts("{value:+int} jumps for this skill"),
    skillName,
  ).value;

  validateAllLevels(addedDmgEffPct, skillName);
  validateAllLevels(spellDmgMin, skillName);
  validateAllLevels(spellDmgMax, skillName);

  return {
    addedDmgEffPct,
    spellDmgMin,
    spellDmgMax,
    castTime: createConstantLevels(0.65),
    jump: createConstantLevels(jump),
  };
};

// tlidb removed progression tables for several curse/empower skills. Level
// values below are retained from the last scrape; Simple/Details descriptions
// on tlidb still show level 1 and level 20 values matching these tables.
const levelsFromArray = (values: readonly number[]): Record<number, number> => {
  const result: Record<number, number> = {};
  values.forEach((v, i) => {
    result[i + 1] = v;
  });
  return result;
};

// Standard curse curve: +1/level from 20 (L1) to 39 (L20), then +0.5/level to
// 49.5 (L40). Shared by Biting Cold, Corruption, Electrocute, Entangled Pain,
// and Timid.
const STANDARD_CURSE_DMG_CURVE = [
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47,
  47.5, 48, 48.5, 49, 49.5,
];

export const bitingColdParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const dmgPct = levelsFromArray(STANDARD_CURSE_DMG_CURVE);
  validateAllLevels(dmgPct, skillName);
  return { dmgPct };
};

export const timidParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const dmgPct = levelsFromArray(STANDARD_CURSE_DMG_CURVE);
  validateAllLevels(dmgPct, skillName);
  return { dmgPct };
};

// Secret Origin Unleash: +0.5/level from 5.5% (L1) to 15% (L20), then +0.3/level
// to 21.2% (L40). cspd per focus blessing is constant 3%.
const SECRET_ORIGIN_UNLEASH_SPELL_DMG_PCT = [
  5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5,
  14, 14.5, 15, 15.5, 15.8, 16.1, 16.4, 16.7, 17, 17.3, 17.6, 17.9, 18.2, 18.5,
  18.8, 19.1, 19.4, 19.7, 20, 20.3, 20.6, 20.9, 21.2,
];

export const secretOriginUnleashParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const spellDmgPct = levelsFromArray(SECRET_ORIGIN_UNLEASH_SPELL_DMG_PCT);
  validateAllLevels(spellDmgPct, skillName);
  return { spellDmgPct, cspdPctPerFocusBlessing: createConstantLevels(3) };
};

export const thunderSpikeParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const addedDmgEffCol = findColumn(
    progressionTable,
    "effectiveness of added damage",
    skillName,
  );

  const weaponAtkDmgPct: Record<number, number> = {};
  const addedDmgEffPct: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const value = parseNumericValue(text);
      weaponAtkDmgPct[level] = value;
      addedDmgEffPct[level] = value;
    }
  }

  const level20Value = weaponAtkDmgPct[20];
  if (level20Value === undefined) {
    throw new Error(`${skillName}: level 20 value missing`);
  }
  for (let level = 21; level <= 40; level++) {
    weaponAtkDmgPct[level] = level20Value;
    addedDmgEffPct[level] = level20Value;
  }

  validateAllLevels(weaponAtkDmgPct, skillName);
  validateAllLevels(addedDmgEffPct, skillName);

  return { weaponAtkDmgPct, addedDmgEffPct };
};

export const electrocuteParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const lightningDmgPct = levelsFromArray(STANDARD_CURSE_DMG_CURVE);
  validateAllLevels(lightningDmgPct, skillName);
  return { lightningDmgPct };
};

export const iceLancesParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const addedDmgEffCol = findColumn(
    progressionTable,
    "effectiveness of added damage",
    skillName,
  );
  const damageCol = progressionTable.find(
    (col) => col.header.toLowerCase() === "damage",
  );
  if (damageCol === undefined) {
    throw new Error(`${skillName}: no "damage" column found`);
  }
  const descriptCol = findColumn(progressionTable, "descript", skillName);

  const addedDmgEffPct: Record<number, number> = {};
  const spellDmgMin: Record<number, number> = {};
  const spellDmgMax: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      addedDmgEffPct[level] = parseNumericValue(text);
    }
  }

  for (const [levelStr, text] of Object.entries(damageCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const match = findMatch(
        text,
        ts("deals {min:int}-{max:int} spell cold damage"),
        skillName,
      );
      spellDmgMin[level] = match.min;
      spellDmgMax[level] = match.max;
    }
  }

  const level20AddedDmgEff = addedDmgEffPct[20];
  const level20SpellDmgMin = spellDmgMin[20];
  const level20SpellDmgMax = spellDmgMax[20];
  if (
    level20AddedDmgEff === undefined ||
    level20SpellDmgMin === undefined ||
    level20SpellDmgMax === undefined
  ) {
    throw new Error(`${skillName}: level 20 values missing`);
  }
  for (let level = 21; level <= 40; level++) {
    addedDmgEffPct[level] = level20AddedDmgEff;
    spellDmgMin[level] = level20SpellDmgMin;
    spellDmgMax[level] = level20SpellDmgMax;
  }

  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const jump = findMatch(
    descript,
    ts("{value:+int} jumps for this skill"),
    skillName,
  ).value;

  const shotgunEffFalloffPct = findMatch(
    descript,
    ts("shotgun effect falloff coefficient is {value:int%}"),
    skillName,
  ).value;

  validateAllLevels(addedDmgEffPct, skillName);
  validateAllLevels(spellDmgMin, skillName);
  validateAllLevels(spellDmgMax, skillName);

  return {
    addedDmgEffPct,
    spellDmgMin,
    spellDmgMax,
    castTime: createConstantLevels(0.65),
    jump: createConstantLevels(jump),
    shotgunEffFalloffPct: createConstantLevels(shotgunEffFalloffPct),
  };
};

export const spectralSlashParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  const descriptCol = findColumn(progressionTable, "descript", skillName);

  const comboStarterWeaponAtkDmgPct: Record<number, number> = {};
  const comboFinisherWeaponAtkDmgPct: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(descriptCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20) {
      // Descript has newlines separating lines; collapse to spaces for matching
      const collapsed = text.replace(/\n/g, " ");
      const starterMatch = findMatch(
        collapsed,
        ts("combo starter 1: deals {value:dec%} weapon attack damage"),
        skillName,
      );
      comboStarterWeaponAtkDmgPct[level] = starterMatch.value;

      const finisherMatch = findMatch(
        collapsed,
        ts("combo finisher: deals {value:dec%} weapon attack damage"),
        skillName,
      );
      comboFinisherWeaponAtkDmgPct[level] = finisherMatch.value;
    }
  }

  const level20StarterWeaponDmg = comboStarterWeaponAtkDmgPct[20];
  const level20FinisherWeaponDmg = comboFinisherWeaponAtkDmgPct[20];

  if (
    level20StarterWeaponDmg === undefined ||
    level20FinisherWeaponDmg === undefined
  ) {
    throw new Error(
      `${skillName}: level 20 values missing, cannot fallback for levels 21-40`,
    );
  }

  for (let level = 21; level <= 40; level++) {
    comboStarterWeaponAtkDmgPct[level] = level20StarterWeaponDmg;
    comboFinisherWeaponAtkDmgPct[level] = level20FinisherWeaponDmg;
  }

  // Extract constants from level 1 descript
  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const comboFinisherAspdPct = findMatch(
    descript,
    ts("{value:+int%} additional attack speed for the combo finisher"),
    skillName,
  ).value;

  const comboFinisherAmplificationPct = findMatch(
    descript,
    ts("{value:+int%} combo finisher amplification"),
    skillName,
  ).value;

  const shotgunEffFalloffPct = findMatch(
    descript,
    ts("shotgun effect is {value:int%}"),
    skillName,
  ).value;

  const maxClones = findMatch(
    descript,
    ts("up to {value:int} clone(s)"),
    skillName,
  ).value;

  validateAllLevels(comboStarterWeaponAtkDmgPct, skillName);
  validateAllLevels(comboFinisherWeaponAtkDmgPct, skillName);

  return {
    comboStarterWeaponAtkDmgPct,
    comboFinisherWeaponAtkDmgPct,
    comboFinisherAspdPct: createConstantLevels(comboFinisherAspdPct),
    comboFinisherAmplificationPct: createConstantLevels(
      comboFinisherAmplificationPct,
    ),
    shotgunEffFalloffPct: createConstantLevels(shotgunEffFalloffPct),
    maxClones: createConstantLevels(maxClones),
  };
};

// Fearless Warcry: +0.1/level from 4% (L1) to 5.9% (L20), then tapered growth
// to ~6.998% (L40). Both dmg and ailment-dmg columns share the same curve.
const FEARLESS_WARCRY_CURVE = [
  4, 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 5, 5.1, 5.2, 5.3, 5.4, 5.5,
  5.6, 5.7, 5.8, 5.9, 6, 6.053, 6.105, 6.158, 6.21, 6.263, 6.315, 6.368, 6.42,
  6.473, 6.525, 6.578, 6.63, 6.683, 6.735, 6.788, 6.84, 6.893, 6.945, 6.998,
];

export const fearlessWarcryParser: SupportLevelParser = (input) => {
  const { skillName } = input;
  const slashStrikeSkillDmgPerEnemy = levelsFromArray(FEARLESS_WARCRY_CURVE);
  const slashStrikeSkillAilmentDmgPerEnemy = levelsFromArray(
    FEARLESS_WARCRY_CURVE,
  );
  validateAllLevels(slashStrikeSkillDmgPerEnemy, skillName);
  validateAllLevels(slashStrikeSkillAilmentDmgPerEnemy, skillName);
  return { slashStrikeSkillDmgPerEnemy, slashStrikeSkillAilmentDmgPerEnemy };
};

export const berserkingBladeParser: SupportLevelParser = (input) => {
  const { skillName, progressionTable } = input;

  // This skill has duplicate column headers:
  // [0] "Effectiveness of added damage" (Sweep)
  // [1] "damage" (Sweep)
  // [2] "Effectiveness of added damage" (Steep)
  // [3] "damage" (Steep)
  // [4] "Descript"
  // Access by index since findColumn would return the first match
  const sweepAddedDmgEffCol = progressionTable[0];
  const steepAddedDmgEffCol = progressionTable[2];
  const descriptCol = progressionTable[4];

  if (
    sweepAddedDmgEffCol === undefined ||
    steepAddedDmgEffCol === undefined ||
    descriptCol === undefined
  ) {
    throw new Error(
      `${skillName}: missing expected columns in progression table`,
    );
  }

  const sweepWeaponAtkDmgPct: Record<number, number> = {};
  const sweepAddedDmgEffPct: Record<number, number> = {};
  const steepWeaponAtkDmgPct: Record<number, number> = {};
  const steepAddedDmgEffPct: Record<number, number> = {};

  // Parse levels 1-20 from the columns
  for (const [levelStr, text] of Object.entries(sweepAddedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const value = parseNumericValue(text);
      sweepWeaponAtkDmgPct[level] = value;
      sweepAddedDmgEffPct[level] = value;
    }
  }

  for (const [levelStr, text] of Object.entries(steepAddedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      const value = parseNumericValue(text);
      steepWeaponAtkDmgPct[level] = value;
      steepAddedDmgEffPct[level] = value;
    }
  }

  // Fill levels 21-40 with level 20 values
  const level20SweepValue = sweepWeaponAtkDmgPct[20];
  const level20SteepValue = steepWeaponAtkDmgPct[20];
  if (level20SweepValue === undefined || level20SteepValue === undefined) {
    throw new Error(`${skillName}: level 20 values missing`);
  }
  for (let level = 21; level <= 40; level++) {
    sweepWeaponAtkDmgPct[level] = level20SweepValue;
    sweepAddedDmgEffPct[level] = level20SweepValue;
    steepWeaponAtkDmgPct[level] = level20SteepValue;
    steepAddedDmgEffPct[level] = level20SteepValue;
  }

  // Extract constant values from descript
  const descript = descriptCol.rows[1];
  if (descript === undefined) {
    throw new Error(`${skillName}: no descript found for level 1`);
  }

  const skillAreaBuffPct = findMatch(
    descript,
    ts("this skill {value:dec}% skill area for each stack of buff"),
    skillName,
  ).value;

  const maxBerserkingBladeStacks = findMatch(
    descript,
    ts("Stacks up to {value:int} time\\(s\\)"),
    skillName,
  ).value;

  const steepStrikeChancePct = findMatch(
    descript,
    ts("this skill {value:+int}% steep strike chance"),
    skillName,
  ).value;

  validateAllLevels(sweepWeaponAtkDmgPct, skillName);
  validateAllLevels(sweepAddedDmgEffPct, skillName);
  validateAllLevels(steepWeaponAtkDmgPct, skillName);
  validateAllLevels(steepAddedDmgEffPct, skillName);

  return {
    sweepWeaponAtkDmgPct,
    sweepAddedDmgEffPct,
    steepWeaponAtkDmgPct,
    steepAddedDmgEffPct,
    skillAreaBuffPct: createConstantLevels(skillAreaBuffPct),
    maxBerserkingBladeStacks: createConstantLevels(maxBerserkingBladeStacks),
    steepStrikeChancePct: createConstantLevels(steepStrikeChancePct),
  };
};
