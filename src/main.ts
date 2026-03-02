import { AssetLoader } from './utils/AssetLoader';
import { Input } from './engine/Input';
import { Renderer } from './engine/Renderer';
import { Time } from './engine/Time';
import { World } from './engine/World';
import { RenderSystem } from './game/systems/RenderSystem';
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
const world = new World();
const input = new Input(canvas);

// ── Systems ───────────────────────────────────────────────────────────────────

const renderSystem = new RenderSystem(renderer);

// ── Asset Generation ──────────────────────────────────────────────────────────

/**
 * Programmatically generates a 32×32 placeholder sprite and registers it in the
 * AssetLoader so we can test the ECS render pipeline without external image files.
 * Uses a temporary canvas — permitted for asset initialisation (not gameplay rendering).
 */
function generatePlaceholderAssets(): Promise<void> {
  const SIZE = 32;
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width = SIZE;
  tmpCanvas.height = SIZE;

  const tmpCtx = tmpCanvas.getContext('2d');
  if (tmpCtx === null) {
    return Promise.reject(new Error('generatePlaceholderAssets: failed to get 2D context.'));
  }

  // Filled teal square with a white border — easy to spot against a black background.
  tmpCtx.fillStyle = '#00ccff';
  tmpCtx.fillRect(0, 0, SIZE, SIZE);
  tmpCtx.strokeStyle = '#ffffff';
  tmpCtx.lineWidth = 2;
  tmpCtx.strokeRect(1, 1, SIZE - 2, SIZE - 2);

  return AssetLoader.loadImage('cursor-sprite', tmpCanvas.toDataURL());
}

// ── Initialisation & Game Loop ────────────────────────────────────────────────

async function init(): Promise<void> {
  // Task B / E — load placeholder asset before the loop starts.
  await generatePlaceholderAssets();

  // Task E — spawn the cursor-following test entity.
  const SPRITE_SIZE = 32;
  const cursorEntity = world.createEntity();

  const pos: PositionComponent = { _type: 'Position', x: 0, y: 0 };
  const sprite: SpriteComponent = {
    _type: 'Sprite',
    assetId: 'cursor-sprite',
    width: SPRITE_SIZE,
    height: SPRITE_SIZE,
  };

  world.addComponent(cursorEntity, pos);
  world.addComponent(cursorEntity, sprite);

  // ── Game Loop ───────────────────────────────────────────────────────────────

  let lastTimestamp: number = performance.now();

  function gameLoop(timestamp: number): void {
    Time.tick(timestamp, lastTimestamp);
    lastTimestamp = timestamp;

    // 1. Clear canvas.
    renderer.clear('#000000');

    // 2. Sync cursor entity position to mouse (centred on the cursor hotspot).
    const mouse = input.getMousePosition();
    const entityPos = world.getComponent<PositionComponent>(cursorEntity, 'Position');
    if (entityPos !== undefined) {
      entityPos.x = mouse.x - SPRITE_SIZE / 2;
      entityPos.y = mouse.y - SPRITE_SIZE / 2;
    }

    // 3. Log a single message per click — proves isMouseJustPressed works.
    if (input.isMouseJustPressed(0)) {
      console.log(`[Input] Left click at (${Math.round(mouse.x)}, ${Math.round(mouse.y)})`);
    }

    // 4. Run systems.
    renderSystem.update(world);

    // 5. Flush "just pressed" state — must be last to give all systems a chance to read it.
    input.update();

    requestAnimationFrame(gameLoop);
  }

  requestAnimationFrame(gameLoop);
}

init().catch((err: unknown) => console.error('[main] Initialisation failed:', err));
