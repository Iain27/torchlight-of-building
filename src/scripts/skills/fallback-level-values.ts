import type { ParsedLevelValues } from "./types";

/**
 * Hardcoded level values for skills whose progression tables were removed
 * from tlidb. These are preserved from the last successful scrape; Simple and
 * Details descriptions on the current tlidb pages still match the level 1 and
 * level 20 endpoints of these curves.
 *
 * When tlidb restores a skill's progression table, delete its entry here and
 * the generator will go back to scraping.
 */

const levelsFromArray = (values: readonly number[]): Record<number, number> => {
  const result: Record<number, number> = {};
  values.forEach((v, i) => {
    result[i + 1] = v;
  });
  return result;
};

const constantLevels = (value: number): Record<number, number> => {
  const result: Record<number, number> = {};
  for (let level = 1; level <= 40; level++) {
    result[level] = value;
  }
  return result;
};

// Standard aura damage curve A: +1/level from L1→L20 (X → X+19), then +0.5
// until L40. Both Deep Pain (15→34→44.5), Electric Conversion, Erosion
// Amplification, Spell Amplification all share this shape but with different
// starting points. Precise: variants start at +6 / use the same curve.

const DEEP_PAIN_DOT_DMG_PCT = [
  15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33,
  34, 35, 35.5, 36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42,
  42.5, 43, 43.5, 44, 44.5,
];

const ELECTRIC_CONVERSION_LIGHTNING_DMG_PCT = DEEP_PAIN_DOT_DMG_PCT;
const EROSION_AMPLIFICATION_EROSION_DMG_PCT = DEEP_PAIN_DOT_DMG_PCT;
const SPELL_AMPLIFICATION_SPELL_DMG_PCT = DEEP_PAIN_DOT_DMG_PCT;

const PRECISE_DEEP_PAIN_DOT_DMG_PCT = [
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47, 47.5, 48,
  48.5, 49, 49.5, 50, 50.5,
];

const PRECISE_ELECTRIC_CONVERSION_LIGHTNING_DMG_PCT =
  PRECISE_DEEP_PAIN_DOT_DMG_PCT;
const PRECISE_EROSION_AMPLIFICATION_EROSION_DMG_PCT =
  PRECISE_DEEP_PAIN_DOT_DMG_PCT;
const PRECISE_SPELL_AMPLIFICATION_SPELL_DMG_PCT = PRECISE_DEEP_PAIN_DOT_DMG_PCT;

const FRIGID_DOMAIN_COLD_DMG_PCT = [
  18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36,
  37, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45,
  45.5, 46, 46.5, 47, 47.5,
];

const PRECISE_FRIGID_DOMAIN_COLD_DMG_PCT = [
  25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43,
  44, 45, 45.5, 46, 46.5, 47, 47.5, 48, 48.5, 49, 49.5, 50, 50.5, 51, 51.5, 52,
  52.5, 53, 53.5, 54, 54.5,
];

const DOMAIN_EXPANSION_AREA_DMG_PCT = [
  14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
  33, 34, 34.5, 35, 35.5, 36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41,
  41.5, 42, 42.5, 43, 43.5,
];

const PRECISE_DOMAIN_EXPANSION_AREA_DMG_PCT = DOMAIN_EXPANSION_AREA_DMG_PCT;

// Energy Fortress: energyShield ramps linearly 67→319.7→396.7. energyShieldPct
// has two different starting points (base 3.2, precise 7.9) but same endpoint
// curve slope per level. Shared base shield list.
const ENERGY_FORTRESS_ENERGY_SHIELD = [
  67, 80.3, 93.6, 106.9, 120.2, 133.5, 146.8, 160.1, 173.4, 186.7, 200, 213.3,
  226.6, 239.9, 253.2, 266.5, 279.8, 293.1, 306.4, 319.7, 333, 336.4, 339.7,
  343.1, 346.4, 349.8, 353.1, 356.5, 359.8, 363.2, 366.5, 369.9, 373.2, 376.6,
  379.9, 383.3, 386.6, 390, 393.3, 396.7,
];

const ENERGY_FORTRESS_ENERGY_SHIELD_PCT = [
  3.2, 3.735, 4.27, 4.805, 5.34, 5.875, 6.41, 6.945, 7.48, 8.015, 8.55, 9.085,
  9.62, 10.16, 10.69, 11.23, 11.76, 12.3, 12.83, 13.37, 13.9, 14.1, 14.3, 14.5,
  14.7, 14.9, 15.1, 15.3, 15.5, 15.7, 15.9, 16.1, 16.3, 16.5, 16.7, 16.9, 17.1,
  17.3, 17.5, 17.7,
];

