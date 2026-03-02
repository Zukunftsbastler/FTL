import type { CrewRace } from './CrewRace';

/** Raw JSON entry describing a crew member who boards the ship at game start. */
export interface CrewTemplate {
  /** Display name shown in the UI. */
  name: string;
  race: CrewRace;
  /** The roomId of the room this crew member spawns in. Must match a room in the same ShipTemplate. */
  roomId: number;
}
