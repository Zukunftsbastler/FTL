import { TILE_SIZE } from '../constants';
import { AssetLoader } from '../../utils/AssetLoader';
import {
  TargetingSystem,
  WEAPON_BOX_W,
  WEAPON_BOX_H,
  WEAPON_BOX_MARGIN,
  WEAPON_BOX_BOTTOM,
} from './TargetingSystem';
import { ProjectileSystem } from './ProjectileSystem';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { DoorComponent } from '../components/DoorComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SpriteComponent } from '../components/SpriteComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { WeaponTemplate } from '../data/WeaponTemplate';

// ── Room / door constants ─────────────────────────────────────────────────────
const ROOM_FILL        = '#1a2033';
const ROOM_BORDER      = '#4a6fa5';
const LABEL_COLOR      = '#88aadd';
const LABEL_FONT       = '11px monospace';
const POWER_FONT       = '10px monospace';
const POWER_COLOR      = '#ffdd44';

/** Maximum red-overlay opacity at 0% O2. */
const O2_OVERLAY_MAX_ALPHA = 0.75;

const DOOR_THICK           = 5;
const DOOR_HALF            = Math.floor(DOOR_THICK / 2);
const DOOR_OPEN_COLOR      = '#aaaaaa';
const DOOR_CLOSED_COLOR    = '#dd5500';
const AIRLOCK_OPEN_COLOR   = '#ff3333';
const AIRLOCK_CLOSED_COLOR = '#778899';

// ── Crew constants ────────────────────────────────────────────────────────────
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

// ── Projectile rendering ──────────────────────────────────────────────────────
const PROJ_PLAYER_COLOR = '#44aaff';  // blue laser (player)
const PROJ_ENEMY_COLOR  = '#ff4422';  // red laser  (enemy)
const PROJ_LINE_WIDTH   = 3;
const PROJ_TAIL_LEN     = 22;         // pixels behind current position

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

// ── Dashboard constants ───────────────────────────────────────────────────────
const DASH_FONT   = '13px monospace';
const DASH_X      = 12;    // left margin for player dashboard
const DASH_Y0     = 24;    // first line baseline
const DASH_LINE_H = 20;    // spacing between dashboard lines

const DIVIDER_COLOR = '#1c2e44';
const DIVIDER_W     = 2;

/**
 * ECS render system. Strict layer order:
 *   Layer 0 — Center divider
 *   Layer 1 — Rooms   (fill + border + O2 overlay + hit flash + system label + power bar)
 *   Layer 2 — Doors
 *   Layer 3 — Crew
 *   Layer 4 — Projectiles (traveling laser bolts)
 *   Layer 5 — Targeting crosshairs
 *   Layer 6 — Sprites (cursor — topmost)
 *   HUD     — Player dashboard (top-left), Enemy dashboard (top-right),
 *             Weapon UI boxes (bottom strip), Tooltips (floating near cursor)
 *
 * Read-only: never mutates component data.
 */
export class RenderSystem {
  private readonly renderer: IRenderer;
  private readonly targetingSystem: TargetingSystem;
  private readonly input: IInput;
  private readonly projectileSystem: ProjectileSystem;

  constructor(
    renderer: IRenderer,
    targetingSystem: TargetingSystem,
    input: IInput,
    projectileSystem: ProjectileSystem,
  ) {
    this.renderer         = renderer;
    this.targetingSystem  = targetingSystem;
    this.input            = input;
    this.projectileSystem = projectileSystem;
  }

  update(world: IWorld): void {
    this.drawCenterDivider();
    this.drawRooms(world);
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawProjectiles(world);
    this.drawTargetingCrosshairs(world);
    this.drawSprites(world);
    this.drawPlayerDashboard(world);
    this.drawEnemyDashboard(world);
    this.drawWeaponUI(world);
    this.drawTooltips(world);
  }

  // ── Layer 0: center divider ──────────────────────────────────────────────

  private drawCenterDivider(): void {
    const { width, height } = this.renderer.getCanvasSize();
    this.renderer.drawLine(
      Math.round(width / 2), 0,
      Math.round(width / 2), height,
      DIVIDER_COLOR, DIVIDER_W,
    );
  }

  // ── Layer 1: rooms ──────────────────────────────────────────────────────────

