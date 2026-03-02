import { Time } from './engine/Time';
import { World } from './engine/World';
import { Renderer } from './engine/Renderer';

// ── Canvas Setup ────────────────────────────────────────────────────────────

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

// ── Engine Singletons ────────────────────────────────────────────────────────

const renderer = new Renderer(ctx);
const world = new World();

// Suppress "world declared but never read" until game systems are added.
void world;

// ── Game Loop ────────────────────────────────────────────────────────────────

let lastTimestamp: number = performance.now();

function gameLoop(timestamp: number): void {
  Time.tick(timestamp, lastTimestamp);
  lastTimestamp = timestamp;

  // Clear canvas to black each frame.
  renderer.clear('#000000');

  // Proof-of-life: log deltaTime every frame.
  console.log(
    `[Frame] deltaTime=${Time.deltaTime.toFixed(4)}s  totalTime=${Time.totalTime.toFixed(2)}s`,
  );

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
