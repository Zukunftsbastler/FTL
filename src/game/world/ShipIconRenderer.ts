import { TILE_SIZE } from '../constants';
import type { ShipTemplate } from '../data/ShipTemplate';

// ── Faction colour palettes (mirroring ShipGenerator) ─────────────────────────
type RGB = [number, number, number];
const PALETTES: Record<string, { hull: RGB; accent: RGB }> = {
  PLAYER: { hull: [0.52, 0.56, 0.60], accent: [0.88, 0.44, 0.10] },
  ENEMY:  { hull: [0.22, 0.27, 0.40], accent: [0.75, 0.15, 0.12] },
};
const DEFAULT_PAL = { hull: [0.45, 0.47, 0.50] as RGB, accent: [0.60, 0.60, 0.65] as RGB };

function toCSS(rgb: RGB, alpha = 1): string {
  return `rgba(${Math.round(rgb[0]*255)},${Math.round(rgb[1]*255)},${Math.round(rgb[2]*255)},${alpha})`;
}
function lighten(rgb: RGB, d: number): RGB {
  return [Math.min(1, rgb[0]+d), Math.min(1, rgb[1]+d), Math.min(1, rgb[2]+d)];
}

/**
 * Draws a complete ship icon centred on (cx, cy) with three layers:
 *
 *   Layer 1 — Aerodynamic chassis polygon with wing flares and nacelles,
 *              matching the proportions used by the combat WebGL hull shader.
 *   Layer 2 — Room grid drawn with translucent fills and colour accent borders.
 *
 * @param ctx      Canvas 2D context.
 * @param template Ship template whose `rooms` array defines the geometry.
 * @param cx       Centre X of the icon.
 * @param cy       Centre Y of the icon.
 * @param scale    Fractional multiplier applied to TILE_SIZE
 *                 (0.09 ≈ tiny map marker; 0.85 ≈ large Hangar preview).
 * @param color    Accent colour used for room stroke / fill tint.
 * @param faction  'PLAYER' or 'ENEMY' — selects the hull colour palette.
 */
export function drawShipIcon(
  ctx:     CanvasRenderingContext2D,
  template: ShipTemplate,
  cx:      number,
  cy:      number,
  scale:   number,
  color:   string,
  faction: 'PLAYER' | 'ENEMY' = 'PLAYER',
): void {
  if (!template.rooms || template.rooms.length === 0) return;

  const ts = TILE_SIZE * scale;

  // Room bounding box (tile space).
  const minTX = template.rooms.reduce((m, r) => Math.min(m, r.x),           Infinity);
  const minTY = template.rooms.reduce((m, r) => Math.min(m, r.y),           Infinity);
  const maxTX = template.rooms.reduce((m, r) => Math.max(m, r.x + r.width),  0);
  const maxTY = template.rooms.reduce((m, r) => Math.max(m, r.y + r.height), 0);

  const iconW = (maxTX - minTX) * ts;
  const iconH = (maxTY - minTY) * ts;
  const lx    = minTX * ts;
  const rx    = maxTX * ts;
  const midY  = (minTY + maxTY) / 2 * ts;

  // Palette.
  const pal      = PALETTES[faction] ?? DEFAULT_PAL;
  const hullFill = toCSS(pal.hull, 0.92);
  const hullRim  = toCSS(lighten(pal.hull, 0.22), 1.0);
  const nacFill  = toCSS(pal.accent, 0.80);

  ctx.save();
  // Origin at rooms' top-left; icon centred on (cx, cy).
  ctx.translate(cx - iconW / 2 - minTX * ts, cy - iconH / 2 - minTY * ts);

  const lw = Math.max(0.5, ts * 0.10);

  // ── Layer 1a: aerodynamic chassis polygon ─────────────────────────────────
  // Proportions match the ShipGenerator mask:
  //   wing flare   ≈ 0.25 × iconH beyond room top/bottom
  //   nose tip     ≈ 0.38 × iconH beyond room front
  //   rear notch   ≈ 0.05 × iconW inward at ship rear
  const wFlare  = iconH * 0.25;
  const noseTip = iconH * 0.38;
  const notch   = iconW * 0.05;

  ctx.fillStyle   = hullFill;
  ctx.strokeStyle = hullRim;
  ctx.lineWidth   = lw;
  ctx.lineJoin    = 'round';

  ctx.beginPath();
  if (faction === 'PLAYER') {
    ctx.moveTo(lx,               minTY * ts - wFlare); // rear top wing
    ctx.lineTo(rx + noseTip,     midY);                // nose tip (→)
    ctx.lineTo(lx,               maxTY * ts + wFlare); // rear bottom wing
    ctx.lineTo(lx - notch,       midY);                // rear centre notch
  } else {
    ctx.moveTo(rx,               minTY * ts - wFlare); // rear top wing
    ctx.lineTo(lx - noseTip,     midY);                // nose tip (←)
    ctx.lineTo(rx,               maxTY * ts + wFlare); // rear bottom wing
    ctx.lineTo(rx + notch,       midY);                // rear centre notch
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // ── Layer 1b: engine nacelles ─────────────────────────────────────────────
  // Two rectangular blocks behind the ship rear, each above/below centre.
  const nacW   = Math.max(1, iconW * 0.09);
  const nacH   = Math.max(1, iconH * 0.09);
  const nacGap = iconH * 0.17;

  ctx.fillStyle   = nacFill;
  ctx.strokeStyle = hullRim;
  ctx.lineWidth   = Math.max(0.3, lw * 0.6);

  const nacX = faction === 'PLAYER' ? lx - nacW : rx;
  for (const sign of [-1, 1]) {
    const ny = midY + sign * nacGap - nacH / 2;
    ctx.fillRect(nacX, ny, nacW, nacH);
    ctx.strokeRect(nacX, ny, nacW, nacH);
  }

  // ── Layer 2: room grid ────────────────────────────────────────────────────
  ctx.strokeStyle = color;
  ctx.lineWidth   = Math.max(0.5, ts * 0.06);

  for (const room of template.rooms) {
    const rrx = room.x     * ts;
    const rry = room.y     * ts;
    const rrw = room.width  * ts;
    const rrh = room.height * ts;
    ctx.fillStyle = color + '22';
    ctx.fillRect(rrx, rry, rrw, rrh);
    ctx.strokeRect(rrx, rry, rrw, rrh);
  }

  ctx.restore();
}
