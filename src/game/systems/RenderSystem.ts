import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { UIRenderer } from '../../engine/ui/UIRenderer';
import { LayoutEngine } from '../../engine/ui/LayoutEngine';
import { findComputedNodeById } from '../../engine/ui/UITypes';
import type { UINode, ComputedBounds, ComputedNode } from '../../engine/ui/UITypes';
import { AssetLoader } from '../../utils/AssetLoader';
import { xpThresholdFor } from '../logic/CrewXP';
import {
  TargetingSystem,
  WEAPON_BOX_W,
  WEAPON_BOX_H,
  WEAPON_BOX_MARGIN,
  WEAPON_BOX_BOTTOM,
} from './TargetingSystem';
import {
  PowerSystem,
  SYSPANEL_X,
  SYSPANEL_Y0,
  SYSPANEL_ROW_H,
  SYSPANEL_W,
  SYSPANEL_LABEL_W,
  SYSPANEL_PIP_W,
  SYSPANEL_PIP_H,
  SYSPANEL_PIP_GAP,
} from './PowerSystem';
import { ProjectileSystem } from './ProjectileSystem';
import { CombatSystem } from './CombatSystem';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { CloakComponent } from '../components/CloakComponent';
import type { DoorComponent } from '../components/DoorComponent';
import type { DroneComponent } from '../components/DroneComponent';
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

const DOOR_THICK           = 8;   // proportional to TILE_SIZE=55 (was 5 at TILE_SIZE=35)
const DOOR_HALF            = Math.floor(DOOR_THICK / 2);
const DOOR_OPEN_COLOR      = '#aaaaaa';
const DOOR_CLOSED_COLOR    = '#dd5500';
const AIRLOCK_OPEN_COLOR   = '#ff3333';
const AIRLOCK_CLOSED_COLOR = '#778899';

// ── Crew constants ────────────────────────────────────────────────────────────
const CREW_RADIUS      = 16;   // proportional to TILE_SIZE=55 (was 10 at TILE_SIZE=35)
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

// ── Cloak constants ───────────────────────────────────────────────────────────
const CLOAK_OVERLAY  = 'rgba(80,180,255,0.28)';
/** Beam weapon display color constants (player / enemy). */
const BEAM_LW        = 3;

// ── UI panel layout constants ─────────────────────────────────────────────────
/** Height of the top resource bar spanning the full canvas width. */
const TOP_BAR_H       = 50;
/** Border colour shared by all anchored UI panels (passed to UIRenderer). */
const UI_PANEL_BORDER = '#334455';
/** Width of the left pillar panel (crew roster + system power). */
const LEFT_PANEL_W    = 250;
/** Baseline Y for the "CREW" section header inside the left pillar. */
const ROSTER_HEADER_Y = TOP_BAR_H + 10;
/** Baseline Y for the first crew name row inside the left pillar. */
const ROSTER_Y0       = TOP_BAR_H + 22;
/** Vertical spacing (px) between consecutive crew rows in the roster. */
const ROSTER_ROW_H    = 14;
/** Height (px) of each HP bar in the crew roster. */
const ROSTER_BAR_H    = 5;
/** Width (px) of each HP bar in the crew roster. */
const ROSTER_BAR_W    = 220;

// ── Declarative Combat HUD layout tree ───────────────────────────────────────
/**
 * Single source of truth for the combat HUD panel layout.
 * Solved by LayoutEngine each frame; rendered by UIRenderer.renderTree.
 *
 * Structure:
 *   Column (full canvas)
 *     ├── Panel  — Top resource bar
 *     ├── Row    — Middle section
 *     │     ├── Panel   — Left pillar (crew + systems)
 *     │     └── Spacer  — Safe zone for ships
 *     └── Panel  — Bottom weapon strip
 */
