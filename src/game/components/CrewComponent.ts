import type { Component } from '../../engine/Component';
import type { CrewRace } from '../data/CrewRace';

/** Marks an entity as a crew member and stores their vital statistics. */
export interface CrewComponent extends Component {
  readonly _type: 'Crew';
  readonly name: string;
  readonly race: CrewRace;
  health: number;
  readonly maxHealth: number;
}
