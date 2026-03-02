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
import { ShipFactory } from './game/world/ShipFactory';
import { Pathfinder } from './utils/Pathfinder';
import { TILE_SIZE } from './game/constants';
import type { ShipTemplate } from './game/data/ShipTemplate';
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
  ]);

  // ── Entity setup ────────────────────────────────────────────────────────────

  // Cursor entity (Sprint 2 — hovers above all game content).
  const SPRITE_SIZE = 32;
  const cursorEntity = world.createEntity();
  world.addComponent(cursorEntity, { _type: 'Position', x: 0, y: 0 } as PositionComponent);
  world.addComponent(cursorEntity, {
    _type: 'Sprite',
    assetId: 'cursor-sprite',
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  } as SpriteComponent);

  // Kestrel ship — centred on the canvas.  kestrel_a = 5 × 3 tile bounding box.
  const SHIP_GRID_W = 5;
  const SHIP_GRID_H = 3;
  const shipX = Math.round((canvas.width  - SHIP_GRID_W * TILE_SIZE) / 2);
  const shipY = Math.round((canvas.height - SHIP_GRID_H * TILE_SIZE) / 2);
  ShipFactory.spawnShip(world, 'kestrel_a', shipX, shipY);

  // ── Pathfinder ───────────────────────────────────────────────────────────────
  // Build the navigation graph from the same template used to spawn the ship.
  const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships');
  if (allShips === undefined) throw new Error('main: ships JSON missing after load.');
  const template = allShips.find((s) => s.id === 'kestrel_a');
  if (template === undefined) throw new Error('main: kestrel_a template not found.');
  const pathfinder = new Pathfinder(template.rooms, template.doors);

  // ── Systems ─────────────────────────────────────────────────────────────────

  const renderSystem    = new RenderSystem(renderer);
  const selectionSystem = new SelectionSystem(input, shipX, shipY);
  const movementSystem  = new MovementSystem(input, shipX, shipY, pathfinder);
  const powerSystem     = new PowerSystem(input);
  const doorSystem      = new DoorSystem(input);
  const oxygenSystem    = new OxygenSystem();
  const crewSystem      = new CrewSystem();

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();

  function gameLoop(timestamp: number): void {
    Time.tick(timestamp, lastTimestamp);
    lastTimestamp = timestamp;

    // 1. Clear canvas.
    renderer.clear('#000000');

    // 2. Sync cursor sprite to mouse position (centred on hotspot).
    const mouse     = input.getMousePosition();
    const entityPos = world.getComponent<PositionComponent>(cursorEntity, 'Position');
    if (entityPos !== undefined) {
      entityPos.x = mouse.x - SPRITE_SIZE / 2;
      entityPos.y = mouse.y - SPRITE_SIZE / 2;
    }

    // 3. Logic systems.
    doorSystem.update(world);       // toggle doors (left-click)
    selectionSystem.update(world);  // crew selection (left-click)
    movementSystem.update(world);   // crew movement (right-click + A*)
    powerSystem.update(world);      // power routing (hover + arrow keys)
    oxygenSystem.update(world);     // O2 regen / decay / equalization
    crewSystem.update(world);       // suffocation damage

    // 4. Render all layers.
    renderSystem.update(world);

    // 5. Flush "just pressed" — last, so every system above can read this frame's events.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
