import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { ProjectileComponent } from '../components/ProjectileComponent';

/**
 * Renders all in-flight projectiles with procedural VFX:
 *   LASER  — neon glowing line (ctx.shadowBlur)
 *   ION    — plasma pulse: white core circle + oscillating cyan ring
 *   MISSILE — fading line trail + metal body rectangle
 */
export class ProjectileRenderSystem {
  private readonly renderer: IRenderer;

  constructor(renderer: IRenderer) {
    this.renderer = renderer;
  }

  update(world: IWorld): void {
    const ctx = this.renderer.getContext();
    ctx.save();

    for (const entity of world.query(['Projectile', 'Position'])) {
      const proj = world.getComponent<ProjectileComponent>(entity, 'Projectile');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (proj === undefined || pos === undefined) continue;

      // Skip projectiles that have already reached their destination.
      const dx   = proj.targetX - pos.x;
      const dy   = proj.targetY - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;

      switch (proj.visualType) {
        case 'MISSILE': this.drawMissile(ctx, proj, pos, dx, dy); break;
        case 'ION':     this.drawIon(ctx, proj, pos);             break;
        default:        this.drawLaser(ctx, proj, pos);           break;  // LASER, BEAM, …
      }
    }

    ctx.restore();
  }

  // ── Per-type draw helpers ─────────────────────────────────────────────────

  /**
   * LASER — bright white bolt with a coloured neon glow.
   * shadowBlur is reset immediately after stroking to avoid polluting later draws.
   */
  private drawLaser(
    ctx: CanvasRenderingContext2D,
    proj: ProjectileComponent,
    pos: PositionComponent,
  ): void {
    const glowColor = proj.isEnemyOrigin ? '#ff3333' : '#39ff14';
    const startX    = proj.history.length > 0 ? proj.history[0].x : proj.originX;
    const startY    = proj.history.length > 0 ? proj.history[0].y : proj.originY;

    ctx.shadowBlur  = 12;
    ctx.shadowColor = glowColor;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  /**
   * ION — white plasma core with an oscillating cyan ring.
   */
  private drawIon(
    ctx: CanvasRenderingContext2D,
    _proj: ProjectileComponent,
    pos: PositionComponent,
  ): void {
    ctx.shadowBlur  = 15;
    ctx.shadowColor = '#00ffff';

    // White core circle.
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
    ctx.fill();

    // Outer ring whose radius oscillates slightly.
    const ringR     = 7 + Math.sin(Date.now() / 150) * 2;
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, ringR, 0, Math.PI * 2);
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  /**
   * MISSILE — per-segment fading trail (oldest = thinnest) plus a metal body rectangle.
   */
  private drawMissile(
    ctx: CanvasRenderingContext2D,
    proj: ProjectileComponent,
    pos: PositionComponent,
    dx: number,
    dy: number,
  ): void {
    // Draw trail as individual segments so lineWidth can taper oldest → newest.
    const hist = proj.history;
    if (hist.length > 1) {
      for (let i = 0; i < hist.length - 1; i++) {
        const t          = (i + 1) / hist.length;  // 0 = oldest tail, 1 = current
        ctx.strokeStyle  = `rgba(200,200,200,${(0.5 * t).toFixed(2)})`;
        ctx.lineWidth    = Math.max(0.5, t * 2);
        ctx.beginPath();
        ctx.moveTo(hist[i].x, hist[i].y);
        ctx.lineTo(hist[i + 1].x, hist[i + 1].y);
        ctx.stroke();
      }
    }

    // Missile body: small grey rectangle oriented toward the target.
    const angle = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(-6, -2, 12, 4);
    ctx.restore();
  }
}
