import type { Component } from '../../engine/Component';

/** Describes the visual representation of an entity. Read-only at runtime — swap assetId to change sprite. */
export interface SpriteComponent extends Component {
  readonly _type: 'Sprite';
  /** ID of a pre-loaded image in the AssetLoader registry. */
  assetId: string;
  /** Render width in pixels. */
  width: number;
  /** Render height in pixels. */
  height: number;
}
