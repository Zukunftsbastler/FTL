import type { Component } from '../../engine/Component';

/** Tracks the live state of an in-progress explosion animation. */
export interface ExplosionComponent extends Component {
  readonly _type: 'Explosion';
  /** Seconds elapsed since this explosion was spawned. */
  age: number;
  /** Seconds until the explosion is fully dissolved and the entity is destroyed. */
  readonly maxAge: number;
  /** Visual type key used to look up the cached spritesheet ('LASER', 'MISSILE', etc.). */
  readonly type: string;
  /** Physical size of the explosion on screen in pixels (width = height). */
  readonly size: number;
  /** Total number of animation frames in the spritesheet. */
  readonly frameCount: number;
  /** Number of frame columns in the spritesheet grid. */
  readonly columns: number;
}