const PRECISE_ENERGY_FORTRESS_ENERGY_SHIELD_PCT = [
  7.9, 8.43, 8.96, 9.49, 10.02, 10.55, 11.08, 11.61, 12.14, 12.67, 13.2, 13.73,
  14.26, 14.79, 15.32, 15.85, 16.38, 16.91, 17.44, 17.97, 18.5, 18.7, 18.9,
  19.1, 19.3, 19.5, 19.7, 19.9, 20.1, 20.3, 20.5, 20.7, 20.9, 21.1, 21.3, 21.5,
  21.7, 21.9, 22.1, 22.3,
];

// Steadfast / Nimbleness share base armor/evasion 2200→6000→7150. Only the
// percent curves differ between base and precise variants.
const STEADFAST_NIMBLENESS_BASE = [
  2200, 2400, 2600, 2800, 3000, 3200, 3400, 3600, 3800, 4000, 4200, 4400, 4600,
  4800, 5000, 5200, 5400, 5600, 5800, 6000, 6200, 6250, 6300, 6350, 6400, 6450,
  6500, 6550, 6600, 6650, 6700, 6750, 6800, 6850, 6900, 6950, 7000, 7050, 7100,
  7150,
];

const STEADFAST_ARMOR_PCT = [
  0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5,
  10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17,
  17.5, 18, 18.5, 19, 19.5, 20,
];

const PRECISE_STEADFAST_ARMOR_PCT = [
  10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5,
  18, 18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25,
  25.5, 26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30,
];

const NIMBLENESS_EVASION_PCT = STEADFAST_ARMOR_PCT;
const PRECISE_NIMBLENESS_EVASION_PCT = PRECISE_STEADFAST_ARMOR_PCT;

// Precise Projectiles: +1/level 16→35, +0.5/level to 45.5. Precise variant
// starts at 20.
const PRECISE_PROJECTILES_DMG_PCT = [
  16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34,
  35, 36, 36.5, 37, 37.5, 38, 38.5, 39, 39.5, 40, 40.5, 41, 41.5, 42, 42.5, 43,
  43.5, 44, 44.5, 45, 45.5,
];

const PRECISE_PRECISE_PROJECTILES_DMG_PCT = [
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38,
  39, 40, 40.5, 41, 41.5, 42, 42.5, 43, 43.5, 44, 44.5, 45, 45.5, 46, 46.5, 47,
  47.5, 48, 48.5, 49, 49.5,
];

// Precise: Cruelty — +0.5/level 12.5→22, then +0.25/level to 27.25.
const PRECISE_CRUELTY_ATK_DMG_PCT = [
  12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18, 18.5, 19, 19.5,
  20, 20.5, 21, 21.5, 22, 22.5, 22.75, 23, 23.25, 23.5, 23.75, 24, 24.25, 24.5,
  24.75, 25, 25.25, 25.5, 25.75, 26, 26.25, 26.5, 26.75, 27, 27.25,
];

// Precise: Fearless — melee crit rating 60→79→89.5, melee damage 10→29→39.5.
const PRECISE_FEARLESS_MELEE_CRIT_RATING_PCT = [
  60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78,
  79, 80, 80.5, 81, 81.5, 82, 82.5, 83, 83.5, 84, 84.5, 85, 85.5, 86, 86.5, 87,
  87.5, 88, 88.5, 89, 89.5,
];

const PRECISE_FEARLESS_MELEE_DMG_PCT = [
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28,
  29, 30, 30.5, 31, 31.5, 32, 32.5, 33, 33.5, 34, 34.5, 35, 35.5, 36, 36.5, 37,
  37.5, 38, 38.5, 39, 39.5,
];

// Precise: Swiftness — movement speed 11→20.5→30.5 (+0.5/level throughout).
const PRECISE_SWIFTNESS_MOVEMENT_SPEED_PCT = [
  11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 15.5, 16, 16.5, 17, 17.5, 18,
  18.5, 19, 19.5, 20, 20.5, 21, 21.5, 22, 22.5, 23, 23.5, 24, 24.5, 25, 25.5,
  26, 26.5, 27, 27.5, 28, 28.5, 29, 29.5, 30, 30.5,
];

