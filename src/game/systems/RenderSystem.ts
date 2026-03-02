import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { AssetLoader } from '../../utils/AssetLoader';
import { xpThresholdFor } from '../logic/CrewXP';
import {
  TargetingSystem,
  WEAPON_BOX_W,
  WEAPON_BOX_H,
  WEAPON_BOX_MARGIN,
  WEAPON_BOX_BOTTOM,
} from './TargetingSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { CombatSystem } from './CombatSystem';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { CloakComponent } from '../components/CloakComponent';
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
import type { CrewComponent } from '../components/CrewComponent';
import type { ShieldComponent } from '../components/ShieldComponent';
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
const CREW_SELECT_RING = '#ffffff';
const CREW_SELECT_LW   = 2;

/** Fill colour indexed by race. */
const CREW_RACE_COLOR: Record<string, string> = {
  HUMAN:   '#4488ff',
  ENGI:    '#aaaaaa',
  MANTIS:  '#44cc44',
  ROCKMAN: '#cc7733',
  ZOLTAN:  '#eecc00',
  SLUG:    '#9944cc',
};

/** Single-letter icon for each class, drawn centred inside the crew shape. */
const CREW_CLASS_ICON: Record<string, string> = {
  PILOT:    'P',
  ENGINEER: 'E',
  GUNNER:   'G',
  SECURITY: 'S',
};

// ── Crew skill-sheet panel constants ─────────────────────────────────────────
const PANEL_X        = 12;
const PANEL_Y        = 130;  // moved down to clear 5-line player dashboard
const PANEL_W        = 196;
const PANEL_H        = 170;
const PANEL_BG       = 'rgba(8,14,28,0.92)';
const PANEL_BORDER   = '#334466';
const PANEL_TITLE_F  = '12px monospace';
const PANEL_TEXT_F   = '11px monospace';
const PANEL_TEXT_COL = '#aabbcc';
const PANEL_VAL_COL  = '#eef';
const SKILL_BAR_FULL = '●';
const SKILL_BAR_EMPTY = '○';

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

// ── Cloak constants ───────────────────────────────────────────────────────────
const CLOAK_OVERLAY  = 'rgba(80,180,255,0.28)';
/** Beam weapon display color constants (player / enemy). */
const BEAM_LW        = 3;

