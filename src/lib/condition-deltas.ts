import { calculateOffense } from "@/src/tli/calcs/offense";
import type { Configuration, Loadout } from "@/src/tli/core";
import type { Condition } from "@/src/tli/mod";

/**
 * Map each config-driven Condition to the Configuration field(s) that would
 * flip the condition to `true`. Conditions that depend on gear, derived
 * state, or have no simple config flip are omitted — those can't be "toggled"
 * without changing the build itself.
 */
export const CONDITION_TO_CONFIG_FLIP: Partial<
  Record<Condition, (config: Configuration) => Configuration>
> = {
  enemy_frostbitten: (c) => ({ ...c, enemyFrostbittenEnabled: true }),
  realm_of_mercury: (c) => ({ ...c, realmOfMercuryEnabled: true }),
  has_focus_blessing: (c) => ({ ...c, hasFocusBlessing: true }),
  has_agility_blessing: (c) => ({ ...c, hasAgilityBlessing: true }),
  has_tenacity_blessing: (c) => ({ ...c, hasTenacityBlessing: true }),
  enemy_has_desecration: (c) => ({ ...c, enemyHasDesecration: true }),
  enemy_has_trauma: (c) => ({ ...c, enemyHasTrauma: true }),
  enemy_paralyzed: (c) => ({ ...c, enemyParalyzed: true }),
  enemy_numbed: (c) => ({ ...c, enemyNumbed: true }),
  has_full_mana: (c) => ({ ...c, hasFullMana: true }),
  has_low_mana: (c) => ({ ...c, hasLowMana: true }),
  target_enemy_is_elite: (c) => ({ ...c, targetEnemyIsElite: true }),
  target_enemy_is_nearby: (c) => ({ ...c, targetEnemyIsNearby: true }),
  target_enemy_is_distant: (c) => ({ ...c, targetEnemyIsDistant: true }),
  target_enemy_is_in_proximity: (c) => ({
    ...c,
    targetEnemyIsInProximity: true,
  }),
  has_blocked_recently: (c) => ({ ...c, hasBlockedRecently: true }),
  has_elites_nearby: (c) => ({ ...c, hasElitesNearby: true }),
  enemy_has_ailment: (c) => ({ ...c, enemyHasAilment: true }),
  has_crit_recently: (c) => ({ ...c, hasCritRecently: true }),
  has_blur: (c) => ({ ...c, hasBlur: true }),
  blur_ended_recently: (c) => ({ ...c, blurEndedRecently: true }),
  channeling: (c) => ({ ...c, channeling: true }),
  sages_insight_fire: (c) => ({ ...c, sagesInsightFireActivated: true }),
  sages_insight_cold: (c) => ({ ...c, sagesInsightColdActivated: true }),
  sages_insight_lightning: (c) => ({
    ...c,
    sagesInsightLightningActivated: true,
  }),
  sages_insight_erosion: (c) => ({ ...c, sagesInsightErosionActivated: true }),
  enemy_is_cursed: (c) => ({ ...c, targetEnemyIsCursed: true }),
  has_moved_recently: (c) => ({ ...c, hasMovedRecently: true }),
  is_moving: (c) => ({ ...c, isMoving: true }),
  not_hit_recently: (c) => ({ ...c, notHitRecently: true }),
  has_used_mobility_skill_recently: (c) => ({
    ...c,
    hasUsedMobilitySkillRecently: true,
  }),
  has_cast_curse_recently: (c) => ({ ...c, hasCastCurseRecently: true }),
  taking_damage_over_time: (c) => ({ ...c, takingDamageOverTime: true }),
  frostbitten_heart_is_active: (c) => ({
    ...c,
    frostbittenHeartIsActive: true,
  }),
};

export interface ConditionDelta {
  condition: Condition;
  /** Percentage DPS increase if this condition were enabled. */
  dpsPct: number;
  /** Absolute DPS with this condition flipped (for display). */
  newDps: number;
}

/**
 * For each condition in the given list, calculate how much total DPS for
 * `skillName` would change if the condition were flipped to true. Returns
 * entries sorted by dpsPct descending.
 */
export const calculateConditionDeltas = (
  loadout: Loadout,
  configuration: Configuration,
  conditions: Condition[],
  skillName: string,
): ConditionDelta[] => {
  const baseline = calculateOffense({ loadout, configuration });
  const baseDps =
    baseline.skills[skillName as keyof typeof baseline.skills]?.totalDps ?? 0;
  if (baseDps === 0) return [];

  const seen = new Set<Condition>();
  const results: ConditionDelta[] = [];
  for (const condition of conditions) {
    if (seen.has(condition)) continue;
    seen.add(condition);
    const flip = CONDITION_TO_CONFIG_FLIP[condition];
    if (flip === undefined) continue;
    const flipped = calculateOffense({
      loadout,
      configuration: flip(configuration),
    });
    const newDps =
      flipped.skills[skillName as keyof typeof flipped.skills]?.totalDps ?? 0;
    const dpsPct = ((newDps - baseDps) / baseDps) * 100;
    if (dpsPct > 0.1) {
      results.push({ condition, dpsPct, newDps });
    }
  }
  results.sort((a, b) => b.dpsPct - a.dpsPct);
  return results;
};
