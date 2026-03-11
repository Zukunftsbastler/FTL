import { TILE_SIZE } from '../constants';
import type { ShipTemplate } from '../data/ShipTemplate';

/**
 * Draws a miniature, geometrically accurate outline of a ship at (cx, cy).
 *
 * The icon is centred on the given point and scaled uniformly.  Each room
 * in the template is rendered as a filled + outlined rectangle using the
 * standard TILE_SIZE grid coordinates.
 *
 * @param ctx      Canvas 2D context to draw into.
 * @param template Ship template whose `rooms` array defines the geometry.
 * @param cx       Centre X of the icon.
 * @param cy       Centre Y of the icon.
 * @param scale    Pixel size per tile (e.g. TILE_SIZE * 0.12 ≈ 6.6 px/tile).
 * @param color    CSS colour string for fill and stroke.
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

  // Bounding box in tile-space.
  const maxTX = template.rooms.reduce((m, r) => Math.max(m, r.x + r.width),  0);
  const maxTY = template.rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0);

  // Pixel size of the full icon.
  const iconW = maxTX * TILE_SIZE * scale;
  const iconH = maxTY * TILE_SIZE * scale;

  ctx.save();
  ctx.translate(cx - iconW / 2, cy - iconH / 2);

  for (const room of template.rooms) {
    const rx = room.x  * TILE_SIZE * scale;
    const ry = room.y  * TILE_SIZE * scale;
    const rw = room.width  * TILE_SIZE * scale;
    const rh = room.height * TILE_SIZE * scale;

    ctx.fillStyle   = color + '55';   // 33 % alpha fill
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    ctx.fillRect(rx, ry, rw, rh);
    ctx.strokeRect(rx, ry, rw, rh);
  }

  ctx.restore();
}