  private drawRooms(world: IWorld): void {
    const flashSet = this.projectileSystem.getImpactedRooms();
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

      // Impact flash — white overlay on the exact frame a projectile hits.
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

  // ── Layer 4: projectiles ─────────────────────────────────────────────────

  private drawProjectiles(world: IWorld): void {
    const entities = world.query(['Projectile', 'Position']);
    for (const entity of entities) {
      const proj = world.getComponent<ProjectileComponent>(entity, 'Projectile');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (proj === undefined || pos === undefined) continue;

      const dx = proj.targetX - pos.x;
      const dy = proj.targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;  // at target — will be destroyed this frame by ProjectileSystem

      const nx = dx / dist;
      const ny = dy / dist;

      // Draw a tail trailing behind the current position.
      const tailX = pos.x - nx * PROJ_TAIL_LEN;
      const tailY = pos.y - ny * PROJ_TAIL_LEN;
      const color = proj.isEnemyOrigin ? PROJ_ENEMY_COLOR : PROJ_PLAYER_COLOR;
      this.renderer.drawLine(tailX, tailY, pos.x, pos.y, color, PROJ_LINE_WIDTH);
    }
  }

  // ── Layer 5: targeting crosshairs ───────────────────────────────────────────

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
    this.renderer.drawRect(cx - h, cy - g - l, w, l, CROSSHAIR_COLOR, true);
    this.renderer.drawRect(cx - h, cy + g,     w, l, CROSSHAIR_COLOR, true);
    this.renderer.drawRect(cx - g - l, cy - h, l, w, CROSSHAIR_COLOR, true);
    this.renderer.drawRect(cx + g,     cy - h, l, w, CROSSHAIR_COLOR, true);
  }

  // ── Layer 6: sprites ────────────────────────────────────────────────────────

  private drawSprites(world: IWorld): void {
    const entities = world.query(['Position', 'Sprite']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const sprite = world.getComponent<SpriteComponent>(entity, 'Sprite');
      if (pos === undefined || sprite === undefined) continue;

      this.renderer.drawSprite(sprite.assetId, pos.x, pos.y, sprite.width, sprite.height);
    }
  }

  // ── HUD: player dashboard (top-left) ────────────────────────────────────

  private drawPlayerDashboard(world: IWorld): void {
    const entities = world.query(['Ship', 'Faction', 'Reactor']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship    = world.getComponent<ShipComponent>(entity, 'Ship');
      const reactor = world.getComponent<ReactorComponent>(entity, 'Reactor');
      if (ship === undefined || reactor === undefined) return;

      this.renderer.drawText(
        `HULL:    ${ship.currentHull} / ${ship.maxHull}`,
        DASH_X, DASH_Y0, DASH_FONT, '#44ff44', 'left',
      );
      this.renderer.drawText(
        `REACTOR: ${reactor.currentPower} / ${reactor.totalPower}`,
        DASH_X, DASH_Y0 + DASH_LINE_H, DASH_FONT, '#66eecc', 'left',
      );
      this.renderer.drawText(
        `FUEL:    ${ship.fuel}`,
        DASH_X, DASH_Y0 + DASH_LINE_H * 2, DASH_FONT, '#ffaa44', 'left',
      );
      return;
    }
  }

  // ── HUD: enemy dashboard (top-right) ────────────────────────────────────

  private drawEnemyDashboard(world: IWorld): void {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) return;

      const { width } = this.renderer.getCanvasSize();
      this.renderer.drawText(
        `HULL: ${ship.currentHull} / ${ship.maxHull}`,
        width - DASH_X, DASH_Y0, DASH_FONT, '#ff6644', 'right',
      );
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

      this.renderer.drawRect(bx, by, WEAPON_BOX_W, WEAPON_BOX_H, WEAPON_BOX_FILL, true);

      const borderColor = entity === selectedEntity ? WEAPON_BOX_SELECTED_COL : WEAPON_BOX_BORDER;
      this.renderer.drawRect(bx, by, WEAPON_BOX_W, WEAPON_BOX_H, borderColor, false);

      const name = this.getWeaponName(weapon.templateId);
      this.renderer.drawText(name, bx + WEAPON_UI_PAD, by + 16, WEAPON_NAME_FONT, WEAPON_NAME_COLOR, 'left');

      const powColor = weapon.isPowered ? WEAPON_POWERED_COLOR : WEAPON_UNPOWERED_COLOR;
      const dots = '●'.repeat(weapon.powerRequired);
      this.renderer.drawText(dots, bx + WEAPON_UI_PAD, by + 32, WEAPON_NAME_FONT, powColor, 'left');

      this.renderer.drawRect(bx + WEAPON_UI_PAD, chargeBarY, chargeBarW, WEAPON_CHARGE_H, WEAPON_CHARGE_EMPTY_COL, true);
      if (weapon.maxCharge > 0) {
        const fillW = Math.round((weapon.charge / weapon.maxCharge) * chargeBarW);
        if (fillW > 0) {
          this.renderer.drawRect(bx + WEAPON_UI_PAD, chargeBarY, fillW, WEAPON_CHARGE_H, WEAPON_CHARGE_FILL_COL, true);
        }
      }
    }
  }

  // ── HUD: contextual tooltips ──────────────────────────────────────────────

  private drawTooltips(world: IWorld): void {
    const mouse = this.input.getMousePosition();
    const { height } = this.renderer.getCanvasSize();

    // 1. Weapon UI boxes (bottom strip) — most specific.
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

    // 2. Player system rooms.
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
