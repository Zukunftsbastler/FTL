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

import type { PlanetTheme } from '../game/world/PlanetGenerator';
import type { SectorNode }  from '../game/data/SectorNode';

/** Mutable runtime data shared across systems. */
export const GameStateData: {
  cachedPlanet:         HTMLCanvasElement | null;
  sectorNumber:         number;
  planetTheme:          PlanetTheme | null;
  sectorTree:           SectorNode[];
  currentSectorNodeId:  number;
} = {
  cachedPlanet:         null,
  sectorNumber:         1,
  planetTheme:          null,
  sectorTree:           [],
  currentSectorNodeId:  0,
};
