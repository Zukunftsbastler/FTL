/** The top-level game screens. main.ts switches between them. */
export type GameState =
  | 'STAR_MAP'
  | 'SECTOR_MAP_SELECTION'
  | 'COMBAT'
  | 'VICTORY'
  | 'GAME_OVER'
  | 'UPGRADE'
  | 'STORE'
  | 'EVENT';

import type { PlanetTheme }    from '../game/world/PlanetGenerator';
import type { SectorNode }     from '../game/data/SectorNode';
import type { StoreInventory } from '../game/data/StoreInventory';

/** Mutable runtime data shared across systems. */
export const GameStateData: {
  cachedPlanet:           HTMLCanvasElement | null;
  sectorNumber:           number;
  planetTheme:            PlanetTheme | null;
  sectorTree:             SectorNode[];
  currentSectorNodeId:    number;
  /** Persistent store inventory for the current store node. Null outside a store. */
  currentStore:           StoreInventory | null;
  /**
   * Narrative flags set during this run (e.g. story-beat seen-markers, player choices).
   * Used by the Narrative Director and EventSystem blue-option requirements.
   */
  narrativeFlags:         string[];
  /** Number of jumps completed in the current sector. Reset at each sector start. */
  jumpsInCurrentSector:   number;
  /**
   * ID of the currently active story arc (matches `StoryTemplate.id`).
   * The Narrative Director uses this to focus on the correct story's beats.
   * Null disables story injection.
   */
  currentStoryId:         string | null;
  /**
   * BFS hop-count from the current map node to the EXIT node.
   * Updated after every jump by MapSystem. Used by DISTANCE_TO_EXIT beats.
   * 99 = unreachable / unknown.
   */
  distanceToExit:         number;
} = {
  cachedPlanet:           null,
  sectorNumber:           1,
  planetTheme:            null,
  sectorTree:             [],
  currentSectorNodeId:    0,
  currentStore:           null,
  narrativeFlags:         [],
  jumpsInCurrentSector:   0,
  currentStoryId:         'story_quarantine',
  distanceToExit:         99,
};
