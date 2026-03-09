import type { ComputedNode } from './UITypes';

/** Options for the sci-fi chamfered panel renderer. */
export interface SciFiPanelOptions {
  /** Title text displayed in a solid header bar at the top of the panel. */
  title?: string;
  /** Size in px of the diagonal corner cut-offs (top-left and bottom-right). Default: 10. */
  chamfer?: number;
  /** Alpha (0–1) applied to the gradient fill. Default: 0.92. */
  alpha?: number;
  /** CSS colour string for the 2px border. Default: '#4c5866'. */
  borderColor?: string;
}

/**
 * Utility class for drawing polished sci-fi UI panels directly onto a
 * CanvasRenderingContext2D.  All methods are static — no instantiation needed.
 *
 * Usage:
 *   UIRenderer.drawSciFiPanel(renderer.getContext(), x, y, w, h, { title: 'WEAPONS', chamfer: 10 });
 */
export class UIRenderer {
  /**
   * Draws a sci-fi style panel with:
   *   • Chamfered (diagonally cut) top-left and bottom-right corners.
   *   • Vertical dark gradient fill.
   *   • 2px coloured border.
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
    const chamfer     = options.chamfer     ?? 20;
    const alpha       = options.alpha       ?? 0.92;
    const borderColor = options.borderColor ?? '#ffffff';
    const w = width;
    const h = height;

    // ── Chamfered polygon path ───────────────────────────────────────────────
    // Top-left and bottom-right corners are cut diagonally by `chamfer` px.
    ctx.beginPath();
    ctx.moveTo(x + chamfer, y);           // top edge, left of top-left corner
    ctx.lineTo(x + w,       y);           // top-right corner (square)
    ctx.lineTo(x + w,       y + h - chamfer); // right edge, above bottom-right corner
    ctx.lineTo(x + w - chamfer, y + h);   // bottom-right chamfer point
    ctx.lineTo(x,           y + h);       // bottom-left corner (square)
    ctx.lineTo(x,           y + chamfer); // left edge, below top-left corner
    ctx.closePath();                       // closes back to (x + chamfer, y)

    // ── Vertical gradient fill ───────────────────────────────────────────────
    const grad = ctx.createLinearGradient(x, y, x, y + h);
    grad.addColorStop(0, `rgba(30,35,45,${alpha})`);
    grad.addColorStop(1, `rgba(15,18,25,${alpha})`);
    ctx.fillStyle = grad;
    ctx.fill();

    // ── Border stroke ────────────────────────────────────────────────────────
    ctx.strokeStyle = borderColor;
    ctx.lineWidth   = 3;
    ctx.stroke();

    // ── Optional title header ────────────────────────────────────────────────
    if (options.title !== undefined && options.title.length > 0) {
      const HEADER_H = 28;

      // Clip to the top portion of the chamfered shape so the solid header
      // fill does not bleed outside the angled top-left corner.
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + chamfer, y);
      ctx.lineTo(x + w,       y);
      ctx.lineTo(x + w,       y + HEADER_H);
      ctx.lineTo(x,           y + HEADER_H);
      ctx.lineTo(x,           y + chamfer);
      ctx.closePath();
      ctx.clip();

      ctx.fillStyle = 'rgba(40,50,65,0.95)';
      ctx.fillRect(x, y, w, HEADER_H);
      ctx.restore();

      // Re-stroke the border so it isn't painted over by the header fill.
      ctx.beginPath();
      ctx.moveTo(x + chamfer, y);
      ctx.lineTo(x + w,       y);
      ctx.lineTo(x + w,       y + h - chamfer);
      ctx.lineTo(x + w - chamfer, y + h);
      ctx.lineTo(x,           y + h);
      ctx.lineTo(x,           y + chamfer);
      ctx.closePath();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth   = 2;
      ctx.stroke();

      // Separator line beneath the header.
      ctx.beginPath();
      ctx.moveTo(x + 4, y + HEADER_H);
      ctx.lineTo(x + w - 4, y + HEADER_H);
      ctx.strokeStyle = borderColor;
      ctx.lineWidth   = 1;
      ctx.stroke();

      // Title text — bold, uppercase, centred in header.
      ctx.font      = 'bold 12px monospace';
      ctx.fillStyle = '#b8c8d8';
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
      // Cast content to SciFiPanelOptions — callers are responsible for type consistency.
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
    // Row, Column, Spacer — no visual output; fall through to children.

    for (const child of node.children) {
      UIRenderer.renderTree(ctx, child);
    }
  }
}
