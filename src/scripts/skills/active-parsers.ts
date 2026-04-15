import { t, ts } from "@/src/tli/mod-parser";
import {
  findColumn,
  parseNumericValue,
  validateAllLevels,
} from "./progression-table";
import type { SupportLevelParser } from "./types";
import { createConstantLevels, findMatch } from "./utils";

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

export const shacklesOfMaliceParser: SupportLevelParser = () => {
  // Shackles of Malice has no progression /40 table — values are constants
  // derived from the skill description. Source: tlidb.com/en/Shackles_of_Malice
  // - 667-667 Spell Erosion Damage (chain hit)
  // - Effectiveness of added damage: 124%
  // - Cast Speed: 1s
  // - Chain jumps: 2
  // - Per-curse explosion bonus (25% per curse) NOT yet modeled
  return {
    addedDmgEffPct: createConstantLevels(124),
    spellDmgMin: createConstantLevels(667),
    spellDmgMax: createConstantLevels(667),
    castTime: createConstantLevels(1),
    jump: createConstantLevels(2),
  };
};

export const lightningShotParser: SupportLevelParser = (input) => {
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

  const weaponAtkDmgPct: Record<number, number> = {};
  const addedDmgEffPct: Record<number, number> = {};

  for (const [levelStr, text] of Object.entries(addedDmgEffCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
      addedDmgEffPct[level] = parseNumericValue(text);
    }
  }

  for (const [levelStr, text] of Object.entries(damageCol.rows)) {
    const level = Number(levelStr);
    if (level <= 20 && text !== "") {
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
    weaponAtkDmgPct[level] = level20WeaponDmg;
    addedDmgEffPct[level] = level20AddedDmgEff;
  }

  validateAllLevels(weaponAtkDmgPct, skillName);
  validateAllLevels(addedDmgEffPct, skillName);

  return { weaponAtkDmgPct, addedDmgEffPct };
};
