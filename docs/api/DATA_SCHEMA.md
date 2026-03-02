# DATA_SCHEMA.md: Data-Driven Game Content

## 1. Document Purpose
**To the AI Assistant:** This document defines the TypeScript interfaces for the raw JSON data files located in the `/data` directory. You must **never** hardcode ship layouts, weapon stats, or narrative events into the game logic. 
All game content must be parsed from JSON files matching these interfaces. The engine's job is to read this data and translate it into Entities and Components.

## 2. Weapons Schema (`data/weapons.json`)
Defines all equippable weapons in the game.

```typescript
type WeaponType = 'LASER' | 'MISSILE' | 'BEAM' | 'ION';

interface WeaponTemplate {
  /** Unique identifier (e.g., "burst_laser_2") */
  id: string;
  name: string;
  type: WeaponType;
  
  /** Reactor power required to equip and charge this weapon */
  powerCost: number;
  
  /** Time in seconds required to fire */
  cooldown: number;
  
  /** Number of projectiles fired per cooldown (e.g., 3 for Burst Laser II) */
  projectiles: number;
  
  damage: {
    hull: number;     // Damage applied to ship health
    system: number;   // Damage applied to system capacity
    ion: number;      // Ion damage (temporarily disables power)
    crew: number;     // Damage applied directly to crew in the target room
  };
  
  /** Chance to start a fire in the target room (0.0 to 1.0) */
  fireChance: number;
  /** Chance to cause a hull breach (0.0 to 1.0) */
  breachChance: number;
  
  /** Resource required to fire (e.g., 1 for Missiles, 0 for Lasers) */
  missileCost: number;
}
```

## 3. Ship Blueprint Schema (data/ships.json)
Defines the layout, starting stats, and initial systems of a ship.

```typescript
type SystemType = 'SHIELDS' | 'ENGINES' | 'WEAPONS' | 'OXYGEN' | 'MEDBAY' | 'PILOTING' | 'SENSORS' | 'DOORS';

interface RoomTemplate {
  /** Unique ID for the room within this ship */
  roomId: number;
  /** Grid X coordinate (top-left) */
  x: number;
  /** Grid Y coordinate (top-left) */
  y: number;
  /** Width in tiles */
  width: number;
  /** Height in tiles */
  height: number;
  /** The system installed in this room (optional) */
  system?: SystemType;
}

interface ShipTemplate {
  id: string;
  name: string;
  playable: boolean;
  
  /** Base starting stats */
  maxHull: number;
  startingReactorPower: number;
  startingResources: {
    scrap: number;
    fuel: number;
    missiles: number;
    droneParts: number;
  };
  
  /** The physical layout of the ship's interior */
  rooms: RoomTemplate[];
  
  /** Doors connecting rooms or venting to space */
  doors: {
    roomA: number | 'SPACE';
    roomB: number | 'SPACE';
    /** Grid coordinates of the door itself */
    x: number;
    y: number;
    vertical: boolean; // True if the door separates left/right, false for top/bottom
  }[];
  
  /** Initial systems and their starting upgrade levels */
  systems: {
    type: SystemType;
    level: number;
  }[];
  
  /** Array of weapon IDs equipped at the start */
  startingWeapons: string[];
}
```

## 4. Event System Schema (data/events.json)
Defines the narrative encounters, player choices, and outcomes (The "Choose Your Own Adventure" aspect of FTL).

```typescript
interface EventReward {
  scrap?: number;
  fuel?: number;
  missiles?: number;
  hullRepair?: number;
  weaponId?: string;
  crewMember?: boolean; // If true, adds a generic crew member
}

interface EventChoice {
  text: string;
  /** If set, the player must have this system/item to see this choice (e.g., 'MEDBAY_LEVEL_2') */
  requirementId?: string; 
  /** The ID of the next event to load if this choice is selected */
  nextEventId?: string;
  /** Rewards granted immediately upon selecting this choice */
  reward?: EventReward;
  /** Triggers combat against a specific ship template ID */
  triggerCombatWithShipId?: string;
}

interface EventTemplate {
  id: string;
  /** The narrative text displayed to the player */
  text: string;
  /** If true, the environment is hostile (e.g., solar flare, asteroid field) */
  hazard?: 'SOLAR_FLARE' | 'ASTEROIDS' | 'ION_STORM';
  choices: EventChoice[];
}
```