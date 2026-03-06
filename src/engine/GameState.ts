/** The top-level game screens. main.ts switches between them. */
export type GameState = 'STAR_MAP' | 'COMBAT' | 'VICTORY' | 'GAME_OVER' | 'UPGRADE' | 'STORE' | 'EVENT';

import type { PlanetTheme } from '../game/world/PlanetGenerator';

/** Mutable runtime data shared across systems. */
export const GameStateData: {
  cachedPlanet:  HTMLCanvasElement | null;
  sectorNumber:  number;
  planetTheme:   PlanetTheme | null;
} = {
  cachedPlanet:  null,
  sectorNumber:  1,
  planetTheme:   null,
};
