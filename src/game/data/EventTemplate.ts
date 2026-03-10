import type { CrewRace }   from './CrewRace';
import type { SystemType } from './SystemType';

/** Resources granted to the player when an EventChoice is selected. */
export interface EventReward {
  scrap?:      number;
  fuel?:       number;
  missiles?:   number;
  hullRepair?: number;
  weaponId?:   string;
  crewMember?: boolean;
  loseCrewMember?: boolean;
  crewDamage?: number;
  systemDamage?: Record<string, number>;
  revealMap?: boolean;
  delayRebels?: number;
  fleetAdvancement?: number;
}

/**
 * Structured contextual requirement for an event choice (FTL-style "blue options").
 * All specified conditions must be satisfied simultaneously for the choice to appear.
 */
export interface ChoiceRequirement {
  /** Player must have all of these narrative flags set. */
  flags?: string[];
  /** Player must have the given system installed at or above minLevel. */
  system?: { type: SystemType; minLevel: number };
  /** Player must have at least one crew member of this race. */
  crewRace?: CrewRace;
  /** Player must meet all specified resource minimums. */
  resource?: {
    scrap?:      number;
    fuel?:       number;
    missiles?:   number;
    droneParts?: number;
  };
  /** Choice only visible when player hull is at or below this percentage (0–100). */
  maxHullPercent?: number;
}

/** A single selectable option in an EventTemplate. */
export interface EventChoice {
  /** Button label shown to the player. */
  text: string;
  /**
   * Legacy string-based requirement (e.g. 'crew:ENGI', 'system:CLOAKING:1').
   * Kept for backward compatibility with existing events.json entries.
   */
  requirementId?: string;
  /**
   * Structured contextual requirement (new blue-option system).
   * Takes precedence over requirementId for display-color decisions.
   */
  requirement?: ChoiceRequirement;
  /** If set, setting this narrative flag is recorded when this choice is made. */
  setFlag?: string;
  randomOutcomes?: { chance: number; nextEventId: string }[];
  nextEventId?: string;
  reward?: EventReward;
  triggerCombatWithShipId?: string;
  openStore?: boolean;
  /**
   * Dynamically places a future map marker when this choice is selected.
   * MapSystem assigns the nearest unvisited node at `jumpsAway` BFS hops
   * and overrides its event with `targetEventId` when the player jumps there.
   */
  addQuest?: {
    targetEventId: string;
    jumpsAway:     number;
    markerType:    'QUEST' | 'DISTRESS';
  };
}

/** A narrative encounter loaded from data/events.json. */
export interface EventTemplate {
  id:       string;
  text:     string;
  hazard?:  'SOLAR_FLARE' | 'ASTEROIDS' | 'ION_STORM';
  /**
   * Thematic type — controls the event modal border colour.
   *   HOSTILE / DISTRESS → red   |  FRIENDLY → green
   *   STORY / QUEST → cyan        |  NEUTRAL / undefined → default white
   */
  type?:    'HOSTILE' | 'NEUTRAL' | 'FRIENDLY' | 'STORY' | 'DISTRESS' | 'QUEST';
  choices:  EventChoice[];
}
