/** Public contract for the global Time system. All frame-rate-dependent logic must use this. */
export interface ITime {
  /** Time in seconds since the last frame (e.g. 0.016 for 60 fps). */
  readonly deltaTime: number;
  /** Total elapsed time in seconds since the game loop started. */
  readonly totalTime: number;
}
