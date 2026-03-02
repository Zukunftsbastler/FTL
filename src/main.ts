import { AssetLoader } from './utils/AssetLoader';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Time } from './engine/Time';
import { World } from './engine/World';
import { RenderSystem } from './game/systems/RenderSystem';
import { SelectionSystem } from './game/systems/SelectionSystem';
import { MovementSystem } from './game/systems/MovementSystem';
import { PowerSystem } from './game/systems/PowerSystem';
import { DoorSystem } from './game/systems/DoorSystem';
import { OxygenSystem } from './game/systems/OxygenSystem';
import { CrewSystem } from './game/systems/CrewSystem';
import { TargetingSystem } from './game/systems/TargetingSystem';
import { CombatSystem } from './game/systems/CombatSystem';
import { JumpSystem } from './game/systems/JumpSystem';
import { ProjectileSystem } from './game/systems/ProjectileSystem';
import { ManningSystem } from './game/systems/ManningSystem';
import { RepairSystem } from './game/systems/RepairSystem';
import { ShipFactory } from './game/world/ShipFactory';
import { Pathfinder } from './utils/Pathfinder';
import { TILE_SIZE } from './game/constants';
import type { GameState } from './engine/GameState';
import type { ShipTemplate } from './game/data/ShipTemplate';
import type { WeaponTemplate } from './game/data/WeaponTemplate';
import type { WeaponComponent } from './game/components/WeaponComponent';
import type { PositionComponent } from './game/components/PositionComponent';
import type { SpriteComponent } from './game/components/SpriteComponent';

// ── Canvas Setup ─────────────────────────────────────────────────────────────

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const ctx = canvas.getContext('2d');
if (ctx === null) {
  throw new Error('main: failed to acquire 2D rendering context.');
}

// ── Engine Singletons ─────────────────────────────────────────────────────────

const renderer = new Renderer(ctx);
const world    = new World();
const input    = new Input(canvas);

// ── Asset Helpers ─────────────────────────────────────────────────────────────

function generatePlaceholderAssets(): Promise<void> {
  const SIZE = 32;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = SIZE;
  tmpCanvas.height = SIZE;

  const tmpCtx = tmpCanvas.getContext('2d');
  if (tmpCtx === null) {
    return Promise.reject(new Error('generatePlaceholderAssets: failed to get 2D context.'));
  }

  tmpCtx.fillStyle   = '#00ccff';
  tmpCtx.fillRect(0, 0, SIZE, SIZE);
  tmpCtx.strokeStyle = '#ffffff';
  tmpCtx.lineWidth   = 2;
  tmpCtx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

  return AssetLoader.loadImage('cursor-sprite', tmpCanvas.toDataURL());
}

// ── Initialisation & Game Loop ────────────────────────────────────────────────

