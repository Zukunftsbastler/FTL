import { TILE_SIZE } from '../constants';
import { AssetLoader } from '../../utils/AssetLoader';
import {
  TargetingSystem,
  WEAPON_BOX_W,
  WEAPON_BOX_H,
  WEAPON_BOX_MARGIN,
  WEAPON_BOX_BOTTOM,
} from './TargetingSystem';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SpriteComponent } from '../components/SpriteComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';

// ── Visual constants ──────────────────────────────────────────────────────────
const ROOM_FILL        = '#1a2033';
const ROOM_BORDER      = '#4a6fa5';
const LABEL_COLOR      = '#88aadd';
const LABEL_FONT       = '11px monospace';
const POWER_FONT       = '10px monospace';
const POWER_COLOR      = '#ffdd44';
const REACTOR_HUD_FONT  = '13px monospace';
const REACTOR_HUD_COLOR = '#66eecc';

/** Maximum red-overlay opacity at 0% O2. */
const O2_OVERLAY_MAX_ALPHA = 0.75;

/** Thickness of the door marker rectangle drawn over room borders. */
const DOOR_THICK           = 5;
/** How many pixels of door extend to each side of the wall centre. */
const DOOR_HALF            = Math.floor(DOOR_THICK / 2);
const DOOR_OPEN_COLOR      = '#aaaaaa';  // light grey  — interior door, passable
const DOOR_CLOSED_COLOR    = '#dd5500';  // orange      — interior door, sealed
const AIRLOCK_OPEN_COLOR   = '#ff3333';  // bright red  — venting to space!
const AIRLOCK_CLOSED_COLOR = '#778899';  // steel grey  — sealed airlock

const CREW_RADIUS      = 10;
const CREW_FILL        = '#44cc44';
const CREW_SELECT_RING = '#00ff66';
const CREW_SELECT_LW   = 2;

// ── Hit flash ─────────────────────────────────────────────────────────────────
const HIT_FLASH_COLOR = 'rgba(255,255,255,0.6)';

// ── Targeting crosshair ───────────────────────────────────────────────────────
const CROSSHAIR_COLOR = '#ff3333';
const CROSSHAIR_LW    = 2;
const CROSSHAIR_GAP   = 6;
const CROSSHAIR_LEN   = 14;

// ── Weapon UI ─────────────────────────────────────────────────────────────────
const WEAPON_BOX_FILL         = '#0d1520';
const WEAPON_BOX_BORDER       = '#334455';
const WEAPON_BOX_SELECTED_COL = '#ffdd00';
const WEAPON_NAME_FONT        = '11px monospace';
const WEAPON_NAME_COLOR       = '#ccddff';
const WEAPON_CHARGE_FILL_COL  = '#33aaff';
const WEAPON_CHARGE_EMPTY_COL = '#223344';
const WEAPON_CHARGE_H         = 6;
const WEAPON_POWERED_COLOR    = '#44ee44';
const WEAPON_UNPOWERED_COLOR  = '#555566';
const WEAPON_UI_PAD           = 8;

// ── HUD constants ─────────────────────────────────────────────────────────────
const ENEMY_HULL_FONT  = '13px monospace';
const ENEMY_HULL_COLOR = '#ff6644';

