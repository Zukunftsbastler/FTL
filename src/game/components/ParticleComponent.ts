/**
 * Data shape for a single particle in the ParticleSystem's internal pool.
 * Particles are NOT ECS entities — the system keeps its own lightweight array.
 */
export interface ParticleComponent {
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Remaining lifetime in seconds. */
  life: number;
  /** Total lifetime in seconds (used to compute fade alpha). */
  maxLife: number;
  /** CSS colour string. */
  color: string;
  /** Half-size of the square rendered for this particle (pixels). */
  size: number;
}
