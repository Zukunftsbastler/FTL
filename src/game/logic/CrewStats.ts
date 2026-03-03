import { AssetLoader } from '../../utils/AssetLoader';
import type { CrewRace } from '../data/CrewRace';
import type { CrewRaceStats } from '../data/CrewRaceStats';

/** Fallback used when crew_stats.json hasn't been loaded or race is unknown. */
const HUMAN_DEFAULTS: CrewRaceStats = {
  race: 'HUMAN',
  name: 'Human',
  maxHealth: 100,
  movementSpeed: 1.0,
  repairSpeed: 1.0,
  combatDamage: 1.0,
  fireDamageMultiplier: 1.0,
  suffocationMultiplier: 1.0,
  specialAbilities: [],
};

/**
 * Returns the racial stat block for the given crew race.
 * Falls back to human-baseline values if crew_stats.json is not yet loaded
 * or the race entry is missing.
 */
export function getRaceStats(race: CrewRace): CrewRaceStats {
  const all = AssetLoader.getJSON<CrewRaceStats[]>('crew_stats');
  return all?.find((s) => s.race === race) ?? { ...HUMAN_DEFAULTS, race };
}