async function init(): Promise<void> {
  // ── Pre-load phase ──────────────────────────────────────────────────────────
  await Promise.all([
    generatePlaceholderAssets(),
    AssetLoader.loadJSON<ShipTemplate[]>('ships', '/data/ships.json'),
    AssetLoader.loadJSON<WeaponTemplate[]>('weapons', '/data/weapons.json'),
  ]);

  // ── Ship layout ─────────────────────────────────────────────────────────────
  // Player ship: kestrel_a = 5×3 tile bounding box — anchored on the left.
  // Enemy ship:  rebel_a   = 3×2 tile bounding box — anchored on the right.
  const PLAYER_GRID_H = 3;
  const ENEMY_GRID_W  = 3;
  const ENEMY_GRID_H  = 2;

  const playerShipX = 50;
  const playerShipY = Math.round((canvas.height - PLAYER_GRID_H * TILE_SIZE) / 2);
  const enemyShipX  = canvas.width  - 50 - ENEMY_GRID_W * TILE_SIZE;
  const enemyShipY  = Math.round((canvas.height - ENEMY_GRID_H  * TILE_SIZE) / 2);

  // ── Star map nodes (fractional canvas positions, computed once) ─────────────
  const STAR_RADIUS = 18;
  const stars = [
    { x: Math.round(canvas.width * 0.20), y: Math.round(canvas.height * 0.30), name: 'Vega'   },
    { x: Math.round(canvas.width * 0.50), y: Math.round(canvas.height * 0.50), name: 'Altair' },
    { x: Math.round(canvas.width * 0.75), y: Math.round(canvas.height * 0.25), name: 'Deneb'  },
    { x: Math.round(canvas.width * 0.35), y: Math.round(canvas.height * 0.65), name: 'Rigel'  },
    { x: Math.round(canvas.width * 0.65), y: Math.round(canvas.height * 0.70), name: 'Sirius' },
  ];

  // ── Entity setup ────────────────────────────────────────────────────────────

  // Cursor entity (hovers above all game content).
  const SPRITE_SIZE = 32;
  const cursorEntity = world.createEntity();
  world.addComponent(cursorEntity, { _type: 'Position', x: 0, y: 0 } as PositionComponent);
  world.addComponent(cursorEntity, {
    _type: 'Sprite',
    assetId: 'cursor-sprite',
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  } as SpriteComponent);

  // Player ship only — enemy is spawned on each combat entry.
  ShipFactory.spawnShip(world, 'kestrel_a', playerShipX, playerShipY, 'PLAYER');

  // ── Pathfinder (player ship only) ────────────────────────────────────────────
  const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships');
  if (allShips === undefined) throw new Error('main: ships JSON missing after load.');
  const template = allShips.find((s) => s.id === 'kestrel_a');
  if (template === undefined) throw new Error('main: kestrel_a template not found.');
  const pathfinder = new Pathfinder(template.rooms, template.doors);

  // ── State machine ────────────────────────────────────────────────────────────
  let currentState: GameState = 'STAR_MAP';

  function enterCombat(): void {
    ShipFactory.spawnShip(world, 'rebel_a', enemyShipX, enemyShipY, 'ENEMY');
    // Clear any stale weapon targets left over from a previous combat session.
    for (const entity of world.query(['Weapon'])) {
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) weapon.targetRoomEntity = undefined;
    }
    currentState = 'COMBAT';
  }

  function enterStarMap(): void {
    currentState = 'STAR_MAP';
  }

  // ── Systems ─────────────────────────────────────────────────────────────────

  const targetingSystem   = new TargetingSystem(input, renderer);
  const combatSystem      = new CombatSystem();
  const projectileSystem  = new ProjectileSystem();
  const jumpSystem        = new JumpSystem(input, renderer, enterStarMap);
  const renderSystem      = new RenderSystem(renderer, targetingSystem, input, projectileSystem);
  const selectionSystem = new SelectionSystem(input, playerShipX, playerShipY);
  const movementSystem  = new MovementSystem(input, playerShipX, playerShipY, pathfinder);
  const powerSystem     = new PowerSystem(input);
  const doorSystem      = new DoorSystem(input);
  const oxygenSystem    = new OxygenSystem();
  const crewSystem      = new CrewSystem();
  const manningSystem   = new ManningSystem();
  const repairSystem    = new RepairSystem();

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();

  function gameLoop(timestamp: number): void {
    Time.tick(timestamp, lastTimestamp);
    lastTimestamp = timestamp;

    if (currentState === 'STAR_MAP') {
      // ── Star Map ─────────────────────────────────────────────────────────────
      const { width } = renderer.getCanvasSize();
      renderer.clear('#00000f');

      renderer.drawText('STAR MAP', width / 2, 55, '28px monospace', '#aaccff', 'center');
      renderer.drawText('Click a star to engage', width / 2, 85, '14px monospace', '#556677', 'center');

      for (const star of stars) {
        renderer.drawCircle(star.x, star.y, STAR_RADIUS,     '#aaddff', true);
        renderer.drawCircle(star.x, star.y, STAR_RADIUS + 5, '#223355', false, 1);
        renderer.drawText(star.name, star.x, star.y + STAR_RADIUS + 18, '13px monospace', '#88aacc', 'center');
      }

      if (input.isMouseJustPressed(0)) {
        const mouse = input.getMousePosition();
        for (const star of stars) {
          const dx = mouse.x - star.x;
          const dy = mouse.y - star.y;
          if (dx * dx + dy * dy <= STAR_RADIUS * STAR_RADIUS) {
            enterCombat();
            break;
          }
        }
      }

    } else {
      // ── Combat ───────────────────────────────────────────────────────────────
      renderer.clear('#000000');

      // Sync cursor sprite to mouse position (centred on hotspot).
      const mouse     = input.getMousePosition();
      const entityPos = world.getComponent<PositionComponent>(cursorEntity, 'Position');
      if (entityPos !== undefined) {
        entityPos.x = mouse.x - SPRITE_SIZE / 2;
        entityPos.y = mouse.y - SPRITE_SIZE / 2;
      }

      // Logic systems.
      doorSystem.update(world);       // toggle doors (left-click)
      targetingSystem.update(world);  // weapon selection + targeting (left-click)
      selectionSystem.update(world);  // crew selection (left-click)
      movementSystem.update(world);   // crew movement (right-click + A*)
      powerSystem.update(world);      // power routing (hover + arrow keys)
      manningSystem.update(world);    // manning buffs (charge rate, evasion)
      combatSystem.update(world);     // weapon charging + projectile spawning
      projectileSystem.update(world); // advance projectiles, apply impact damage
      oxygenSystem.update(world);     // O2 regen / decay / equalization
      crewSystem.update(world);       // suffocation damage
      repairSystem.update(world);     // system repair + medbay healing
      jumpSystem.update(world);       // FTL button: draw + detect victory jump

      // Render all layers.
      renderSystem.update(world);
    }

    // Flush "just pressed" — last, so every system above can read this frame's events.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
