/** Player-selected run difficulty. */
export type Difficulty = 'EASY' | 'NORMAL' | 'HARD';

/** The top-level game screens. main.ts switches between them. */
export type GameState =
  | 'HANGAR'
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
  /** Player-chosen difficulty for the current run. Set in the Hangar. */
  difficulty:             Difficulty;
  /**
   * Immediate-mode UI anchor registry. Systems write their bounding boxes here
   * each render frame so TutorialSystem can spotlight specific elements.
   * Keys are semantic IDs (e.g. 'reactor', 'weapons', 'systems', 'fleet').
   */
  uiAnchors: Record<string, { x: number; y: number; w: number; h: number }>;
  /** Template ID of the ship the player is currently flying (e.g. 'kestrel_a'). */
  playerShipTemplateId:   string;
  /** Whether in-game tutorial pop-ups are enabled. Toggleable in the Hangar. */
  tutorialEnabled:        boolean;
  /** IDs of tutorial modals already shown this session — prevents repetition. */
  seenTutorials:          Set<string>;
  /**
   * When true the Tutorial Director is displaying a modal overlay.
   * The game loop produces dt = 0 so all simulation freezes until dismissed.
   */
  tutorialActive:         boolean;
  /**
   * Tutorial: ID of the first weapon received as loot this run.
   * Set once when a weaponId reward is first applied.  Null until that happens.
   */
  tutorialFirstLootWeaponId:     string | null;
  /**
   * Tutorial: weapon template ID that was most recently equipped from cargo.
   * Consumed by `enterCombat` to spotlight the new weapon in the next fight.
   */
  tutorialNewlyEquippedWeaponId: string | null;
  /**
   * Dynamic map markers placed by event choices via `addQuest`.
   * `nodeId = null` means MapSystem has not yet assigned a node (resolved lazily).
   */
  activeQuests: Array<{
    nodeId:     number | null;
    eventId:    string;
    markerType: 'QUEST' | 'DISTRESS';
    jumpsAway:  number;
  }>;
} = {
  cachedPlanet:           null,
  sectorNumber:           1,
  planetTheme:            null,
  sectorTree:             [],
  currentSectorNodeId:    0,
  currentStore:           null,
  narrativeFlags:         [],
  jumpsInCurrentSector:   0,
  currentStoryId:         null, // set to a random story ID in main.ts after assets load
  difficulty:             'NORMAL' as Difficulty,
  uiAnchors:              {},
  playerShipTemplateId:   '',
  tutorialEnabled:        true,
  seenTutorials:          new Set<string>(),
  tutorialActive:         false,
  tutorialFirstLootWeaponId:     null,
  tutorialNewlyEquippedWeaponId: null,
  distanceToExit:         99,
  activeQuests:           [],
};
