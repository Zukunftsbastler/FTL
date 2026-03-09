/**
 * A pacing trigger that determines when a StoryBeat fires.
 *
 *   JUMP_COUNT        — fires exactly on the N-th jump in the current sector.
 *   DISTANCE_TO_EXIT  — fires when the player is N connected jumps from the EXIT node.
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
}

/** A story arc made up of one or more StoryBeats. Loaded from data/stories.json. */
export interface StoryTemplate {
  /** Unique story identifier (e.g. 'federation_distress'). */
  id:    string;
  beats: StoryBeat[];
}
