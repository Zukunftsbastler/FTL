import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { SpriteComponent } from '../components/SpriteComponent';

/**
 * First ECS system. Queries the world for every entity that has both a PositionComponent
 * and a SpriteComponent, then draws each one via the Renderer.
 *
 * This system is read-only with respect to components — it never mutates game state.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    const entities = world.query(['Position', 'Sprite']);

    for (const entity of entities) {
      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      const sprite = world.getComponent<SpriteComponent>(entity, 'Sprite');

      // Both are guaranteed to exist because we queried for them, but we guard
      // defensively to avoid non-null assertions (`!`), which are forbidden by convention.
      if (pos === undefined || sprite === undefined) continue;

      this.renderer.drawSprite(sprite.assetId, pos.x, pos.y, sprite.width, sprite.height);
    }
  }
}
