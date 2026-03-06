/** The top-level game screens. main.ts switches between them. */
export type GameState = 'STAR_MAP' | 'COMBAT' | 'VICTORY' | 'GAME_OVER' | 'UPGRADE' | 'STORE' | 'EVENT';

/** Mutable runtime data shared across systems. */
export const GameStateData: { cachedPlanet: HTMLCanvasElement | null } = {
  cachedPlanet: null,
};
