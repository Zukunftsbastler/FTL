import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { GameStateData } from '../../engine/GameState';
import { HULL_PAD } from '../world/ShipGenerator';
import { getShieldTexture } from '../vfx/ShieldGenerator';
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
  SYSPANEL_W,
  SYSPANEL_PIP_W,
  SYSPANEL_PIP_H,
  SYSPANEL_PIP_GAP,
  BOTTOM_HUD_H,
  SYSTEM_COL_W,
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
const LABEL_COLOR      = '#88aadd';
const LABEL_FONT       = '11px monospace';
const POWER_FONT       = '10px monospace';
const POWER_COLOR      = '#ffdd44';

/** Maximum red-overlay opacity at 0% O2. */
const O2_OVERLAY_MAX_ALPHA = 0.75;

const DOOR_THICK           = 8;   // proportional to TILE_SIZE=55
const DOOR_HALF            = Math.floor(DOOR_THICK / 2);
/** Length of the two retracted stubs visible when a door is open (20 % of a tile). */
const DOOR_STUB_LEN        = Math.round(TILE_SIZE * 0.2);
const DOOR_FILL_COLOR      = '#8899A6';
const DOOR_BORDER_COLOR    = '#4a5a6a';

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

// ── Weapon UI ─────────────────────────────────────────────────────────────────
// WEAPON_BOX_FILL / _BORDER / _SELECTED_COL replaced by UIRenderer.drawSciFiPanel styling.
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
/** Width of the enemy status panel anchored to the right of the top bar.
 *  Exported so JumpSystem can position the FTL button adjacent to it. */
export const ENEMY_PANEL_W = 300;
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

/** Width of the reactor power panel at the far bottom-left. */
const REACTOR_PANEL_X = 4;
const REACTOR_PANEL_W = 58;
/** Size of each reactor pip square. */
const REACTOR_PIP_W   = 10;
const REACTOR_PIP_H   = 10;
const REACTOR_PIP_GAP = 2;

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
          width:   ENEMY_PANEL_W,
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
      height: BOTTOM_HUD_H,
      content: { chamfer: 8, borderColor: UI_PANEL_BORDER, alpha: 0.92 },
    },
  ],
};

// ── Starfield constants ───────────────────────────────────────────────────────
const STAR_SPEED = 10; // pixels per second scrolling left

// ── Shield constants ──────────────────────────────────────────────────────────
/**
 * Padding multiplier applied to HULL_PAD when sizing the shield bubble.
 * The shield must safely encompass the aerodynamic hull nose and wing tips.
 */
const SHIELD_HULL_SCALE = 2.5;
/** Extra pixels outward per additional concentric shield bubble layer. */
const SHIELD_LAYER_STEP = 16;
/** Duration (seconds) the shield flashes brighter after absorbing a hit. */
const SHIELD_FLASH_DURATION = 0.20;

