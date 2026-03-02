import { TILE_SIZE } from '../constants';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { SpriteComponent } from '../components/SpriteComponent';
import type { SystemComponent } from '../components/SystemComponent';

// ── Visual constants ──────────────────────────────────────────────────────────
const ROOM_FILL        = '#1a2033';
const ROOM_BORDER      = '#4a6fa5';
const LABEL_COLOR      = '#88aadd';
const LABEL_FONT       = '11px monospace';
const POWER_FONT       = '10px monospace';
const POWER_COLOR      = '#ffdd44';  // yellow pips
const REACTOR_HUD_FONT = '13px monospace';
const REACTOR_HUD_COLOR = '#66eecc';

/** Thickness of the door marker rectangle drawn over room borders. */
const DOOR_THICK       = 5;
/** How many pixels of door extend to each side of the wall centre. */
const DOOR_HALF        = Math.floor(DOOR_THICK / 2);
const DOOR_COLOR       = '#aaaaaa';  // light grey — distinguishable from room borders

const CREW_RADIUS      = 10;
const CREW_FILL        = '#44cc44';
const CREW_SELECT_RING = '#00ff66';
const CREW_SELECT_LW   = 2;

/**
 * ECS render system. Strict layer order:
 *   Layer 1 — Rooms   (fill + border + system label + power bar)
 *   Layer 2 — Doors   (thin rect on shared wall; SPACE-vent doors omitted)
 *   Layer 3 — Crew    (coloured circle + selection ring)
 *   Layer 4 — Sprites (cursor — topmost)
 *   HUD     — Reactor power display (bottom-left corner)
 *
 * Read-only: never mutates component data.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    this.drawRooms(world);
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawSprites(world);
    this.drawReactorHUD(world);
  }

  // ── Layer 1: rooms ──────────────────────────────────────────────────────────

  private drawRooms(world: IWorld): void {
    const entities = world.query(['Room', 'Position']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const pw = room.width  * TILE_SIZE;
      const ph = room.height * TILE_SIZE;

      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_FILL, true);
      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_BORDER, false);

      if (room.system !== undefined) {
        this.renderer.drawText(
          room.system,
          pos.x + pw / 2,
          pos.y + ph / 2,
          LABEL_FONT,
          LABEL_COLOR,
          'center',
        );

        // Draw power bar if this room has an active system component.
        const system = world.getComponent<SystemComponent>(entity, 'System');
        if (system !== undefined) {
          const bar = this.buildPowerBar(system.currentPower, system.maxCapacity);
          this.renderer.drawText(
            bar,
            pos.x + pw / 2,
            pos.y + ph / 2 + 13,
            POWER_FONT,
            POWER_COLOR,
            'center',
          );
        }
      }
    }
  }

  /** Builds a text string like `[||  ]` for 2 / 4. */
  private buildPowerBar(current: number, max: number): string {
    const filled = '|'.repeat(current);
    const empty  = ' '.repeat(max - current);
    return `[${filled}${empty}]`;
  }

  // ── Layer 2: doors ──────────────────────────────────────────────────────────

  private drawDoors(world: IWorld): void {
    const entities = world.query(['Door', 'Position']);
    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const door = world.getComponent<DoorComponent>(entity, 'Door');
      if (pos === undefined || door === undefined) continue;

      // Skip airlock / space-vent doors — they sit outside the ship boundary.
      if (door.roomA === 'SPACE' || door.roomB === 'SPACE') continue;

      if (door.isVertical) {
        // Door is on a vertical wall (separating left/right rooms).
        // pos.x = pixel column boundary; span one tile downward.
        this.renderer.drawRect(
          pos.x - DOOR_HALF,
          pos.y,
          DOOR_THICK,
          TILE_SIZE,
          DOOR_COLOR,
          true,
        );
      } else {
        // Door is on a horizontal wall (separating top/bottom rooms).
        // pos.y = pixel row boundary; span one tile rightward.
        this.renderer.drawRect(
          pos.x,
          pos.y - DOOR_HALF,
          TILE_SIZE,
          DOOR_THICK,
          DOOR_COLOR,
          true,
        );
      }
    }
  }

  // ── Layer 3: crew ───────────────────────────────────────────────────────────

  private drawCrew(world: IWorld): void {
    const entities = world.query(['Crew', 'Selectable', 'Position']);
    for (const entity of entities) {
      const pos        = world.getComponent<PositionComponent>(entity, 'Position');
      const selectable = world.getComponent<SelectableComponent>(entity, 'Selectable');
      if (pos === undefined || selectable === undefined) continue;

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

  // ── Layer 4: sprites ────────────────────────────────────────────────────────

  private drawSprites(world: IWorld): void {
    const entities = world.query(['Position', 'Sprite']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const sprite = world.getComponent<SpriteComponent>(entity, 'Sprite');
      if (pos === undefined || sprite === undefined) continue;

      this.renderer.drawSprite(sprite.assetId, pos.x, pos.y, sprite.width, sprite.height);
    }
  }

  // ── HUD: reactor power display (bottom-left) ─────────────────────────────

  private drawReactorHUD(world: IWorld): void {
    const reactorEntities = world.query(['Reactor']);
    if (reactorEntities.length === 0) return;
    const reactor = world.getComponent<ReactorComponent>(reactorEntities[0], 'Reactor');
    if (reactor === undefined) return;

    const { height } = this.renderer.getCanvasSize();
    const text = `REACTOR: ${reactor.currentPower} / ${reactor.totalPower}`;
    this.renderer.drawText(text, 12, height - 12, REACTOR_HUD_FONT, REACTOR_HUD_COLOR, 'left');
  }
}