const COMBAT_HUD: UINode = {
  type: 'Column',
  width: '100%',
  height: '100%',
  children: [
    {
      type:   'Row',
      id:     'top-bar',
      height: TOP_BAR_H,
      children: [
        {
          type:    'Panel',
          id:      'player-panel',
          width:   400,
          content: { chamfer: 8, borderColor: UI_PANEL_BORDER, alpha: 0.92 },
        },
        {
          type:     'Spacer',
          flexGrow: 1,
        },
        {
          type:    'Panel',
          id:      'enemy-panel',
          width:   300,
          content: { chamfer: 8, borderColor: UI_PANEL_BORDER, alpha: 0.92 },
        },
      ],
    },
    {
      type:     'Row',
      flexGrow: 1,
      children: [
        {
          type:  'Panel',
          id:    'left-pillar',
          width: LEFT_PANEL_W,
          content: { chamfer: 10, borderColor: UI_PANEL_BORDER, alpha: 0.92 },
        },
        {
          type:     'Spacer',
          id:       'safe-zone',
          flexGrow: 1,
        },
      ],
    },
    {
      type:   'Panel',
      id:     'bottom-bar',
      height: WEAPON_BOX_H + WEAPON_BOX_BOTTOM + 10,
      content: { chamfer: 8, borderColor: UI_PANEL_BORDER, alpha: 0.92 },
    },
  ],
};

// ── Procedural hull constants ─────────────────────────────────────────────────
const HULL_FILL        = '#2c303a';
const HULL_BORDER      = '#4a5060';

