import { getExplosionSheet, EXPLOSION_FRAME_SIZE } from '../vfx/ExplosionGenerator';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { ExplosionComponent } from '../components/ExplosionComponent';
import type { PositionComponent } from '../components/PositionComponent';

/**
 * Draws each active explosion by sampling the correct frame from its cached
 * WebGL-generated spritesheet and blitting it centred on the explosion position.
 */
export class ExplosionRenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    const ctx = this.renderer.getContext();
    ctx.save();

    for (const entity of world.query(['Explosion', 'Position'])) {
      const explosion = world.getComponent<ExplosionComponent>(entity, 'Explosion');
      const pos       = world.getComponent<PositionComponent>(entity, 'Position');
      if (explosion === undefined || pos === undefined) continue;

      const sheet = getExplosionSheet(explosion.type);
      if (sheet === undefined) continue;

      // Select animation frame: clamp so we never exceed frameCount - 1.
      const frameIndex = Math.min(
        explosion.frameCount - 1,
        Math.floor((explosion.age / explosion.maxAge) * explosion.frameCount),
      );

      // Map 1D frame index → 2D grid position on the spritesheet.
      const col  = frameIndex % explosion.columns;
      const row  = Math.floor(frameIndex / explosion.columns);
      const srcX = col * EXPLOSION_FRAME_SIZE;
      const srcY = row * EXPLOSION_FRAME_SIZE;

      // Draw centred on the impact position, scaled to explosion.size.
      const half = explosion.size / 2;
      ctx.globalCompositeOperation = 'lighter';  // additive blend for glow effect
      ctx.drawImage(
        sheet,
        srcX, srcY, EXPLOSION_FRAME_SIZE, EXPLOSION_FRAME_SIZE,
        Math.round(pos.x - half), Math.round(pos.y - half),
        Math.round(explosion.size), Math.round(explosion.size),
      );
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}
