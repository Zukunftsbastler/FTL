import type { Component } from '../../engine/Component';
import type { CrewClass } from '../data/CrewClass';
import type { CrewRace } from '../data/CrewRace';
import type { CrewSkills } from '../data/CrewTemplate';

/** Per-skill XP tracking (accumulated, not consumed). */
export interface CrewXP {
  piloting: number;
  engineering: number;
  gunnery: number;
  repair: number;
  combat: number;
}

/** Marks an entity as a crew member and stores their vital statistics. */
export interface CrewComponent extends Component {
  readonly _type: 'Crew';
  readonly name: string;
  readonly race: CrewRace;
  /** Primary role displayed as an icon over the crew shape. */
  readonly crewClass: CrewClass;
  health: number;
  readonly maxHealth: number;
  /** Current skill levels (0–2 each). Modified as XP thresholds are crossed. */
  skills: CrewSkills;
  /** Accumulated XP per skill — used to level up skills over time. */
  xp: CrewXP;
}
