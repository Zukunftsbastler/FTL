import { TILE_SIZE } from '../constants';
import type { ShipTemplate } from '../data/ShipTemplate';

/** Extra tile-space padding added around all rooms to form the hull silhouette. */
const HULL_PAD_TILES = 0.35;

/**
 * Draws a two-layer ship icon centred on (cx, cy):
 *
 *   Layer 1 — Hull silhouette: bounding box of all rooms expanded by
 *             HULL_PAD_TILES, filled dark (`#1e2030`) with a grey stroke.
 *   Layer 2 — Rooms: each room drawn as a translucent rectangle with a
 *             coloured border so internal structure is visible.
 *
 * @param ctx      Canvas 2D context.
 * @param template Ship template whose `rooms` array defines the geometry.
 * @param cx       Centre X of the icon.
 * @param cy       Centre Y of the icon.
 * @param scale    Fractional multiplier applied to TILE_SIZE
 *                 (e.g. 0.09 → each tile ≈ 5 px; 0.85 → each tile ≈ 47 px).
 * @param color    Accent colour used for room stroke and fill tint.
 */
export function drawShipIcon(
  ctx:      CanvasRenderingContext2D,
  template: ShipTemplate,
  cx:       number,
  cy:       number,
  scale:    number,
  color:    string,
): void {
  if (!template.rooms || template.rooms.length === 0) return;

  const ts = TILE_SIZE * scale;   // pixels per tile at this scale

  // Full bounding box (tile space).
  const minTX = template.rooms.reduce((m, r) => Math.min(m, r.x), Infinity);
  const minTY = template.rooms.reduce((m, r) => Math.min(m, r.y), Infinity);
  const maxTX = template.rooms.reduce((m, r) => Math.max(m, r.x + r.width),  0);
  const maxTY = template.rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0);

  const iconW = (maxTX - minTX) * ts;
  const iconH = (maxTY - minTY) * ts;

  // Hull padding in pixels.
  const pad = HULL_PAD_TILES * ts;

  ctx.save();
  // Translate so rooms start at (0,0) inside the saved context, centred on (cx,cy).
  ctx.translate(cx - iconW / 2 - minTX * ts, cy - iconH / 2 - minTY * ts);

  // ── Layer 1: hull silhouette ──────────────────────────────────────────────
  ctx.fillStyle   = '#1e2030';
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth   = Math.max(0.5, ts * 0.08);
  ctx.fillRect(  minTX * ts - pad, minTY * ts - pad, iconW + pad * 2, iconH + pad * 2);
  ctx.strokeRect(minTX * ts - pad, minTY * ts - pad, iconW + pad * 2, iconH + pad * 2);

  // ── Layer 2: rooms ────────────────────────────────────────────────────────
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(0.5, ts * 0.06);

  for (const room of template.rooms) {
    const rx = room.x      * ts;
    const ry = room.y      * ts;
    const rw = room.width  * ts;
    const rh = room.height * ts;

    ctx.fillStyle = color + '22';   // ~13 % alpha tint
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  ctx.restore();
}