// ── Starfield constants ───────────────────────────────────────────────────────
const STAR_SPEED = 10; // pixels per second scrolling left

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
  /** Injected after construction for system panel drawing. */
  private powerSystem: PowerSystem | null = null;

  /** Maps ship entity → remaining flash timer (seconds) for shield-hit flashes. */
  private readonly shieldFlashTimers = new Map<number, number>();

  /** Parallax star field — initialized once, updated each frame. */
  private readonly stars: Array<{ x: number; y: number; size: number; opacity: number }>;

  /**
   * Computed bounds of the 'safe-zone' Spacer node from the last layout solve.
   * Updated every frame inside `update()`.  Null until the first frame.
   */
  private safeZoneBounds: ComputedBounds | null = null;

  /** Full layout solve result — stored so content methods can look up panel bounds. */
  private layoutResult: ComputedNode | null = null;

  /** Procedural background planet — drifts leftward at a very slow parallax rate. */
  private readonly planet: { x: number; y: number; radius: number; speed: number };

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

    // Seed the star field across the canvas area (approximate at construction time).
    const { width, height } = renderer.getCanvasSize();
    this.stars = Array.from({ length: 150 }, () => ({
      x:       Math.random() * width,
      y:       Math.random() * height,
      size:    Math.random() * 1.5 + 0.5,
      opacity: Math.random() * 0.6 + 0.2,
    }));

    // Seed the background planet — starts on the right side of the screen.
    this.planet = {
      x:      width  * (0.65 + Math.random() * 0.25),
      y:      height * (0.10 + Math.random() * 0.80),
      radius: 300 + Math.random() * 200,
      speed:  1.5,   // much slower than stars (STAR_SPEED = 10)
    };
  }

  /** Provides access to CombatSystem beam displays. Call once after construction. */
  setCombatSystem(cs: CombatSystem): void {
    this.combatSystem = cs;
  }

  /** Provides access to PowerSystem for system panel rendering. Call once after construction. */
  setPowerSystem(ps: PowerSystem): void {
    this.powerSystem = ps;
  }

  /**
   * Returns the latest computed bounds of the 'safe-zone' Spacer node.
   * Available after the first call to `update()`.  Returns null before that.
   */
  getSafeZoneBounds(): ComputedBounds | null {
    return this.safeZoneBounds;
  }

  update(world: IWorld): void {
    this.updateShieldFlashTimers(world);

    // ── Layout engine — solve the CombatHUD tree for this frame ─────────────
    const { width, height } = this.renderer.getCanvasSize();
    this.layoutResult = LayoutEngine.computeLayout(
      COMBAT_HUD,
      { x: 0, y: 0, w: width, h: height },
    );
    this.safeZoneBounds = findComputedNodeById(this.layoutResult, 'safe-zone')?.bounds ?? null;

    // ── Background layers (drawn behind everything) ──────────────────────────
    this.drawPlanet();
    this.drawStarfield();
    this.drawHulls(world);
    // ── Ship interior ────────────────────────────────────────────────────────
    this.drawRooms(world);
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawDrones(world);
    // ── Combat effects ───────────────────────────────────────────────────────
    this.drawProjectiles(world);
    this.drawBeams();
    this.drawMissIndicators();
    this.drawTargetingCrosshairs(world);
    this.drawShields(world);
    this.drawSprites(world);
    // ── HUD panel backgrounds (rendered declaratively from the layout tree) ──
    UIRenderer.renderTree(this.renderer.getContext(), this.layoutResult);
    // ── HUD content (rendered on top of the panel backgrounds) ───────────────
    this.drawTopBar(world);
    this.drawSystemPanel(world);
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

  // ── Procedural planet (deep background — drawn before the starfield) ────────

  private drawPlanet(): void {
    const dt = Time.deltaTime;
    const { width, height } = this.renderer.getCanvasSize();
    const ctx = this.renderer.getContext();

    // Drift the planet slowly left; wrap it back when fully off-screen.
    this.planet.x -= this.planet.speed * dt;
    if (this.planet.x + this.planet.radius < 0) {
      this.planet.x = width + this.planet.radius;
      this.planet.y = height * 0.10 + Math.random() * height * 0.80;
    }

    const { x, y, radius } = this.planet;

    // Radial gradient: bright rusty-orange highlight off-centre → transparent edge.
    const grad = ctx.createRadialGradient(
      x - radius * 0.30, y - radius * 0.30, radius * 0.05,
      x, y, radius,
    );
    grad.addColorStop(0, 'rgba(200,80,40,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');

    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
  }

  // ── Starfield (background layer) ────────────────────────────────────────────

  private drawStarfield(): void {
    const dt = Time.deltaTime;
    const { width, height } = this.renderer.getCanvasSize();

    for (const star of this.stars) {
      star.x -= STAR_SPEED * dt;
      if (star.x < -2) {
        // Wrap star back to the right edge with a fresh random Y.
        star.x = width + 2;
        star.y = Math.random() * height;
      }
      const alpha = star.opacity.toFixed(2);
      this.renderer.drawRect(
        Math.round(star.x), Math.round(star.y),
        Math.ceil(star.size), Math.ceil(star.size),
        `rgba(200,210,255,${alpha})`,
        true,
      );
    }
  }

  // ── Procedural ship hulls (delta-wing style) ─────────────────────────────────

  private drawHulls(world: IWorld): void {
    const ctx = this.renderer.getContext();

    for (const shipEntity of world.query(['Ship', 'Faction'])) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      for (const re of world.query(['Room', 'Position', 'Owner'])) {
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

      const faction  = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      const isPlayer = faction?.id === 'PLAYER';
      const midY     = (minY + maxY) / 2;

      ctx.beginPath();
      if (isPlayer) {
        // Player ship — nose points right.
        ctx.moveTo(maxX + 40,      midY);        // nose tip
        ctx.lineTo(maxX,           minY);        // top-right room corner
        ctx.lineTo(minX - 20,      minY - 30);   // top wing tip
        ctx.lineTo(minX,           midY);        // rear notch (centre-left)
        ctx.lineTo(minX - 20,      maxY + 30);   // bottom wing tip
        ctx.lineTo(maxX,           maxY);        // bottom-right room corner
      } else {
        // Enemy ship — nose points left.
        ctx.moveTo(minX - 40,      midY);        // nose tip
        ctx.lineTo(minX,           minY);        // top-left room corner
        ctx.lineTo(maxX + 20,      minY - 30);   // top wing tip
        ctx.lineTo(maxX,           midY);        // rear notch (centre-right)
        ctx.lineTo(maxX + 20,      maxY + 30);   // bottom wing tip
        ctx.lineTo(minX,           maxY);        // bottom-left room corner
      }
      ctx.closePath();

      ctx.fillStyle   = HULL_FILL;
      ctx.fill();
      ctx.strokeStyle = HULL_BORDER;
      ctx.lineWidth   = 2;
      ctx.stroke();
    }
  }

  // ── Top bar (player-panel left | spacer | enemy-panel right) ────────────────

  private drawTopBar(world: IWorld): void {
    const y = Math.round(TOP_BAR_H / 2) + 6; // text baseline centred in bar

    // ── Player resource stats — drawn inside the left 'player-panel' ──────
    const playerBounds = this.layoutResult !== null
      ? findComputedNodeById(this.layoutResult, 'player-panel')?.bounds
      : null;
    const px = (playerBounds?.x ?? 0) + 12;

    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) break;
      this.renderer.drawText(`HULL ${ship.currentHull}/${ship.maxHull}`, px,       y, DASH_FONT, '#44ff44', 'left');
      this.renderer.drawText(`FUEL ${ship.fuel}`,                        px + 148, y, DASH_FONT, '#ffaa44', 'left');
      this.renderer.drawText(`MISSILES ${ship.missiles}`,                px + 248, y, DASH_FONT, '#ff8844', 'left');
      this.renderer.drawText(`SCRAP ${ship.scrap}`,                      px + 355, y, DASH_FONT, '#ddbb44', 'left');
      break;
    }

    // ── Enemy hull — drawn centred inside the right 'enemy-panel' ─────────
    const enemyBounds = this.layoutResult !== null
      ? findComputedNodeById(this.layoutResult, 'enemy-panel')?.bounds
      : null;

    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship === undefined) break;
      const ex = enemyBounds !== null && enemyBounds !== undefined
        ? enemyBounds.x + enemyBounds.w / 2
        : this.renderer.getCanvasSize().width - 150;
      this.renderer.drawText(
        `ENEMY HULL ${ship.currentHull}/${ship.maxHull}`,
        ex, y, DASH_FONT, '#ff6644', 'center',
      );
      break;
    }
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

      // Fire overlay — pulsing orange-red tint when room is on fire.
      if (room.hasFire) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, 'rgba(255,80,0,0.40)', true);
      }

      // Breach overlay — cyan tint when room has a hull breach.
      if (room.hasBreach) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, 'rgba(0,200,255,0.30)', true);
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
    const entities = world.query(['Crew', 'Selectable', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      // Hide enemy crew until the Sensors subsystem is implemented.
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id === 'ENEMY') continue;

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

      // Draw cloak status centred in the top bar.
      const { width: cw } = this.renderer.getCanvasSize();
      this.renderer.drawText(label, cw / 2, Math.round(TOP_BAR_H / 2) + 6, DASH_FONT, color, 'center');
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

  // ── Layer 3.5: drones ──────────────────────────────────────────────────────

  private drawDrones(world: IWorld): void {
    const entities = world.query(['Drone', 'Position']);
    for (const entity of entities) {
      const drone = world.getComponent<DroneComponent>(entity, 'Drone');
      const pos   = world.getComponent<PositionComponent>(entity, 'Position');
      if (drone === undefined || pos === undefined) continue;

      // Color: player drones = cyan, enemy drones = orange.
      const color = drone.ownerFaction === 'PLAYER' ? '#00ffee' : '#ff8800';

      // Shape: diamond (rotated square) drawn as a 4-point polygon.
      const S = 8; // half-size
      const pts = [
        { x: pos.x,     y: pos.y - S },
        { x: pos.x + S, y: pos.y     },
        { x: pos.x,     y: pos.y + S },
        { x: pos.x - S, y: pos.y     },
      ];
      this.renderer.drawPolygon(pts, color, true);
      this.renderer.drawPolygon(pts, '#ffffff', false, 1);

      // Type initial in centre.
      const icon = drone.droneType === 'EXTERNAL_COMBAT'  ? 'C'
                 : drone.droneType === 'EXTERNAL_DEFENSE' ? 'D'
                 : drone.droneType === 'INTERNAL_SUPPORT' ? 'R'  // Repair
                 : drone.droneType === 'INTERNAL_COMBAT'  ? 'A'  // Anti-personnel
                 : 'B'; // Boarding
      this.renderer.drawText(icon, pos.x, pos.y + 4, '9px monospace', '#000000', 'center');
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

  // ── HUD: left pillar (crew roster + system power panel) ─────────────────

  private drawSystemPanel(world: IWorld): void {
    if (this.powerSystem === null) return;

    // Layout engine draws the left-pillar panel background; this method draws content only.

    // Find the player ship entity.
    let playerShipEntity: number | undefined;
    let reactor: ReactorComponent | undefined;
    for (const entity of world.query(['Ship', 'Faction', 'Reactor'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      playerShipEntity = entity;
      reactor = world.getComponent<ReactorComponent>(entity, 'Reactor');
      break;
    }
    if (playerShipEntity === undefined || reactor === undefined) return;

    // ── Crew roster ─────────────────────────────────────────────────────────
    this.renderer.drawText('CREW', SYSPANEL_X, ROSTER_HEADER_Y, '10px monospace', '#445566', 'left');

    let crewRow = 0;
    for (const entity of world.query(['Crew', 'Owner'])) {
      if (crewRow >= 5) break;
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      if (crew === undefined) continue;

      const ry = ROSTER_Y0 + crewRow * ROSTER_ROW_H;
      const nameColor = CREW_RACE_COLOR[crew.race] ?? '#aaaaaa';
      this.renderer.drawText(
        `${crew.name} [${crew.crewClass[0]}]`,
        SYSPANEL_X, ry, '11px monospace', nameColor, 'left',
      );

      // HP bar.
      const hpFrac  = Math.max(0, crew.health / crew.maxHealth);
      const barY    = ry + 2;
      this.renderer.drawRect(SYSPANEL_X, barY, ROSTER_BAR_W, ROSTER_BAR_H, '#1a2233', true);
      if (hpFrac > 0) {
        const hpCol = hpFrac > 0.5 ? '#44cc44' : hpFrac > 0.25 ? '#ccaa00' : '#cc3333';
        this.renderer.drawRect(SYSPANEL_X, barY, Math.round(ROSTER_BAR_W * hpFrac), ROSTER_BAR_H, hpCol, true);
      }

      crewRow++;
    }

    // Separator between crew roster and system panel.
    this.renderer.drawLine(SYSPANEL_X, SYSPANEL_Y0 - 14, SYSPANEL_X + SYSPANEL_W, SYSPANEL_Y0 - 14, UI_PANEL_BORDER, 1);

    const systems = this.powerSystem.getPlayerSystems(world, playerShipEntity);
    const mouse   = this.input.getMousePosition();

    // Panel header.
    this.renderer.drawText(
      'SYSTEMS  [LMB +] [RMB -]',
      SYSPANEL_X, SYSPANEL_Y0 - 6, '10px monospace', '#445566', 'left',
    );

    for (let i = 0; i < systems.length; i++) {
      const sys  = systems[i];
      const rowY = SYSPANEL_Y0 + i * SYSPANEL_ROW_H;
      const rowBottom = rowY + SYSPANEL_ROW_H;

      // Hover highlight.
      const hovered =
        mouse.x >= SYSPANEL_X && mouse.x <= SYSPANEL_X + SYSPANEL_W &&
        mouse.y >= rowY && mouse.y < rowBottom;
      if (hovered) {
        this.renderer.drawRect(SYSPANEL_X, rowY, SYSPANEL_W, SYSPANEL_ROW_H - 1, 'rgba(80,120,200,0.18)', true);
      }

      // System name.
      const nameColor = sys.currentPower > 0 ? '#aaccff' : '#446688';
      this.renderer.drawText(
        sys.type.slice(0, 9), // truncate to fit
        SYSPANEL_X + 3, rowY + 14, '11px monospace', nameColor, 'left',
      );

      // Power pips — green=powered, yellow=zoltan, red=damaged, dark=empty.
      const pipStartX    = SYSPANEL_X + SYSPANEL_LABEL_W;
      const damagedSlots = Math.min(Math.round(sys.damageAmount), sys.maxCapacity);
      for (let p = 0; p < sys.maxCapacity; p++) {
        const px      = pipStartX + p * (SYSPANEL_PIP_W + SYSPANEL_PIP_GAP);
        const py      = rowY + (SYSPANEL_ROW_H - SYSPANEL_PIP_H) / 2;
        const filled  = p < sys.currentPower;
        const zoltan  = !filled && p < sys.currentPower + sys.zoltanBonus;
        const damaged = !filled && !zoltan && p >= sys.maxCapacity - damagedSlots;
        const bgColor     = filled ? '#39ff14' : zoltan ? '#eecc00' : damaged ? '#ee3333' : '#1a1d24';
        const borderColor = filled ? '#88ffaa' : zoltan ? '#ffee66' : damaged ? '#ff7777' : '#4c5866';
        this.renderer.drawRect(px, py, SYSPANEL_PIP_W, SYSPANEL_PIP_H, bgColor, true);
        this.renderer.drawRect(px, py, SYSPANEL_PIP_W, SYSPANEL_PIP_H, borderColor, false);
      }
    }
  }

  // ── HUD: weapon UI boxes (bottom strip with panel background) ────────────

  private drawWeaponUI(world: IWorld): void {
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    if (playerWeapons.length === 0) return;

    const { height } = this.renderer.getCanvasSize();
    const boxBaseY   = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;

    // Layout engine draws the bottom-bar panel background; this method draws weapon boxes only.
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

    // 1. Weapon UI boxes (bottom strip) — rich weapon card.
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    const boxBaseY = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    for (let i = 0; i < playerWeapons.length; i++) {
      const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      if (
        mouse.x >= bx && mouse.x <= bx + WEAPON_BOX_W &&
        mouse.y >= boxBaseY && mouse.y <= boxBaseY + WEAPON_BOX_H
      ) {
        const [, weapon] = playerWeapons[i];
        const card = this.buildWeaponCard(weapon);
        if (card !== null) {
          this.renderer.drawTooltipCard(mouse.x, mouse.y, card.title, card.lines);
        }
        return;
      }
    }

    // 2. System power panel rows — rich system card.
    if (this.powerSystem !== null) {
      const playerShipEntity = this.findPlayerShipEntity(world);
      if (playerShipEntity !== null) {
        const systems = this.powerSystem.getPlayerSystems(world, playerShipEntity);
        for (let i = 0; i < systems.length; i++) {
          const rowY = SYSPANEL_Y0 + i * SYSPANEL_ROW_H;
          if (
            mouse.x >= SYSPANEL_X && mouse.x <= SYSPANEL_X + SYSPANEL_W &&
            mouse.y >= rowY && mouse.y < rowY + SYSPANEL_ROW_H
          ) {
            const sys = systems[i];
            this.renderer.drawTooltipCard(
              mouse.x, mouse.y,
              sys.type,
              this.buildSystemLines(sys),
            );
            return;
          }
        }
      }
    }

    // 3. Crew hover — rich crew card (pixel-distance detection).
    for (const entity of world.query(['Crew', 'Position'])) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      if (pos === undefined || crew === undefined) continue;
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      if (dx * dx + dy * dy <= 14 * 14) {
        const hpPct = Math.round(crew.health / crew.maxHealth * 100);
        this.renderer.drawTooltipCard(
          mouse.x, mouse.y,
          `${crew.name}  [${crew.crewClass}]`,
          [
            `Race:        ${crew.race}`,
            `HP:          ${Math.round(crew.health)}/${crew.maxHealth} (${hpPct}%)`,
            `Piloting:    ${crew.skills.piloting}`,
            `Engineering: ${crew.skills.engineering}`,
            `Gunnery:     ${crew.skills.gunnery}`,
            `Repair:      ${crew.skills.repair}`,
            `Combat:      ${crew.skills.combat}`,
          ],
        );
        return;
      }
    }

    // 4. Player system rooms (on-ship hover) — system card.
    const playerShipEntity2 = this.findPlayerShipEntity(world);
    if (playerShipEntity2 === null) return;
    const entities = world.query(['Room', 'System', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity2) continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      const sys  = world.getComponent<SystemComponent>(entity, 'System');
      if (pos === undefined || room === undefined || sys === undefined) continue;
      const right  = pos.x + room.width  * TILE_SIZE;
      const bottom = pos.y + room.height * TILE_SIZE;
      if (mouse.x >= pos.x && mouse.x < right && mouse.y >= pos.y && mouse.y < bottom) {
        this.renderer.drawTooltipCard(
          mouse.x, mouse.y,
          sys.type,
          this.buildSystemLines(sys),
        );
        return;
      }
    }
  }

  /** Builds lines for a weapon tooltip card from its template. Returns null if template not found. */
  private buildWeaponCard(weapon: WeaponComponent): { title: string; lines: string[] } | null {
    const templates = AssetLoader.getJSON<WeaponTemplate[]>('weapons');
    const tpl       = templates?.find((t) => t.id === weapon.templateId);
    if (tpl === undefined) return null;

    const lines: string[] = [
      `Power Required: ${tpl.powerCost}`,
      `Charge Time:    ${tpl.cooldown.toFixed(1)}s`,
      `Damage (Hull):  ${tpl.damage.hull}`,
      `Damage (Sys):   ${tpl.damage.system}`,
    ];
    if (tpl.damage.ion > 0)    lines.push(`Ion Damage:     ${tpl.damage.ion}`);
    if (tpl.damage.crew > 0)   lines.push(`Crew Damage:    ${tpl.damage.crew}`);
    if (tpl.neverMisses) {
      lines.push('Accuracy:       Never Misses');
    } else {
      lines.push(`Accuracy:       ${Math.round(tpl.accuracy * 100)}%`);
    }
    if (tpl.missileCost > 0)   lines.push(`Missile Cost:   ${tpl.missileCost}`);
    if (tpl.fireChance > 0)    lines.push(`Fire Chance:    ${Math.round(tpl.fireChance * 100)}%`);
    if (tpl.breachChance > 0)  lines.push(`Breach Chance:  ${Math.round(tpl.breachChance * 100)}%`);
    const status = weapon.userPowered
      ? (weapon.isPowered ? `Charged: ${Math.round(weapon.charge / weapon.maxCharge * 100)}%` : 'Charging...')
      : 'UNPOWERED';
    lines.push(`Status:         ${status}`);
    return { title: tpl.name, lines };
  }

  /** Builds detail lines for a system tooltip card. */
  private buildSystemLines(sys: SystemComponent): string[] {
    const lines: string[] = [
      `Power:  ${sys.currentPower} / ${sys.maxCapacity}`,
    ];
    if (sys.damageAmount > 0) {
      lines.push(`Damage: ${sys.damageAmount.toFixed(0)} (needs repair)`);
    }
    switch (sys.type) {
      case 'SHIELDS':      lines.push('Generates shield layers that absorb shots.'); break;
      case 'ENGINES':      lines.push('Provides evasion to dodge enemy fire.'); break;
      case 'WEAPONS':      lines.push('Powers weapons for targeting and firing.'); break;
      case 'OXYGEN':       lines.push('Replenishes ship atmosphere per second.'); break;
      case 'MEDBAY':       lines.push('Heals crew inside at 5 HP/s while powered.'); break;
      case 'PILOTING':     lines.push('Baseline evasion. Manning grants a bonus.'); break;
      case 'SENSORS':      lines.push('Reveals crew and system status on enemy.'); break;
      case 'DOORS':        lines.push('Remote door control for breach management.'); break;
      case 'CLOAKING':     lines.push('Cloaks ship, greatly boosting evasion.'); break;
      case 'TELEPORTER':   lines.push('Teleports crew to the enemy ship.'); break;
      case 'DRONE_CONTROL':lines.push('Deploys combat and repair drones [D].'); break;
      case 'HACKING':      lines.push('Hacks enemy systems to disrupt them.'); break;
      default: break;
    }
    return lines;
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
