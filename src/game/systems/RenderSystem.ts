import { TILE_SIZE } from '../constants';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { SpriteComponent } from '../components/SpriteComponent';

// ── Visual constants ──────────────────────────────────────────────────────────
const ROOM_FILL        = '#1a2033';  // dark navy — room interior
const ROOM_BORDER      = '#4a6fa5';  // muted blue — room walls
const LABEL_COLOR      = '#88aadd';  // soft blue-white — system label
const LABEL_FONT       = '11px monospace';

const CREW_RADIUS      = 10;         // pixels
const CREW_FILL        = '#44cc44';  // green — human crew body
const CREW_SELECT_RING = '#00ff66';  // bright green — selection outline
const CREW_SELECT_LW   = 2;         // selection ring line-width (px)

/**
 * ECS render system. Draws all visible entities onto the canvas in strict layer order:
 *   Layer 1 — Ship rooms  (filled rectangles + borders + system labels)
 *   Layer 2 — Crew        (coloured circles; selection ring if selected)
 *   Layer 3 — Sprites     (cursor and future projectiles/icons — topmost)
 *
 * Strictly read-only: never mutates any component data.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    this.drawRooms(world);
    this.drawCrew(world);
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

      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_FILL, true);
      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_BORDER, false);

      if (room.system !== undefined) {
        const cx = pos.x + pw / 2;
        const cy = pos.y + ph / 2 + 4;
        this.renderer.drawText(room.system, cx, cy, LABEL_FONT, LABEL_COLOR, 'center');
      }
    }
  }

  // ── Layer 2: crew ───────────────────────────────────────────────────────────

  private drawCrew(world: IWorld): void {
    const entities = world.query(['Crew', 'Selectable', 'Position']);

    for (const entity of entities) {
      const pos        = world.getComponent<PositionComponent>(entity, 'Position');
      const selectable = world.getComponent<SelectableComponent>(entity, 'Selectable');
      if (pos === undefined || selectable === undefined) continue;

      // Selection ring drawn first so the crew body renders on top of it.
      if (selectable.isSelected) {
        this.renderer.drawCircle(
          pos.x, pos.y,
          CREW_RADIUS + 4,
          CREW_SELECT_RING,
          false,
          CREW_SELECT_LW,
        );
      }

      this.renderer.drawCircle(pos.x, pos.y, CREW_RADIUS, CREW_FILL, true);
    }
  }

  // ── Layer 3: sprites ────────────────────────────────────────────────────────

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
