import type { CrewTemplate } from './CrewTemplate';
import type { DoorTemplate } from './DoorTemplate';
import type { RoomTemplate } from './RoomTemplate';
import type { SystemType } from './SystemType';

/** Raw JSON blueprint for a ship. Matches the schema in docs/api/DATA_SCHEMA.md exactly. */
export interface ShipTemplate {
  /** Unique identifier used to look up this template at runtime (e.g. 'kestrel_a'). */
  id: string;
  name: string;
  playable: boolean;

  /** Maximum hull hit points. Hull at 0 = game over. */
  maxHull: number;
  startingReactorPower: number;

  startingResources: {
    scrap: number;
    fuel: number;
    missiles: number;
    droneParts: number;
  };

  /** Physical layout of the ship interior expressed in grid tiles. */
  rooms: RoomTemplate[];

  /** Doors connecting adjacent rooms, or venting a room to space. */
  doors: DoorTemplate[];

  /** Systems installed on this ship and their starting upgrade levels. */
  systems: {
    type: SystemType;
    level: number;
  }[];

  /** Weapon template IDs equipped in the weapons bay at game start. */
  startingWeapons: string[];

  /** Crew members that board the ship at game start. */
  startingCrew: CrewTemplate[];
}
