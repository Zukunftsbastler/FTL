import type { CrewTemplate, CrewSkills } from '../data/CrewTemplate';
import type { CrewRace } from '../data/CrewRace';
import type { CrewClass } from '../data/CrewClass';

/**
 * A fully resolved combat reward object.
 * Pure data — no ECS references.  Used by VictorySystem and (in future) narrative events.
 */
export interface Reward {
  scrap: number;
  fuel: number;
  missiles: number;
  droneParts: number;
  /** ID string of a randomly dropped weapon, or undefined if none dropped. */
  weaponId?: string;
  /** A randomly generated crew member who joins the ship, or undefined if none. */
  newCrew?: CrewTemplate;
}

// ── Internal tables ───────────────────────────────────────────────────────────

const CREW_RACES: CrewRace[]   = ['HUMAN', 'ENGI', 'MANTIS', 'ROCKMAN', 'ZOLTAN', 'SLUG'];
const CREW_CLASSES: CrewClass[] = ['ENGINEER', 'GUNNER', 'PILOT', 'SECURITY'];
const CREW_NAMES: string[] = [
  'Alex', 'Bran', 'Ciri', 'Dex', 'Eri', 'Fane', 'Gale', 'Hira', 'Ike', 'Jex',
  'Kael', 'Lyra', 'Mori', 'Nyx', 'Oryn', 'Pell', 'Quen', 'Rael', 'Sova', 'Tyr',
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Generates a randomised combat reward.
 *
 * Always guarantees some Scrap.
 * High chance (70%) of Fuel, moderate chance (60%) of Missiles.
 * Low chance (10%) of a random weapon from `availableWeaponIds`.
 * Very low chance (5%) of a randomly generated crew member.
 *
 * @param sectorLevel       Current sector depth (1–8); scales scrap amount.
 * @param availableWeaponIds Weapon IDs eligible for the drop pool (from weapons.json).
 * @param victoryType       'HULL' (default) or 'CREW_KILL' — crew kill grants +25% scrap and higher weapon chance.
 */
export function generateCombatReward(
  sectorLevel: number,
  availableWeaponIds: string[],
  victoryType: 'HULL' | 'CREW_KILL' = 'HULL',
): Reward {
  const isCrewKill   = victoryType === 'CREW_KILL';
  const scrapBase    = 10 + sectorLevel * 5 + Math.floor(Math.random() * 11);
  const reward: Reward = {
    scrap:      isCrewKill ? Math.round(scrapBase * 1.25) : scrapBase,
    fuel:       Math.random() < 0.70 ? 1 + Math.floor(Math.random() * 2) : 0,
    missiles:   Math.random() < 0.60 ? 1 + Math.floor(Math.random() * 2) : 0,
    droneParts: Math.random() < 0.30 ? 1 : 0,
  };

  const weaponChance = isCrewKill ? 0.18 : 0.10;
  if (availableWeaponIds.length > 0 && Math.random() < weaponChance) {
    reward.weaponId = pick(availableWeaponIds);
  }

  if (Math.random() < 0.05) {
    const race      = pick(CREW_RACES);
    const crewClass = pick(CREW_CLASSES);
    const name      = pick(CREW_NAMES);
    const skills: CrewSkills = {
      piloting:    0,
      engineering: 0,
      gunnery:     0,
      repair:      0,
      combat:      0,
    };
    const newCrew: CrewTemplate = { name, race, crewClass, skills, roomId: 0 };
    reward.newCrew = newCrew;
  }

  return reward;
}
