/**
 * A pacing trigger that determines when a StoryBeat fires.
 *
 *   JUMP_COUNT        — fires exactly on the N-th jump in the current sector.
 *   DISTANCE_TO_EXIT  — fires when the player is exactly N connected jumps from EXIT.
 *   RANDOM_MAP_INJECT — injected onto a random unvisited node during map generation.
 */
export type TriggerCondition =
  | { type: 'JUMP_COUNT';       jumps:    number }
  | { type: 'DISTANCE_TO_EXIT'; distance: number }
  | { type: 'RANDOM_MAP_INJECT' };

/** One story moment — an event injected into the game at a specific pacing point. */
export interface StoryBeat {
  /** ID of the event in events.json to inject when the condition is met. */
  eventId:   string;
  condition: TriggerCondition;
  /**
   * If set, this beat only fires when the player is in the given sector level.
   * Allows a single story arc to span multiple sectors.
   */
  sectorLevel?: number;
}

/** A story arc made up of one or more StoryBeats. Loaded from data/stories.json. */
export interface StoryTemplate {
  /** Unique story identifier (e.g. 'story_quarantine'). */
  id:    string;
  beats: StoryBeat[];
  /**
   * Optional introductory event fired once at the very start of a run
   * (sector 1, first jump) before any regular beats are checked.
   */
  introEvent?:  string;
  /**
   * Optional finale event that can be referenced by choice outcomes
   * at the end of the story arc.
   */
  finaleEvent?: string;
}