/**
 * ECS render system. Strict layer order:
 *   Layer 0 — Center divider
 *   Layer 1 — Rooms   (fill + border + O2 overlay + hit flash + system label + power bar)
 *   Layer 2 — Doors
 *   Layer 3 — Crew
 *   Layer 4 — Targeting crosshairs
 *   Layer 5 — Sprites (cursor — topmost)
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
  private readonly planet: { x: number; y: number; speed: number };

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
      x:     width  * (0.65 + Math.random() * 0.25),
      y:     height * (0.10 + Math.random() * 0.80),
      speed: 1.5,   // much slower than stars (STAR_SPEED = 10)
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
    this.drawHulls(world);      // Layer 1: WebGL hull sprites
    this.drawCutaway(world);    // Layer 2: dark room floor (cutaway look)
    // ── Ship interior ────────────────────────────────────────────────────────
    this.drawRooms(world);      // Layer 3: room content (systems, overlays)
    this.drawDoors(world);
    this.drawCrew(world);
    this.drawDrones(world);
    // ── Combat effects ───────────────────────────────────────────────────────
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
    this.drawReactorPanel(world);
    this.drawEnergyFlowLines();
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
    const ctx = this.renderer.getContext();

    for (const shipEntity of world.query(['Ship', 'Shield', 'Faction'])) {
      const shield  = world.getComponent<ShieldComponent>(shipEntity, 'Shield');
      const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      if (shield === undefined || faction === undefined) continue;

      const bubbles = Math.floor(shield.currentLayers);
      if (bubbles < 1) continue;

      const tex = getShieldTexture(faction.id);
      if (tex === undefined) continue;

      // Compute bounding box from all rooms owned by this ship.
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

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;

      // Size the bubble to encompass the full aerodynamic hull (nose + wing tips).
      const hullPad = HULL_PAD * SHIELD_HULL_SCALE;
      const baseW   = (maxX - minX) + hullPad * 2;
      const baseH   = (maxY - minY) + hullPad * 2;

      const isFlashing = this.shieldFlashTimers.has(shipEntity);
      const pulse      = Math.sin(Date.now() / 200) * 0.05;

      ctx.save();
      // Additive compositing makes the hex glow visible on top of the dark ship.
      ctx.globalCompositeOperation = 'screen';

      for (let i = 0; i < bubbles; i++) {
        const extra  = i * SHIELD_LAYER_STEP;
        const drawW  = baseW + extra * 2;
        const drawH  = baseH + extra * 2;
        const alpha  = (isFlashing ? 0.95 : 0.72) - i * 0.12 + pulse;
        ctx.globalAlpha = Math.max(0.10, Math.min(1.0, alpha));
        ctx.drawImage(tex, cx - drawW / 2, cy - drawH / 2, drawW, drawH);
      }

      ctx.globalAlpha              = 1.0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.restore();
    }
  }

  // ── Procedural planet (deep background — drawn before the starfield) ────────

  private drawPlanet(): void {
    const pc = GameStateData.cachedPlanet;
    if (pc === null) return;

    const dt = Time.deltaTime;
    const { width, height } = this.renderer.getCanvasSize();

    // The offscreen canvas is radius*2.5 wide; half of that is the draw offset
    // needed to keep the planet sphere centred at (this.planet.x, this.planet.y).
    const halfW = pc.width  / 2;
    const halfH = pc.height / 2;

    // Drift the planet slowly left; wrap it back when fully off-screen.
    this.planet.x -= this.planet.speed * dt;
    if (this.planet.x + halfW < 0) {
      this.planet.x = width  + halfW;
      this.planet.y = height * 0.10 + Math.random() * height * 0.80;
    }

    this.renderer.getContext().drawImage(pc, this.planet.x - halfW, this.planet.y - halfH);
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

  // ── WebGL hull sprites (Layer 1) ─────────────────────────────────────────────

  private drawHulls(world: IWorld): void {
    const ctx = this.renderer.getContext();

    for (const shipEntity of world.query(['Ship', 'Faction'])) {
      const ship    = world.getComponent<ShipComponent>(shipEntity, 'Ship');
      const faction = world.getComponent<FactionComponent>(shipEntity, 'Faction');
      if (ship?.hullSprite === undefined || faction === undefined) continue;

      // Compute full room bounding box (need all four extremes for hull polygon).
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

      const midY      = (minY + maxY) / 2;
      const isPlayer  = faction.id === 'PLAYER';

      // ── Black undercoat: fill the hull polygon before drawing the sprite ────
      // The WebGL hull sprite has semi-transparent pixels at the wing tips and
      // nose, allowing the background planet to bleed through.  Painting the
      // exact same polygon (and nacelle blocks) in solid black first ensures
      // every pixel of the aerodynamic shape is fully opaque.
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      if (isPlayer) {
        ctx.moveTo(minX,      minY - 40);   // rear top wing
        ctx.lineTo(maxX + 60, midY);        // nose tip (right)
        ctx.lineTo(minX,      maxY + 40);   // rear bottom wing
        ctx.lineTo(minX - 20, midY);        // rear notch
      } else {
        ctx.moveTo(maxX,      minY - 40);   // rear top wing
        ctx.lineTo(minX - 60, midY);        // nose tip (left)
        ctx.lineTo(maxX,      maxY + 40);   // rear bottom wing
        ctx.lineTo(maxX + 20, midY);        // rear notch
      }
      ctx.closePath();
      ctx.fill();

      // Engine nacelles — same dimensions as ShipGenerator (nacW=30, nacH=14, nacGap=26).
      const nacW = 30, nacH = 14, nacGap = 26;
      if (isPlayer) {
        ctx.fillRect(minX - nacW, midY - nacGap - nacH / 2, nacW, nacH);
        ctx.fillRect(minX - nacW, midY + nacGap - nacH / 2, nacW, nacH);
      } else {
        ctx.fillRect(maxX,        midY - nacGap - nacH / 2, nacW, nacH);
        ctx.fillRect(maxX,        midY + nacGap - nacH / 2, nacW, nacH);
      }

      // Hull sprite drawn on top of the black undercoat.
      ctx.drawImage(ship.hullSprite, minX - HULL_PAD, minY - HULL_PAD);

      // Fill room footprints with solid black so the semi-transparent cutaway
      // mask never reveals the background through the room interiors.
      for (const re of world.query(['Room', 'Position', 'Owner'])) {
        const owner2 = world.getComponent<OwnerComponent>(re, 'Owner');
        if (owner2?.shipEntity !== shipEntity) continue;
        const pos2  = world.getComponent<PositionComponent>(re, 'Position');
        const room2 = world.getComponent<RoomComponent>(re, 'Room');
        if (pos2 === undefined || room2 === undefined) continue;
        ctx.fillRect(pos2.x, pos2.y, room2.width * TILE_SIZE, room2.height * TILE_SIZE);
      }
    }
  }

  // ── Cutaway floor mask (Layer 2 — drawn on top of hull, behind room content) ─

  private drawCutaway(world: IWorld): void {
    const ctx = this.renderer.getContext();
    for (const entity of world.query(['Room', 'Position'])) {
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const pw = room.width  * TILE_SIZE;
      const ph = room.height * TILE_SIZE;

      // Nearly-black fill simulates the "sliced-open roof" cutaway.
      ctx.fillStyle = 'rgba(5, 6, 16, 0.92)';
      ctx.fillRect(pos.x, pos.y, pw, ph);
      // Subtle dark border to separate adjacent rooms.
      ctx.strokeStyle = '#1e1f2c';
      ctx.lineWidth   = 2;
      ctx.strokeRect(pos.x + 0.5, pos.y + 0.5, pw - 1, ph - 1);
    }
  }

  // ── Top bar (player-panel left | spacer | enemy-panel right) ────────────────

  private drawTopBar(world: IWorld): void {
    const { width } = this.renderer.getCanvasSize();
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

      // Render each resource as a cyan pill for readability and overflow safety.
      const ctx2      = this.renderer.getContext();
      const PILL_H    = 22;
      const PILL_PAD  = 8;
      const PILL_GAP  = 5;
      const PILL_FONT = DASH_FONT;
      const pillY     = Math.round((TOP_BAR_H - PILL_H) / 2);
      ctx2.font       = PILL_FONT;

      const resources = [
        `HULL ${ship.currentHull}/${ship.maxHull}`,
        `FUEL ${ship.fuel}`,
        `MSL ${ship.missiles}`,
        `SCRAP ${ship.scrap}`,
      ];
      let pillX = px;
      for (const label of resources) {
        const tw   = ctx2.measureText(label).width;
        const pw   = tw + PILL_PAD * 2;
        UIRenderer.drawPill(ctx2, pillX, pillY, pw, PILL_H, '#00ccdd');
        ctx2.font      = PILL_FONT;
        ctx2.fillStyle = '#001820';
        ctx2.textAlign = 'left';
        ctx2.fillText(label, pillX + PILL_PAD, pillY + PILL_H / 2 + 5);
        pillX += pw + PILL_GAP;
      }
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
        : width - 150;
      this.renderer.drawText(
        `ENEMY HULL ${ship.currentHull}/${ship.maxHull}`,
        ex, y, DASH_FONT, '#ff6644', 'center',
      );

      // Enemy ship name — prominently at top-bar centre.
      this.renderer.drawText(
        ship.name.toUpperCase(),
        width / 2, y,
        '13px monospace', '#ff9966', 'center',
      );
      break;
    }
  }

  // ── Layer 1: rooms ──────────────────────────────────────────────────────────

  private drawRooms(world: IWorld): void {
    const flashSet = this.projectileSystem.getImpactedRooms();
    const playerRoomsWithCrew = this.buildPlayerRoomsWithCrew(world);

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

          // Damage indicator — red tint overlay + DAMAGED label when damageAmount > 0.
          if (system.damageAmount > 0) {
            const dmgAlpha = Math.min(0.6, system.damageAmount * 0.2);
            this.renderer.drawRect(
              pos.x, pos.y, pw, ph,
              `rgba(220,20,20,${dmgAlpha.toFixed(3)})`,
              true,
            );
            this.renderer.drawText(
              '⚠ DMG', pos.x + pw / 2, pos.y + ph - 6,
              '9px monospace', '#ff4444', 'center',
            );

            // Repair progress bar — green bar at the bottom when player crew is repairing.
            if (playerRoomsWithCrew.has(entity)) {
              const fracPart  = system.damageAmount - Math.floor(system.damageAmount);
              const repairFrac = fracPart > 0 ? (1.0 - fracPart) : 0;
              const barX = pos.x + 3;
              const barY = pos.y + ph - 20;
              const barW = pw - 6;
              const barH = 4;
              this.renderer.drawRect(barX, barY, barW, barH, '#1a2a1a', true);
              this.renderer.drawRect(barX, barY, Math.max(1, Math.round(barW * repairFrac)), barH, '#33cc44', true);
              this.renderer.drawRect(barX, barY, barW, barH, '#226622', false);
            }
          }
        }
      }

      // Cloak overlay — blue tint on all rooms of cloaked ships.
      const roomOwner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (roomOwner !== undefined && cloakedShips.has(roomOwner.shipEntity)) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, CLOAK_OVERLAY, true);
      }

      // Fire overlay — orange tint + small label.
      if (room.hasFire) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, 'rgba(255,80,0,0.40)', true);
        this.renderer.drawText('FIRE', pos.x + pw / 2, pos.y + ph - 6, '9px monospace', '#ff8844', 'center');
      }

      // Breach overlay — cyan tint + small label.
      if (room.hasBreach) {
        this.renderer.drawRect(pos.x, pos.y, pw, ph, 'rgba(0,200,255,0.30)', true);
        this.renderer.drawText('BREACH', pos.x + pw / 2, pos.y + ph - 6, '9px monospace', '#44ddff', 'center');
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

      if (door.isVertical) {
        // Vertical door: wall runs along x = pos.x, spans pos.y → pos.y + TILE_SIZE.
        if (!door.isOpen) {
          // Closed → solid barricade.
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y, DOOR_THICK, TILE_SIZE, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y, DOOR_THICK, TILE_SIZE, DOOR_BORDER_COLOR, false);
        } else {
          // Open → two retracted stubs at the top and bottom edges.
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y,                         DOOR_THICK, DOOR_STUB_LEN, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y,                         DOOR_THICK, DOOR_STUB_LEN, DOOR_BORDER_COLOR, false);
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y + TILE_SIZE - DOOR_STUB_LEN, DOOR_THICK, DOOR_STUB_LEN, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x - DOOR_HALF, pos.y + TILE_SIZE - DOOR_STUB_LEN, DOOR_THICK, DOOR_STUB_LEN, DOOR_BORDER_COLOR, false);
        }
      } else {
        // Horizontal door: wall runs along y = pos.y, spans pos.x → pos.x + TILE_SIZE.
        if (!door.isOpen) {
          // Closed → solid barricade.
          this.renderer.drawRect(pos.x, pos.y - DOOR_HALF, TILE_SIZE, DOOR_THICK, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x, pos.y - DOOR_HALF, TILE_SIZE, DOOR_THICK, DOOR_BORDER_COLOR, false);
        } else {
          // Open → two retracted stubs at the left and right edges.
          this.renderer.drawRect(pos.x,                         pos.y - DOOR_HALF, DOOR_STUB_LEN, DOOR_THICK, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x,                         pos.y - DOOR_HALF, DOOR_STUB_LEN, DOOR_THICK, DOOR_BORDER_COLOR, false);
          this.renderer.drawRect(pos.x + TILE_SIZE - DOOR_STUB_LEN, pos.y - DOOR_HALF, DOOR_STUB_LEN, DOOR_THICK, DOOR_FILL_COLOR, true);
          this.renderer.drawRect(pos.x + TILE_SIZE - DOOR_STUB_LEN, pos.y - DOOR_HALF, DOOR_STUB_LEN, DOOR_THICK, DOOR_BORDER_COLOR, false);
        }
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

      // Draw cloak status right-aligned, immediately left of the FTL button.
      // FTL button left edge = width - ENEMY_PANEL_W - 8 (gap) - 160 (btn width).
      const { width: cw } = this.renderer.getCanvasSize();
      const cloakX = cw - ENEMY_PANEL_W - 8 - 160 - 8;
      this.renderer.drawText(label, cloakX, Math.round(TOP_BAR_H / 2) + 6, DASH_FONT, color, 'right');
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
    this.renderer.drawRect(cx - h, cy - g - l, w, l, CROSSHAIR_COLOR, true);
    this.renderer.drawRect(cx - h, cy + g,     w, l, CROSSHAIR_COLOR, true);
    this.renderer.drawRect(cx - g - l, cy - h, l, w, CROSSHAIR_COLOR, true);
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

  // ── HUD: left pillar (crew roster + system power panel) ─────────────────

  private drawSystemPanel(world: IWorld): void {
    if (this.powerSystem === null) return;

    const { height: canvasH } = this.renderer.getCanvasSize();
    const sysY0 = canvasH - BOTTOM_HUD_H + 6;

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
    this.renderer.drawLine(SYSPANEL_X, sysY0 - 14, SYSPANEL_X + SYSPANEL_W, sysY0 - 14, UI_PANEL_BORDER, 1);

    const systems = this.powerSystem.getPlayerSystems(world, playerShipEntity);

    // Register systems anchor.
    {
      let playerEntityForAnchor = -1;
      for (const e of world.query(['Ship', 'Faction'])) {
        const f = world.getComponent<FactionComponent>(e, 'Faction');
        if (f?.id === 'PLAYER') { playerEntityForAnchor = e; break; }
      }
      const anchorSystems2 = this.powerSystem.getPlayerSystems(world, playerEntityForAnchor);
      GameStateData.uiAnchors['systems'] = {
        x: SYSPANEL_X, y: sysY0,
        w: Math.max(SYSTEM_COL_W, anchorSystems2.length * SYSTEM_COL_W),
        h: BOTTOM_HUD_H - 6,
      };
    }

    // System name abbreviations.
    const SYS_ABBREV: Record<string, string> = {
      OXYGEN: 'O2', SHIELDS: 'SHD', ENGINES: 'ENG', WEAPONS: 'WPN',
      MEDBAY: 'MED', CLOAKING: 'CLK', TELEPORTER: 'TEL',
      DRONE_CONTROL: 'DRN', HACKING: 'HCK',
    };

    const PIP_START_Y = sysY0 + 22;   // below the abbreviation label

    for (let i = 0; i < systems.length; i++) {
      const sys    = systems[i];
      const colX   = SYSPANEL_X + i * SYSTEM_COL_W;
      const colCX  = colX + SYSTEM_COL_W / 2;

      // Column hover highlight.
      const hovered =
        this.input.getMousePosition().x >= colX &&
        this.input.getMousePosition().x <  colX + SYSTEM_COL_W &&
        this.input.getMousePosition().y >= sysY0 &&
        this.input.getMousePosition().y <  sysY0 + BOTTOM_HUD_H;
      if (hovered) {
        this.renderer.drawRect(colX, sysY0, SYSTEM_COL_W, BOTTOM_HUD_H - 6, 'rgba(80,120,200,0.18)', true);
      }

      // Abbreviated system name — rotated 90° for narrow column fit.
      const abbrev = SYS_ABBREV[sys.type] ?? sys.type.slice(0, 3);
      const labelY  = sysY0 + 14;
      const ctx2    = this.renderer.getContext();
      ctx2.save();
      ctx2.translate(colCX, labelY);
      ctx2.rotate(-Math.PI / 2);
      ctx2.font      = '8px monospace';
      ctx2.fillStyle = sys.currentPower > 0 ? '#aaccff' : '#446688';
      ctx2.textAlign = 'center';
      ctx2.fillText(abbrev, 0, 3);
      ctx2.restore();

      // Damage indicator stripe.
      if (sys.damageAmount > 0) {
        const dmgFrac = Math.min(1, sys.damageAmount / sys.level);
        this.renderer.drawRect(colX, sysY0, SYSTEM_COL_W, 3,
          `rgba(255,50,50,${(dmgFrac * 0.8).toFixed(2)})`, true);
      }

      // Power pips stacked vertically in the column.
      const pipOffX = Math.round((SYSTEM_COL_W - SYSPANEL_PIP_W) / 2);
      for (let p = 0; p < sys.level; p++) {
        const px      = colX + pipOffX;
        const py      = PIP_START_Y + p * (SYSPANEL_PIP_H + SYSPANEL_PIP_GAP);
        const filled  = p < sys.currentPower;
        const zoltan  = !filled && p < sys.currentPower + sys.zoltanBonus;
        const damaged = !filled && !zoltan && p >= sys.maxCapacity;
        const bgColor = filled  ? '#39ff14'
                      : zoltan  ? '#eecc00'
                      : damaged ? '#ff3333'
                      :           '#1a1d24';
        const brdColor = filled  ? '#88ffaa'
                       : zoltan  ? '#ffee66'
                       : damaged ? '#ff5555'
                       :           '#4c5866';
        this.renderer.drawRect(px, py, SYSPANEL_PIP_W, SYSPANEL_PIP_H, bgColor, true);
        this.renderer.drawRect(px, py, SYSPANEL_PIP_W, SYSPANEL_PIP_H, brdColor, false);
      }
    }
  }

  /** Draws the reactor as a vertical column of power pips at the bottom-left. */
  private drawReactorPanel(world: IWorld): void {
    const { height: canvasH } = this.renderer.getCanvasSize();
    const ctx = this.renderer.getContext();

    // Find player ship reactor.
    let reactor: ReactorComponent | undefined;
    for (const entity of world.query(['Ship', 'Faction', 'Reactor'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      reactor = world.getComponent<ReactorComponent>(entity, 'Reactor');
      break;
    }
    if (reactor === undefined) return;

    const panelY = canvasH - BOTTOM_HUD_H + 4;
    const panelH = BOTTOM_HUD_H - 8;

    // Register anchor for tutorial spotlight.
    GameStateData.uiAnchors['reactor'] = { x: REACTOR_PANEL_X, y: panelY, w: REACTOR_PANEL_W, h: panelH };

    // Panel background.
    UIRenderer.drawSciFiPanel(ctx, REACTOR_PANEL_X, panelY, REACTOR_PANEL_W, panelH, {
      chamfer: 6, borderColor: '#33aa33', alpha: 0.90,
    });

    // Label.
    ctx.font      = '9px monospace';
    ctx.fillStyle = '#44cc44';
    ctx.textAlign = 'center';
    ctx.fillText('POWER', REACTOR_PANEL_X + REACTOR_PANEL_W / 2, panelY + 12);

    // Pip grid: 2 columns.
    const COLS    = 2;
    const colStep = REACTOR_PIP_W + REACTOR_PIP_GAP;
    const rowStep = REACTOR_PIP_H + REACTOR_PIP_GAP;
    const gridW   = COLS * colStep - REACTOR_PIP_GAP;
    const startX  = REACTOR_PANEL_X + Math.round((REACTOR_PANEL_W - gridW) / 2);
    const startY  = panelY + 18;

    const maxP  = reactor.totalPower;
    const usedP = maxP - reactor.currentPower;

    for (let pip = 0; pip < maxP; pip++) {
      const col  = pip % COLS;
      const row  = Math.floor(pip / COLS);
      const px   = startX + col * colStep;
      const py   = startY + row * rowStep;
      const used = pip < usedP;
      const fill = used ? '#224422' : '#33ff33';
      const brd  = used ? '#334433' : '#88ff88';
      this.renderer.drawRect(px, py, REACTOR_PIP_W, REACTOR_PIP_H, fill, true);
      this.renderer.drawRect(px, py, REACTOR_PIP_W, REACTOR_PIP_H, brd, false);
    }
  }

  /** Draws subtle animated lines connecting the reactor to the systems panel. */
  private drawEnergyFlowLines(): void {
    const { height: canvasH } = this.renderer.getCanvasSize();
    const ctx  = this.renderer.getContext();
    const midY = canvasH - BOTTOM_HUD_H / 2;
    const fromX = REACTOR_PANEL_X + REACTOR_PANEL_W;
    const toX   = SYSPANEL_X - 2;

    ctx.beginPath();
    ctx.moveTo(fromX, midY);
    ctx.lineTo(toX,   midY);
    ctx.strokeStyle = '#226622';
    ctx.lineWidth   = 2;
    ctx.setLineDash([6, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // ── HUD: weapon UI boxes (bottom strip with panel background) ────────────

  private drawWeaponUI(world: IWorld): void {
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    if (playerWeapons.length === 0) return;

    const { width: canvasW, height } = this.renderer.getCanvasSize();
    const boxBaseY   = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    const totalWeaponsW = playerWeapons.length * (WEAPON_BOX_W + WEAPON_BOX_MARGIN) - WEAPON_BOX_MARGIN;
    const weaponStartX  = playerWeapons.length > 0
      ? Math.round(canvasW / 2 - totalWeaponsW / 2)
      : WEAPON_BOX_MARGIN;

    // Register weapons anchor for tutorial spotlight.
    GameStateData.uiAnchors['weapons'] = { x: weaponStartX, y: boxBaseY, w: totalWeaponsW, h: WEAPON_BOX_H };

    // Layout engine draws the bottom-bar panel background; this method draws weapon boxes only.
    const selectedEntity = this.targetingSystem.getSelectedWeaponEntity();
    const chargeBarY     = boxBaseY + WEAPON_BOX_H - WEAPON_UI_PAD - WEAPON_CHARGE_H;
    const chargeBarW     = WEAPON_BOX_W - WEAPON_UI_PAD * 2;

    const ctx2 = this.renderer.getContext();

    for (let i = 0; i < playerWeapons.length; i++) {
      const [entity, weapon] = playerWeapons[i];
      const bx = weaponStartX + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      const by = boxBaseY;

      const isSelected  = entity === selectedEntity;
      const isPowered   = weapon.isPowered;

      // Beveled panel — cyan background when powered, selected gets cyan border.
      UIRenderer.drawSciFiPanel(ctx2, bx, by, WEAPON_BOX_W, WEAPON_BOX_H, {
        lightBg:     isPowered,
        borderColor: isSelected ? '#00ddff' : '#ffffff',
        alpha:       isPowered ? 0.95 : 0.80,
      });

      const textColor = isPowered ? '#001830' : WEAPON_NAME_COLOR;
      const name = this.getWeaponName(weapon.templateId);
      this.renderer.drawText(name, bx + WEAPON_UI_PAD, by + 16, WEAPON_NAME_FONT, textColor, 'left');

      // Power toggle indicator — small pill top-right corner.
      const piqSize = 10;
      const piqX = bx + WEAPON_BOX_W - WEAPON_UI_PAD - piqSize;
      const piqY = by + WEAPON_UI_PAD;
      const piqColor = weapon.userPowered ? WEAPON_POWERED_COLOR : '#442222';
      this.renderer.drawRect(piqX, piqY, piqSize, piqSize, piqColor, true);
      this.renderer.drawRect(piqX, piqY, piqSize, piqSize, weapon.userPowered ? '#aaffaa' : '#664444', false);

      const powColor = isPowered ? WEAPON_POWERED_COLOR : WEAPON_UNPOWERED_COLOR;
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

    // ── Power lines: WEAPONS system column → each weapon box ─────────────────
    if (this.powerSystem !== null) {
      let playerSEforLines = -1;
      for (const e of world.query(['Ship', 'Faction'])) {
        const f = world.getComponent<FactionComponent>(e, 'Faction');
        if (f?.id === 'PLAYER') { playerSEforLines = e; break; }
      }
      const sysList  = this.powerSystem.getPlayerSystems(world, playerSEforLines);
      const wSysIdx  = sysList.findIndex((s) => s.type === 'WEAPONS');

      if (wSysIdx >= 0) {
        const { height: ch2 } = this.renderer.getCanvasSize();
        const sysY02  = ch2 - BOTTOM_HUD_H + 6;
        const wColX   = SYSPANEL_X + wSysIdx * SYSTEM_COL_W + Math.round(SYSTEM_COL_W / 2);
        const wColBot = sysY02 + BOTTOM_HUD_H - 6;
        const ctx3    = this.renderer.getContext();

        for (let i = 0; i < playerWeapons.length; i++) {
          const [, weapon] = playerWeapons[i];
          const wbCX = weaponStartX + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN) + Math.round(WEAPON_BOX_W / 2);
          const powered    = weapon.isPowered;
          ctx3.save();
          ctx3.strokeStyle = powered ? 'rgba(51,255,20,0.75)' : 'rgba(30,60,30,0.5)';
          ctx3.lineWidth   = powered ? 2 : 1;
          ctx3.setLineDash(powered ? [] : [4, 4]);
          ctx3.beginPath();
          ctx3.moveTo(wColX, wColBot);
          ctx3.lineTo(wbCX, boxBaseY + WEAPON_BOX_H);
          ctx3.stroke();
          ctx3.restore();
        }
      }
    }
  }

  // ── HUD: contextual tooltips ──────────────────────────────────────────────

  private drawTooltips(world: IWorld): void {
    const mouse = this.input.getMousePosition();
    const { width: canvasW, height: canvasH } = this.renderer.getCanvasSize();
    const sysY0 = canvasH - BOTTOM_HUD_H + 6;

    // 1. Weapon UI boxes (bottom strip) — rich weapon card.
    const playerWeapons = this.targetingSystem.getPlayerWeapons(world);
    const boxBaseY = canvasH - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    const totalWeaponsW = playerWeapons.length * (WEAPON_BOX_W + WEAPON_BOX_MARGIN) - WEAPON_BOX_MARGIN;
    const weaponStartX  = playerWeapons.length > 0
      ? Math.round(canvasW / 2 - totalWeaponsW / 2)
      : WEAPON_BOX_MARGIN;
    for (let i = 0; i < playerWeapons.length; i++) {
      const bx = weaponStartX + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
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

    // 2. System power panel columns — rich system card.
    if (this.powerSystem !== null) {
      const playerShipEntity = this.findPlayerShipEntity(world);
      if (playerShipEntity !== null) {
        const systems = this.powerSystem.getPlayerSystems(world, playerShipEntity);
        for (let i = 0; i < systems.length; i++) {
          const colX = SYSPANEL_X + i * SYSTEM_COL_W;
          if (
            mouse.x >= colX && mouse.x < colX + SYSTEM_COL_W &&
            mouse.y >= sysY0 && mouse.y < sysY0 + BOTTOM_HUD_H
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

  /** Returns a Set of room entity IDs currently occupied by at least one player crew member. */
  private buildPlayerRoomsWithCrew(world: IWorld): Set<number> {
    const crewPositions: Array<{ x: number; y: number }> = [];
    for (const entity of world.query(['Crew', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos !== undefined) crewPositions.push({ x: pos.x, y: pos.y });
    }

    const result = new Set<number>();
    if (crewPositions.length === 0) return result;

    for (const entity of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;
      const rw = room.width  * TILE_SIZE;
      const rh = room.height * TILE_SIZE;
      for (const cp of crewPositions) {
        if (cp.x >= pos.x && cp.x < pos.x + rw && cp.y >= pos.y && cp.y < pos.y + rh) {
          result.add(entity);
          break;
        }
      }
    }
    return result;
  }
}