/**
 * ECS render system. Strict layer order:
 *   Layer 1 — Rooms   (fill + border + O2 overlay + hit flash + system label + power bar)
 *   Layer 2 — Doors   (thin rect on shared wall; colour indicates open/closed/airlock)
 *   Layer 3 — Crew    (coloured circle + selection ring)
 *   Layer 4 — Targeting crosshairs (red crosshair over targeted enemy rooms)
 *   Layer 5 — Sprites (cursor — topmost)
 *   HUD     — Reactor power (above weapon strip, left), Enemy hull (above weapon strip, right),
 *             Weapon UI boxes (bottom strip), Tooltips (floating near cursor)
 *
 * Read-only: never mutates component data.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;
  private readonly targetingSystem: TargetingSystem;
  private readonly input: IInput;

  constructor(renderer: IRenderer, targetingSystem: TargetingSystem, input: IInput) {
    this.renderer        = renderer;
    this.targetingSystem = targetingSystem;
    this.input           = input;
  }

  update(world: IWorld): void {
    this.drawRooms(world);
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawTargetingCrosshairs(world);
    this.drawSprites(world);
    this.drawReactorHUD(world);
    this.drawEnemyHullHUD(world);
    this.drawWeaponUI(world);
    this.drawTooltips(world);
  }

  // ── Layer 1: rooms ──────────────────────────────────────────────────────────

  private drawRooms(world: IWorld): void {
    const flashSet = this.buildFlashSet(world);
    const entities = world.query(['Room', 'Position']);
    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const pw = room.width  * TILE_SIZE;
      const ph = room.height * TILE_SIZE;

      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_FILL, true);
      this.renderer.drawRect(pos.x, pos.y, pw, ph, ROOM_BORDER, false);

      // O2 overlay — semi-transparent red tint proportional to O2 depletion.
      const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
      if (oxygen !== undefined && oxygen.level < 100) {
        const alpha = ((100 - oxygen.level) / 100) * O2_OVERLAY_MAX_ALPHA;
        this.renderer.drawRect(pos.x, pos.y, pw, ph, `rgba(200,30,30,${alpha.toFixed(3)})`, true);
      }

      // Hit flash — white overlay for one frame when a weapon fires at this room.
      if (flashSet.has(entity)) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, HIT_FLASH_COLOR, true);
      }

      if (room.system !== undefined) {
        this.renderer.drawText(
          room.system,
          pos.x + pw / 2,
          pos.y + ph / 2,
          LABEL_FONT,
          LABEL_COLOR,
          'center',
        );

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
    const empty  = ' '.repeat(Math.max(0, max - current));
    return `[${filled}${empty}]`;
  }

  /** Returns the set of room entity IDs that should flash white this frame. */
  private buildFlashSet(world: IWorld): Set<number> {
    const flashSet = new Set<number>();
    const entities = world.query(['Weapon']);
    for (const entity of entities) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon?.hitFlash === true && weapon.targetRoomEntity !== undefined) {
        flashSet.add(weapon.targetRoomEntity);
      }
    }
    return flashSet;
  }

  // ── Layer 2: doors ──────────────────────────────────────────────────────────

  private drawDoors(world: IWorld): void {
    const entities = world.query(['Door', 'Position']);
    for (const entity of entities) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const door = world.getComponent<DoorComponent>(entity, 'Door');
      if (pos === undefined || door === undefined) continue;

      const isAirlock = door.roomA === 'SPACE' || door.roomB === 'SPACE';
      const color = isAirlock
        ? (door.isOpen ? AIRLOCK_OPEN_COLOR : AIRLOCK_CLOSED_COLOR)
        : (door.isOpen ? DOOR_OPEN_COLOR    : DOOR_CLOSED_COLOR);

      if (door.isVertical) {
        this.renderer.drawRect(pos.x - DOOR_HALF, pos.y,  DOOR_THICK, TILE_SIZE, color, true);
      } else {
        this.renderer.drawRect(pos.x, pos.y - DOOR_HALF, TILE_SIZE, DOOR_THICK, color, true);
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

  // ── Layer 4: targeting crosshairs ───────────────────────────────────────────

  private drawTargetingCrosshairs(world: IWorld): void {
    const entities = world.query(['Weapon']);
    for (const entity of entities) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon?.targetRoomEntity === undefined) continue;

      const pos  = world.getComponent<PositionComponent>(weapon.targetRoomEntity, 'Position');
      const room = world.getComponent<RoomComponent>(weapon.targetRoomEntity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const cx = Math.round(pos.x + (room.width  * TILE_SIZE) / 2);
      const cy = Math.round(pos.y + (room.height * TILE_SIZE) / 2);
      this.drawCrosshair(cx, cy);
    }
  }

  /** Draws a 4-armed crosshair centred at (cx, cy). */
  private drawCrosshair(cx: number, cy: number): void {
    const g = CROSSHAIR_GAP;
    const l = CROSSHAIR_LEN;
    const w = CROSSHAIR_LW;
    const h = Math.floor(w / 2);
    // top arm
    this.renderer.drawRect(cx - h, cy - g - l, w, l, CROSSHAIR_COLOR, true);
    // bottom arm
    this.renderer.drawRect(cx - h, cy + g,     w, l, CROSSHAIR_COLOR, true);
    // left arm
    this.renderer.drawRect(cx - g - l, cy - h, l, w, CROSSHAIR_COLOR, true);
    // right arm
    this.renderer.drawRect(cx + g,     cy - h, l, w, CROSSHAIR_COLOR, true);
  }

  // ── Layer 5: sprites ────────────────────────────────────────────────────────

  private drawSprites(world: IWorld): void {
    const entities = world.query(['Position', 'Sprite']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const sprite = world.getComponent<SpriteComponent>(entity, 'Sprite');
      if (pos === undefined || sprite === undefined) continue;

      this.renderer.drawSprite(sprite.assetId, pos.x, pos.y, sprite.width, sprite.height);
    }
  }

  // ── HUD: player reactor (above weapon strip, left) ────────────────────────

  private drawReactorHUD(world: IWorld): void {
    const entities = world.query(['Ship', 'Faction', 'Reactor']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const reactor = world.getComponent<ReactorComponent>(entity, 'Reactor');
      if (reactor === undefined) return;

      const { height } = this.renderer.getCanvasSize();
      const hudY = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM - 5;
      const text = `REACTOR: ${reactor.currentPower} / ${reactor.totalPower}`;
      this.renderer.drawText(text, 12, hudY, REACTOR_HUD_FONT, REACTOR_HUD_COLOR, 'left');
      return;
    }
  }

  // ── HUD: enemy hull (above weapon strip, right) ───────────────────────────

  private drawEnemyHullHUD(world: IWorld): void {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) return;

      const { width, height } = this.renderer.getCanvasSize();
      const hudY = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM - 5;
      const text = `ENEMY HULL: ${ship.currentHull} / ${ship.maxHull}`;
      this.renderer.drawText(text, width - 12, hudY, ENEMY_HULL_FONT, ENEMY_HULL_COLOR, 'right');
      return;
    }
  }

  // ── HUD: weapon UI boxes (bottom strip) ───────────────────────────────────

  private drawWeaponUI(world: IWorld): void {
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    if (playerWeapons.length === 0) return;

    const { height }     = this.renderer.getCanvasSize();
    const boxBaseY       = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    const selectedEntity = this.targetingSystem.getSelectedWeaponEntity();
    const chargeBarY     = boxBaseY + WEAPON_BOX_H - WEAPON_UI_PAD - WEAPON_CHARGE_H;
    const chargeBarW     = WEAPON_BOX_W - WEAPON_UI_PAD * 2;

    for (let i = 0; i < playerWeapons.length; i++) {
      const [entity, weapon] = playerWeapons[i];
      const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      const by = boxBaseY;

      // Box background.
      this.renderer.drawRect(bx, by, WEAPON_BOX_W, WEAPON_BOX_H, WEAPON_BOX_FILL, true);

      // Box border — yellow when this weapon is selected for targeting.
      const borderColor = entity === selectedEntity ? WEAPON_BOX_SELECTED_COL : WEAPON_BOX_BORDER;
      this.renderer.drawRect(bx, by, WEAPON_BOX_W, WEAPON_BOX_H, borderColor, false);

      // Weapon name.
      const name = this.getWeaponName(weapon.templateId);
      this.renderer.drawText(name, bx + WEAPON_UI_PAD, by + 16, WEAPON_NAME_FONT, WEAPON_NAME_COLOR, 'left');

      // Power dots — green if powered, grey if not.
      const powColor = weapon.isPowered ? WEAPON_POWERED_COLOR : WEAPON_UNPOWERED_COLOR;
      const dots = '●'.repeat(weapon.powerRequired);
      this.renderer.drawText(dots, bx + WEAPON_UI_PAD, by + 32, WEAPON_NAME_FONT, powColor, 'left');

      // Charge bar (empty background then filled portion).
      this.renderer.drawRect(bx + WEAPON_UI_PAD, chargeBarY, chargeBarW, WEAPON_CHARGE_H, WEAPON_CHARGE_EMPTY_COL, true);
      if (weapon.maxCharge > 0) {
        const fillW = Math.round((weapon.charge / weapon.maxCharge) * chargeBarW);
        if (fillW > 0) {
          this.renderer.drawRect(bx + WEAPON_UI_PAD, chargeBarY, fillW, WEAPON_CHARGE_H, WEAPON_CHARGE_FILL_COL, true);
        }
      }
    }
  }

  // ── HUD: contextual tooltips (topmost — always above other elements) ───────

  private drawTooltips(world: IWorld): void {
    const mouse = this.input.getMousePosition();
    const { height } = this.renderer.getCanvasSize();

    // 1. Check weapon UI boxes (bottom strip) first — more specific.
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    const boxBaseY = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    for (let i = 0; i < playerWeapons.length; i++) {
      const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      if (
        mouse.x >= bx && mouse.x <= bx + WEAPON_BOX_W &&
        mouse.y >= boxBaseY && mouse.y <= boxBaseY + WEAPON_BOX_H
      ) {
        this.renderer.drawTooltip(mouse.x, mouse.y, 'Click to select, then click enemy room to target');
        return;
      }
    }

    // 2. Check player system rooms.
    const playerShipEntity = this.findPlayerShipEntity(world);
    if (playerShipEntity === null) return;

    const entities = world.query(['Room', 'System', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;

      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const right  = pos.x + room.width  * TILE_SIZE;
      const bottom = pos.y + room.height * TILE_SIZE;
      if (mouse.x >= pos.x && mouse.x < right && mouse.y >= pos.y && mouse.y < bottom) {
        this.renderer.drawTooltip(mouse.x, mouse.y, 'UP / DOWN to route power');
        return;
      }
    }
  }

  private findPlayerShipEntity(world: IWorld): number | null {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') return entity;
    }
    return null;
  }

  /** Looks up the display name for a weapon template; falls back to the raw templateId. */
  private getWeaponName(templateId: string): string {
    const templates = AssetLoader.getJSON<WeaponTemplate[]>('weapons');
    const tpl       = templates?.find((t) => t.id === templateId);
    return tpl?.name ?? templateId;
  }
}
