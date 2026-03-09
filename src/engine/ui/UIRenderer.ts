import type { ComputedNode } from './UITypes';

/** Options for the sci-fi chamfered panel renderer. */
export interface SciFiPanelOptions {
  /** Title text displayed in a solid header bar at the top of the panel. */
  title?: string;
  /**
   * Size in px of the bottom-right diagonal corner cut.
   * Default: Math.floor(panelHeight * 2 / 3) — two-thirds of the height.
   */
  chamfer?: number;
  /** Alpha (0–1) applied to the gradient fill. Default: 0.92. */
  alpha?: number;
  /** CSS colour string for the 3px border. Default: '#ffffff'. */
  borderColor?: string;
  /**
   * When true the left edge is perfectly straight (no top-left bevel).
   * Use this for panels anchored to the left edge of the screen (x = 0).
   */
  noLeftChamfer?: boolean;
  /**
   * When true uses a white/light gradient instead of the default dark one.
   * Text drawn on top should use dark colours for contrast.
   */
  lightBg?: boolean;
}

/**
 * Utility class for drawing polished sci-fi UI panels directly onto a
 * CanvasRenderingContext2D.  All methods are static — no instantiation needed.
 *
 * Usage:
 *   UIRenderer.drawSciFiPanel(renderer.getContext(), x, y, w, h, { title: 'WEAPONS' });
 */
export class UIRenderer {
  /**
   * Draws a sci-fi style panel with:
   *   • Chamfered bottom-right corner (and optionally top-left).
   *   • Vertical gradient fill (dark by default, white when lightBg = true).
   *   • 3px coloured border.
   *   • Optional solid header bar with a bold uppercase title.
   */
  static drawSciFiPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    options: SciFiPanelOptions = {},
  ): void {
    const chamfer  = options.chamfer        ?? Math.floor(height * 2 / 3);
    const alpha    = options.alpha          ?? 0.92;
    const border   = options.borderColor    ?? '#ffffff';
    const noLeft   = options.noLeftChamfer  ?? false;
    const lightBg  = options.lightBg        ?? false;
    const w = width;
    const h = height;

    // ── Build the polygon path ────────────────────────────────────────────────
    const path = (): void => {
      ctx.beginPath();
      if (noLeft) {
        ctx.moveTo(x,             y);               // top-left  (square)
      } else {
        ctx.moveTo(x + chamfer,   y);               // top edge, past top-left cut
      }
      ctx.lineTo(x + w,           y);               // top-right (square)
      ctx.lineTo(x + w,           y + h - chamfer); // right edge
      ctx.lineTo(x + w - chamfer, y + h);           // bottom-right cut
      ctx.lineTo(x,               y + h);           // bottom-left (square)
      if (!noLeft) {
        ctx.lineTo(x,             y + chamfer);      // left edge, past top-left cut
      }
      ctx.closePath();
    };

    path();

    // ── Vertical gradient fill ────────────────────────────────────────────────
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    if (lightBg) {
      grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
      grad.addColorStop(1, `rgba(220,228,240,${alpha})`);
    } else {
      grad.addColorStop(0, `rgba(30,35,45,${alpha})`);
      grad.addColorStop(1, `rgba(15,18,25,${alpha})`);
    }
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Border stroke ─────────────────────────────────────────────────────────
    ctx.strokeStyle = border;
    ctx.lineWidth   = 3;
    ctx.stroke();

    // ── Optional title header ─────────────────────────────────────────────────
    if (options.title !== undefined && options.title.length > 0) {
      const HEADER_H = 28;

      // Clip to header region so the fill stays inside the chamfered shape.
      ctx.save();
      ctx.beginPath();
      if (noLeft) {
        ctx.moveTo(x,           y);
      } else {
        ctx.moveTo(x + chamfer, y);
      }
      ctx.lineTo(x + w,   y);
      ctx.lineTo(x + w,   y + HEADER_H);
      ctx.lineTo(x,       y + HEADER_H);
      if (!noLeft) ctx.lineTo(x, y + chamfer);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = lightBg ? 'rgba(190,210,235,0.97)' : 'rgba(40,50,65,0.95)';
      ctx.fillRect(x, y, w, HEADER_H);
      ctx.restore();

      // Re-stroke the main border on top of the header fill.
      path();
      ctx.strokeStyle = border;
      ctx.lineWidth   = 3;
      ctx.stroke();

      // Separator beneath the header.
      ctx.beginPath();
      ctx.moveTo(x + 4,     y + HEADER_H);
      ctx.lineTo(x + w - 4, y + HEADER_H);
      ctx.strokeStyle = border;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Title text.
      ctx.font      = 'bold 12px monospace';
      ctx.fillStyle = lightBg ? '#001830' : '#b8c8d8';
      ctx.textAlign = 'center';
      ctx.fillText(options.title.toUpperCase(), x + w / 2, y + HEADER_H / 2 + 5);
    }
  }

  // ── Pill / tag renderer ───────────────────────────────────────────────────

  /**
   * Draws a rounded-rectangle "pill" filled with `fillColor`.
   * Use this as a backdrop before rendering label text for high-contrast readability.
   */
  static drawPill(
    ctx:       CanvasRenderingContext2D,
    x:         number,
    y:         number,
    w:         number,
    h:         number,
    fillColor: string,
  ): void {
    const r = Math.min(h / 2, 10);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y,     x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h,     x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y,         x + r, y);
    ctx.closePath();
    ctx.fillStyle = fillColor;
    ctx.fill();
  }

  // ── Declarative tree renderer ─────────────────────────────────────────────

  /**
   * Recursively traverses a fully-solved `ComputedNode` tree and renders
   * each node to the canvas according to its type:
   *
   *   Panel  → drawSciFiPanel  (reads SciFiPanelOptions from node.content)
   *   Text   → ctx.fillText    (reads string from node.content)
   *   Row / Column / Spacer → invisible containers; only their children are rendered
   */
  static renderTree(ctx: CanvasRenderingContext2D, node: ComputedNode): void {
    const { type } = node.node;
    const { x, y, w, h } = node.bounds;

    if (type === 'Panel') {
      const opts = (node.node.content ?? {}) as SciFiPanelOptions;
      UIRenderer.drawSciFiPanel(ctx, x, y, w, h, opts);
    } else if (type === 'Text') {
      const text = typeof node.node.content === 'string' ? node.node.content : '';
      if (text.length > 0) {
        ctx.font      = '13px monospace';
        ctx.fillStyle = '#aabbcc';
        ctx.textAlign = 'left';
        ctx.fillText(text, x, y + h / 2 + 5);
      }
    }

    for (const child of node.children) {
      UIRenderer.renderTree(ctx, child);
    }
  }
}
