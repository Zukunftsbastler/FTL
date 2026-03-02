/** Resources granted to the player when an EventChoice is selected. */
export interface EventReward {
  scrap?:      number;
  fuel?:       number;
  missiles?:   number;
  hullRepair?: number;
  weaponId?:   string;
  /** If true, a generic random crew member joins the ship. */
  crewMember?: boolean;
  /** If true, a random player crew member is permanently destroyed. */
  loseCrewMember?: boolean;
  /** Apply hull-independent damage to a random player crew member's health. */
  crewDamage?: number;
  /**
   * Apply physical damage to named ship systems.
   * Keys are SystemType strings (e.g. "ENGINES"); values are damage amounts.
   */
  systemDamage?: Record<string, number>;
  /** If true, all unvisited map nodes are revealed (visited flag set). */
  revealMap?: boolean;
  /** Push the rebel fleet back by this many advance-steps. */
  delayRebels?: number;
  /** Advance the rebel fleet forward by this many extra steps. */
  fleetAdvancement?: number;
}

/** A single selectable option in an EventTemplate. */
export interface EventChoice {
  /** Button label shown to the player. */
  text: string;
  /** Optional requirement ID — choice is only shown if the player has this resource/crew/system. */
  requirementId?: string;
  /**
   * When present, choosing this option selects a random next event.
   * Chance values should sum to 1.0. Mutually exclusive with nextEventId.
   */
  randomOutcomes?: { chance: number; nextEventId: string }[];
  /** Chain to another event by ID when this choice is selected. */
  nextEventId?: string;
  /** Resources granted immediately on selection. */
  reward?: EventReward;
  /** If set, starts combat against the ship template with this ID. */
  triggerCombatWithShipId?: string;
  /** If true, transitions the game to the STORE state when selected. */
  openStore?: boolean;
}

/** A narrative encounter loaded from data/events.json. */
export interface EventTemplate {
  /** Unique string identifier (e.g. 'distress_beacon'). */
  id: string;
  /** The narrative prose displayed to the player. Supports multi-sentence paragraphs. */
  text: string;
  /** Optional environmental hazard active during this event. */
  hazard?: 'SOLAR_FLARE' | 'ASTEROIDS' | 'ION_STORM';
  choices: EventChoice[];
}
