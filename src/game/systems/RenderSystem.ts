import { TILE_SIZE } from '../constants';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SpriteComponent } from '../components/SpriteComponent';

// ── Visual constants ──────────────────────────────────────────────────────────
const ROOM_FILL   = '#1a2033';  // dark navy — the room interior
const ROOM_BORDER = '#4a6fa5';  // muted blue — room walls / grid lines
const LABEL_COLOR = '#88aadd';  // soft blue-white — system name text
const LABEL_FONT  = '11px monospace';

/**
 * ECS render system. Draws all visible entities onto the canvas in layer order:
 *   Layer 1 — Ship rooms  (filled rectangles with borders and system labels)
 *   Layer 2 — Sprites     (cursor, crew, projectiles, etc.)
 *
 * This system is strictly read-only — it never mutates component data.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    this.drawRooms(world);
    this.drawSprites(world);
  }

  // ── Layer 1: rooms ──────────────────────────────────────────────────────────

  private drawRooms(world: IWorld): void {
    const entities = world.query(['Room', 'Position']);

    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const pw = room.width  * TILE_SIZE;
      const ph = room.height * TILE_SIZE;

      // Filled background.
      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_FILL, true);

      // Crisp 1-pixel border drawn as a stroke (filled=false).
      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_BORDER, false);

      // System label centred inside the room (if one is installed).
      if (room.system !== undefined) {
        const cx = pos.x + pw / 2;
        // +4 px vertical nudge compensates for canvas font baseline offset.
        const cy = pos.y + ph / 2 + 4;
        this.renderer.drawText(room.system, cx, cy, LABEL_FONT, LABEL_COLOR, 'center');
      }
    }
  }

  // ── Layer 2: sprites ────────────────────────────────────────────────────────

  private drawSprites(world: IWorld): void {
    const entities = world.query(['Position', 'Sprite']);

    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const sprite = world.getComponent<SpriteComponent>(entity, 'Sprite');
      if (pos === undefined || sprite === undefined) continue;

      this.renderer.drawSprite(sprite.assetId, pos.x, pos.y, sprite.width, sprite.height);
    }
  }
}
