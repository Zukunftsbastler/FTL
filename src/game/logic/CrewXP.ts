import type { CrewComponent } from '../components/CrewComponent';

/** XP required to advance from skill level 0 → 1. */
export const XP_FOR_LEVEL_1 = 15;

/** XP required to advance from skill level 1 → 2. */
export const XP_FOR_LEVEL_2 = 30;

/** Maximum skill level reachable through XP gain. */
const MAX_SKILL_LEVEL = 2;

type SkillName = keyof CrewComponent['skills'];

/**
 * Awards XP to a crew member for a specific skill.
 * Handles level-up automatically when the relevant threshold is crossed:
 *   level 0 → 1: 15 XP
 *   level 1 → 2: 30 XP
 * XP is reset to 0 after each level-up.
 * Has no effect if the skill is already at MAX_SKILL_LEVEL.
 */
export function awardXP(crew: CrewComponent, skill: SkillName, amount: number): void {
  if (crew.skills[skill] >= MAX_SKILL_LEVEL) return;

  crew.xp[skill] += amount;

  const threshold = crew.skills[skill] === 0 ? XP_FOR_LEVEL_1 : XP_FOR_LEVEL_2;
  if (crew.xp[skill] >= threshold) {
    crew.skills[skill] = Math.min(MAX_SKILL_LEVEL, crew.skills[skill] + 1);
    crew.xp[skill] = 0;
  }
}

/**
 * Returns the XP threshold for the next level-up for a given current skill level.
 * Returns 0 if already at max.
 */
export function xpThresholdFor(currentLevel: number): number {
  if (currentLevel >= MAX_SKILL_LEVEL) return 0;
  return currentLevel === 0 ? XP_FOR_LEVEL_1 : XP_FOR_LEVEL_2;
}
