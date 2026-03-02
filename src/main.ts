import { AssetLoader } from './utils/AssetLoader';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Time } from './engine/Time';
import { World } from './engine/World';
import { RenderSystem } from './game/systems/RenderSystem';
import { ShipFactory } from './game/world/ShipFactory';
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

// ── Systems ───────────────────────────────────────────────────────────────────

const renderSystem = new RenderSystem(renderer);

// ── Asset Helpers ─────────────────────────────────────────────────────────────

/**
 * Programmatically generates a 32×32 cursor sprite and registers it in the
 * AssetLoader. Uses a temporary off-screen canvas — permitted during init.
 */
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

  // Sprint 2 cursor entity — still active, hovers above the ship grid.
  const SPRITE_SIZE = 32;
  const cursorEntity = world.createEntity();
  const cursorPos: PositionComponent = { _type: 'Position', x: 0, y: 0 };
  const cursorSprite: SpriteComponent = {
    _type: 'Sprite',
    assetId: 'cursor-sprite',
    width:  SPRITE_SIZE,
    height: SPRITE_SIZE,
  };
  world.addComponent(cursorEntity, cursorPos);
  world.addComponent(cursorEntity, cursorSprite);

  // Sprint 3: spawn the Kestrel ship centred on the canvas.
  // kestrel_a occupies a 5 × 3 tile bounding box.
  const SHIP_GRID_W = 5;
  const SHIP_GRID_H = 3;
  const shipX = Math.round((canvas.width  - SHIP_GRID_W * TILE_SIZE) / 2);
  const shipY = Math.round((canvas.height - SHIP_GRID_H * TILE_SIZE) / 2);
  ShipFactory.spawnShip(world, 'kestrel_a', shipX, shipY);

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();

  function gameLoop(timestamp: number): void {
    Time.tick(timestamp, lastTimestamp);
    lastTimestamp = timestamp;

    // 1. Clear canvas.
    renderer.clear('#000000');

    // 2. Sync cursor entity to mouse position.
    const mouse     = input.getMousePosition();
    const entityPos = world.getComponent<PositionComponent>(cursorEntity, 'Position');
    if (entityPos !== undefined) {
      entityPos.x = mouse.x - SPRITE_SIZE / 2;
      entityPos.y = mouse.y - SPRITE_SIZE / 2;
    }

    // 3. Log a single line per click (proves isMouseJustPressed fires exactly once).
    if (input.isMouseJustPressed(0)) {
      console.log(`[Input] Left click at (${Math.round(mouse.x)}, ${Math.round(mouse.y)})`);
    }

    // 4. Run all systems — rooms first, then sprites on top.
    renderSystem.update(world);

    // 5. Flush "just pressed" — must come last so all systems see the event this frame.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