// ── Shield constants ──────────────────────────────────────────────────────────
/** How many pixels of padding beyond the ship bounding box the shield ellipse uses. */
const SHIELD_PAD_X  = 22;
const SHIELD_PAD_Y  = 16;
const SHIELD_COLOR  = 'rgba(80,160,255,0.22)';
const SHIELD_STROKE = 'rgba(120,200,255,0.70)';
const SHIELD_LW     = 2;
const SHIELD_FLASH  = 'rgba(200,230,255,0.60)';
/** Duration (seconds) the shield flashes brighter after absorbing a hit. */
const SHIELD_FLASH_DURATION = 0.20;

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
  /** Injected after construction so there is no circular dependency at init time. */
  private combatSystem: CombatSystem | null = null;

  /** Maps ship entity → remaining flash timer (seconds) for shield-hit flashes. */
  private readonly shieldFlashTimers = new Map<number, number>();

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

  /** Provides access to CombatSystem beam displays. Call once after construction. */
  setCombatSystem(cs: CombatSystem): void {
    this.combatSystem = cs;
  }

  update(world: IWorld): void {
    this.updateShieldFlashTimers(world);
    this.drawCenterDivider();
    this.drawRooms(world);
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawProjectiles(world);
    this.drawBeams();
    this.drawMissIndicators();
    this.drawTargetingCrosshairs(world);
    this.drawShields(world);
    this.drawSprites(world);
    this.drawPlayerDashboard(world);
    this.drawEnemyDashboard(world);
    this.drawCloakHUD(world);
    this.drawCrewSkillSheet(world);
    this.drawWeaponUI(world);
    this.drawTooltips(world);
  }

  // ── Shield flash timer management ────────────────────────────────────────

  private updateShieldFlashTimers(world: IWorld): void {
    void world; // signature kept for clarity; no ECS query needed here

    const dt = Time.deltaTime;

    // Tick down existing timers.
    for (const [entity, remaining] of this.shieldFlashTimers) {
      const next = remaining - dt;
      if (next <= 0) {
        this.shieldFlashTimers.delete(entity);
      } else {
        this.shieldFlashTimers.set(entity, next);
      }
    }

    // Start (or reset) flash for ships hit by a projectile this frame.
    for (const shipEntity of this.projectileSystem.getShieldHitShips()) {
      this.shieldFlashTimers.set(shipEntity, SHIELD_FLASH_DURATION);
    }
  }

  // ── Shield bubbles ────────────────────────────────────────────────────────

  private drawShields(world: IWorld): void {
    const shipEntities = world.query(['Ship', 'Shield']);
    for (const shipEntity of shipEntities) {
      const shield = world.getComponent<ShieldComponent>(shipEntity, 'Shield');
      if (shield === undefined || Math.floor(shield.currentLayers) < 1) continue;

      // Compute bounding box from all rooms owned by this ship.
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      const roomEntities = world.query(['Room', 'Position', 'Owner']);
      for (const re of roomEntities) {
        const owner = world.getComponent<OwnerComponent>(re, 'Owner');
        if (owner?.shipEntity !== shipEntity) continue;
        const pos  = world.getComponent<PositionComponent>(re, 'Position');
        const room = world.getComponent<RoomComponent>(re, 'Room');
        if (pos === undefined || room === undefined) continue;
        minX = Math.min(minX, pos.x);
        minY = Math.min(minY, pos.y);
        maxX = Math.max(maxX, pos.x + room.width  * TILE_SIZE);
        maxY = Math.max(maxY, pos.y + room.height * TILE_SIZE);
      }
      if (!isFinite(minX)) continue;

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const rx = (maxX - minX) / 2 + SHIELD_PAD_X;
      const ry = (maxY - minY) / 2 + SHIELD_PAD_Y;

      const isFlashing = this.shieldFlashTimers.has(shipEntity);

      // Fill layer (semi-transparent).
      this.renderer.drawEllipse(cx, cy, rx, ry, isFlashing ? SHIELD_FLASH : SHIELD_COLOR, true);
      // Stroke border.
      this.renderer.drawEllipse(cx, cy, rx, ry, SHIELD_STROKE, false, SHIELD_LW);

      // Draw one ring per active layer beyond the first.
      const layers = Math.floor(shield.currentLayers);
      for (let l = 1; l < layers; l++) {
        const extra = l * 8;
        this.renderer.drawEllipse(cx, cy, rx + extra, ry + extra, SHIELD_STROKE, false, SHIELD_LW);
      }
    }
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

    // Pre-build a set of cloaked ship entities for O(1) lookup per room.
    const cloakedShips = new Set<number>();
    for (const shipEntity of world.query(['Cloak'])) {
      const cloak = world.getComponent<CloakComponent>(shipEntity, 'Cloak');
      if (cloak?.isActive === true) cloakedShips.add(shipEntity);
    }

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

          // Damage indicator — orange tint overlay when damageAmount > 0.
          if (system.damageAmount > 0) {
            const dmgAlpha = Math.min(0.5, system.damageAmount * 0.15);
            this.renderer.drawRect(
              pos.x, pos.y, pw, ph,
              `rgba(255,120,0,${dmgAlpha.toFixed(3)})`,
              true,
            );
          }
        }
      }

      // Cloak overlay — blue tint on all rooms of cloaked ships.
      const roomOwner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (roomOwner !== undefined && cloakedShips.has(roomOwner.shipEntity)) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, CLOAK_OVERLAY, true);
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
      const crew       = world.getComponent<CrewComponent>(entity, 'Crew');
      if (pos === undefined || selectable === undefined || crew === undefined) continue;

      const color = CREW_RACE_COLOR[crew.race] ?? '#44cc44';
      const icon  = CREW_CLASS_ICON[crew.crewClass] ?? '?';

      // Selection ring.
      if (selectable.isSelected) {
        this.renderer.drawCircle(
          pos.x, pos.y,
          CREW_RADIUS + 4,
          CREW_SELECT_RING,
          false,
          CREW_SELECT_LW,
        );
      }

      // Shape by race.
      if (crew.race === 'ENGI') {
        // Grey square.
        const half = CREW_RADIUS;
        this.renderer.drawRect(pos.x - half, pos.y - half, half * 2, half * 2, color, true);
      } else if (crew.race === 'MANTIS') {
        // Green upward-pointing triangle.
        const r = CREW_RADIUS;
        this.renderer.drawPolygon([
          { x: pos.x,         y: pos.y - r },
          { x: pos.x + r,     y: pos.y + r },
          { x: pos.x - r,     y: pos.y + r },
        ], color, true);
      } else {
        // Circle for all other races.
        this.renderer.drawCircle(pos.x, pos.y, CREW_RADIUS, color, true);
      }

      // Class icon centred on the shape.
      this.renderer.drawText(icon, pos.x, pos.y + 4, '9px monospace', '#000000', 'center');
    }
  }

  // ── Beam displays ────────────────────────────────────────────────────────────

  private drawBeams(): void {
    if (this.combatSystem === null) return;
    for (const beam of this.combatSystem.getBeamDisplays()) {
      this.renderer.drawLine(beam.x1, beam.y1, beam.x2, beam.y2, beam.color, BEAM_LW);
    }
  }

  // ── Miss indicators ─────────────────────────────────────────────────────────

  private drawMissIndicators(): void {
    for (const mp of this.projectileSystem.getMissDisplays()) {
      this.renderer.drawText('MISS', mp.x, mp.y - 14, '13px monospace', '#ff4444', 'center');
      // Small cross-out lines for visual flair.
      this.renderer.drawLine(mp.x - 16, mp.y - 4, mp.x + 16, mp.y + 4, '#ff4444', 1);
    }
  }

  // ── Cloak HUD (status line below player dashboard) ───────────────────────────

  private drawCloakHUD(world: IWorld): void {
    for (const shipEntity of world.query(['Ship', 'Faction', 'Cloak'])) {
      const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const cloak = world.getComponent<CloakComponent>(shipEntity, 'Cloak');
      if (cloak === undefined) continue;

      let label: string;
      let color: string;
      if (cloak.isActive) {
        label = `CLOAK: ACTIVE (${cloak.durationTimer.toFixed(1)}s)`;
        color = '#44ddff';
      } else if (cloak.cooldownTimer > 0) {
        label = `CLOAK: cooldown (${cloak.cooldownTimer.toFixed(1)}s)`;
        color = '#556677';
      } else {
        label = 'CLOAK: ready  [C]';
        color = '#88bbcc';
      }

      this.renderer.drawText(label, DASH_X, DASH_Y0 + DASH_LINE_H * 5, DASH_FONT, color, 'left');
      return;
    }
  }

  // ── Crew skill-sheet panel ──────────────────────────────────────────────────

  private drawCrewSkillSheet(world: IWorld): void {
    const entities = world.query(['Crew', 'Selectable']);
    for (const entity of entities) {
      const selectable = world.getComponent<SelectableComponent>(entity, 'Selectable');
      if (selectable?.isSelected !== true) continue;

      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      if (crew === undefined) continue;

      const x  = PANEL_X;
      const y  = PANEL_Y;
      const w  = PANEL_W;
      const h  = PANEL_H;
      const px = x + 8;

      // Background + border.
      this.renderer.drawRect(x, y, w, h, PANEL_BG, true);
      this.renderer.drawRect(x, y, w, h, PANEL_BORDER, false);

      // Name + class.
      this.renderer.drawText(
        `${crew.name}  [${crew.crewClass}]`,
        px, y + 18, PANEL_TITLE_F, PANEL_VAL_COL, 'left',
      );

      // Race.
      this.renderer.drawText(
        `Race: ${crew.race}`,
        px, y + 34, PANEL_TEXT_F, PANEL_TEXT_COL, 'left',
      );

      // HP bar.
      const hpFrac  = Math.max(0, crew.health / crew.maxHealth);
      const barW    = w - 16;
      const barH    = 6;
      const barY    = y + 44;
      this.renderer.drawRect(px, barY, barW, barH, '#223344', true);
      if (hpFrac > 0) {
        const col = hpFrac > 0.5 ? '#44ee44' : hpFrac > 0.25 ? '#eeaa00' : '#ee3333';
        this.renderer.drawRect(px, barY, Math.round(barW * hpFrac), barH, col, true);
      }
      this.renderer.drawText(
        `HP ${Math.round(crew.health)}/${crew.maxHealth}`,
        px, y + 63, PANEL_TEXT_F, PANEL_TEXT_COL, 'left',
      );

      // Divider.
      this.renderer.drawLine(x + 4, y + 70, x + w - 4, y + 70, PANEL_BORDER, 1);

      // Skills.
      const skills: Array<[string, keyof typeof crew.skills]> = [
        ['Piloting',    'piloting'],
        ['Engineering', 'engineering'],
        ['Gunnery',     'gunnery'],
        ['Repair',      'repair'],
        ['Combat',      'combat'],
      ];

      let sy = y + 85;
      for (const [label, key] of skills) {
        const level     = crew.skills[key];
        const xp        = crew.xp[key];
        const threshold = xpThresholdFor(level);
        const dots      = SKILL_BAR_FULL.repeat(level) + SKILL_BAR_EMPTY.repeat(2 - level);
        const xpSuffix  = threshold > 0 ? ` (${xp}/${threshold})` : '';
        this.renderer.drawText(
          `${label.padEnd(11)} ${dots}${xpSuffix}`,
          px, sy, PANEL_TEXT_F, PANEL_TEXT_COL, 'left',
        );
        sy += 15;
      }

      return; // only draw for the first (should be only) selected crew
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
      this.renderer.drawText(
        `SCRAP:   ${ship.scrap}`,
        DASH_X, DASH_Y0 + DASH_LINE_H * 3, DASH_FONT, '#ddbb44', 'left',
      );
      this.renderer.drawText(
        `MISSILES:${ship.missiles}`,
        DASH_X, DASH_Y0 + DASH_LINE_H * 4, DASH_FONT, '#ff8844', 'left',
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

      // Power toggle indicator — small square top-right corner of each box.
      const piqSize = 10;
      const piqX = bx + WEAPON_BOX_W - WEAPON_UI_PAD - piqSize;
      const piqY = by + WEAPON_UI_PAD;
      const piqColor = weapon.userPowered ? WEAPON_POWERED_COLOR : '#442222';
      this.renderer.drawRect(piqX, piqY, piqSize, piqSize, piqColor, true);
      this.renderer.drawRect(piqX, piqY, piqSize, piqSize, weapon.userPowered ? '#aaffaa' : '#664444', false);

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
        this.renderer.drawTooltip(mouse.x, mouse.y, 'Left-click to target | Right-click to toggle power');
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
