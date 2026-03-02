import type { CrewClass } from './CrewClass';
import type { CrewRace } from './CrewRace';

/** Skill levels for a crew member — each value is 0, 1, or 2. */
export interface CrewSkills {
  /** Boosts evasion when manning the PILOTING room. */
  piloting: number;
  /** Boosts evasion when manning the ENGINES room. */
  engineering: number;
  /** Boosts weapon charge speed when manning the WEAPONS room. */
  gunnery: number;
  /** Increases system repair rate. ENGI race doubles this. */
  repair: number;
  /** Future boarding / combat modifier. */
  combat: number;
}

/** Raw JSON entry describing a crew member who boards the ship at game start. */
export interface CrewTemplate {
  /** Display name shown in the UI. */
  name: string;
  race: CrewRace;
  /** Primary role — determines the visual icon drawn over the crew shape. */
  crewClass: CrewClass;
  /** Starting skill levels. */
  skills: CrewSkills;
  /** The roomId of the room this crew member spawns in. Must match a room in the same ShipTemplate. */
  roomId: number;
}