export const FALLBACK_LEVEL_VALUES: Record<string, ParsedLevelValues> = {
  "Deep Pain": { dotDmgPct: levelsFromArray(DEEP_PAIN_DOT_DMG_PCT) },
  "Electric Conversion": {
    lightningDmgPct: levelsFromArray(ELECTRIC_CONVERSION_LIGHTNING_DMG_PCT),
  },
  "Erosion Amplification": {
    erosionDmgPct: levelsFromArray(EROSION_AMPLIFICATION_EROSION_DMG_PCT),
  },
  "Spell Amplification": {
    spellDmgPct: levelsFromArray(SPELL_AMPLIFICATION_SPELL_DMG_PCT),
  },
  "Precise: Deep Pain": {
    dotDmgPct: levelsFromArray(PRECISE_DEEP_PAIN_DOT_DMG_PCT),
    afflictionPerSec: constantLevels(30),
  },
  "Precise: Electric Conversion": {
    lightningDmgPct: levelsFromArray(
      PRECISE_ELECTRIC_CONVERSION_LIGHTNING_DMG_PCT,
    ),
  },
  "Precise: Erosion Amplification": {
    erosionDmgPct: levelsFromArray(
      PRECISE_EROSION_AMPLIFICATION_EROSION_DMG_PCT,
    ),
  },
  "Precise: Spell Amplification": {
    spellDmgPct: levelsFromArray(PRECISE_SPELL_AMPLIFICATION_SPELL_DMG_PCT),
  },
  "Frigid Domain": { coldDmgPct: levelsFromArray(FRIGID_DOMAIN_COLD_DMG_PCT) },
  "Precise: Frigid Domain": {
    coldDmgPct: levelsFromArray(PRECISE_FRIGID_DOMAIN_COLD_DMG_PCT),
  },
  "Domain Expansion": {
    areaDmgPct: levelsFromArray(DOMAIN_EXPANSION_AREA_DMG_PCT),
    skillAreaPct: constantLevels(20),
  },
  "Precise: Domain Expansion": {
    areaDmgPct: levelsFromArray(PRECISE_DOMAIN_EXPANSION_AREA_DMG_PCT),
    skillAreaPct: constantLevels(20),
    condAreaDmgPct: constantLevels(4),
  },
  "Energy Fortress": {
    energyShield: levelsFromArray(ENERGY_FORTRESS_ENERGY_SHIELD),
    energyShieldPct: levelsFromArray(ENERGY_FORTRESS_ENERGY_SHIELD_PCT),
  },
  "Precise: Energy Fortress": {
    energyShield: levelsFromArray(ENERGY_FORTRESS_ENERGY_SHIELD),
    energyShieldPct: levelsFromArray(PRECISE_ENERGY_FORTRESS_ENERGY_SHIELD_PCT),
  },
  Steadfast: {
    armor: levelsFromArray(STEADFAST_NIMBLENESS_BASE),
    armorPct: levelsFromArray(STEADFAST_ARMOR_PCT),
  },
  "Precise: Steadfast": {
    armor: levelsFromArray(STEADFAST_NIMBLENESS_BASE),
    armorPct: levelsFromArray(PRECISE_STEADFAST_ARMOR_PCT),
  },
  Nimbleness: {
    evasion: levelsFromArray(STEADFAST_NIMBLENESS_BASE),
    evasionPct: levelsFromArray(NIMBLENESS_EVASION_PCT),
  },
  "Precise: Nimbleness": {
    evasion: levelsFromArray(STEADFAST_NIMBLENESS_BASE),
    evasionPct: levelsFromArray(PRECISE_NIMBLENESS_EVASION_PCT),
  },
  "Precise Projectiles": {
    projectileDmgPct: levelsFromArray(PRECISE_PROJECTILES_DMG_PCT),
    ailmentDmgPct: levelsFromArray(PRECISE_PROJECTILES_DMG_PCT),
    projectileSpeedPct: constantLevels(10),
  },
  "Precise: Precise Projectiles": {
    projectileDmgPct: levelsFromArray(PRECISE_PRECISE_PROJECTILES_DMG_PCT),
    ailmentDmgPct: levelsFromArray(PRECISE_PRECISE_PROJECTILES_DMG_PCT),
    projectileSpeedPct: constantLevels(10),
  },
  "Precise: Cruelty": {
    attackDmgPct: levelsFromArray(PRECISE_CRUELTY_ATK_DMG_PCT),
    auraEffPctPerCrueltyStack: constantLevels(2.5),
  },
  "Precise: Fearless": {
    meleeCritRatingPct: levelsFromArray(PRECISE_FEARLESS_MELEE_CRIT_RATING_PCT),
    meleeDmgPct: levelsFromArray(PRECISE_FEARLESS_MELEE_DMG_PCT),
    meleeAspdPct: constantLevels(8),
  },
  "Precise: Swiftness": {
    movementSpeedPct: levelsFromArray(PRECISE_SWIFTNESS_MOVEMENT_SPEED_PCT),
  },
};
