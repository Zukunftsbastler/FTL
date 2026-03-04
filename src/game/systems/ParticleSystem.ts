import { Time } from '../../engine/Time';
import type { IRenderer } from '../../engine/IRenderer';
import type { ParticleComponent } from '../components/ParticleComponent';

/** Palette of warm spark colours cycled randomly per-particle. */
const SPARK_COLORS = ['#ff8800', '#ffcc00', '#ff4400', '#ffee44', '#ff6600'];

/**
 * Self-contained particle system.
 *
 * Particles are plain objects stored in an internal pool (not ECS entities).
 * Call `spawnBurst` to create a burst of impact sparks, then `update` each
 * frame to advance positions, fade particles, and render them.
 */
export class ParticleSystem {
  private readonly renderer: IRenderer;
  private readonly pool: ParticleComponent[] = [];

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  /**
   * Spawns `count` orange/yellow spark particles radiating outward from (x, y).
   * Call this when a projectile impacts a room or shield.
   */
  spawnBurst(x: number, y: number, count: number = 12): void {
    for (let i = 0; i < count; i++) {
      const angle   = Math.random() * Math.PI * 2;
      const speed   = 40 + Math.random() * 120;
      const life    = 0.25 + Math.random() * 0.35;
      const color   = SPARK_COLORS[Math.floor(Math.random() * SPARK_COLORS.length)];
      const size    = 1 + Math.random() * 3;

      this.pool.push({
        x, y,
        vx:      Math.cos(angle) * speed,
        vy:      Math.sin(angle) * speed,
        life,
        maxLife: life,
        color,
        size,
      });
    }
  }

  /**
   * Advances all particle positions, removes dead particles, and renders
   * surviving particles to the canvas as fading coloured squares.
   */
  update(): void {
    if (this.pool.length === 0) return;

    const dt  = Time.deltaTime;
    const ctx = this.renderer.getContext();

    for (let i = this.pool.length - 1; i >= 0; i--) {
      const p = this.pool[i];

      p.x    += p.vx * dt;
      p.y    += p.vy * dt;
      p.life -= dt;

      if (p.life <= 0) {
        this.pool.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      ctx.globalAlpha = alpha;
      ctx.fillStyle   = p.color;
      ctx.fillRect(
        Math.round(p.x - p.size / 2),
        Math.round(p.y - p.size / 2),
        Math.ceil(p.size),
        Math.ceil(p.size),
      );
    }

    // Always reset globalAlpha so subsequent canvas draws are not affected.
    ctx.globalAlpha = 1;
  }
}
