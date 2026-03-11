import { GameStateData } from '../../engine/GameState';
import { UIRenderer }    from '../../engine/ui/UIRenderer';
import { AssetLoader }   from '../../utils/AssetLoader';
import { drawShipIcon }  from '../world/ShipIconRenderer';
import type { IInput }          from '../../engine/IInput';
import type { IRenderer }       from '../../engine/IRenderer';
import type { SectorNode }      from '../data/SectorNode';
import type { SectorTemplate }  from '../data/SectorTemplate';
import type { ShipTemplate }    from '../data/ShipTemplate';

// ── Layout constants ───────────────────────────────────────────────────────────

const MARGIN_X   = 80;
const MARGIN_TOP = 90;
const MARGIN_BOT = 80;
const NODE_R     = 22;

const TYPE_COLORS: Record<string, string> = {
  CIVILIAN: '#44ff44',
  HOSTILE:  '#ff4444',
  NEBULA:   '#aa44ff',
  BOSS:     '#ff2222',
};

/**
 * Renders and handles the overarching sector-selection DAG.
 *
 * Call `draw()` each frame while in the SECTOR_MAP_SELECTION state.
 * When the player clicks a valid next-sector node, `onSelect` is called
 * with the chosen SectorNode so main.ts can advance the game state.
 */
export class SectorMapSystem {
  draw(
    renderer: IRenderer,
    input:    IInput,
    onSelect: (node: SectorNode, template: SectorTemplate) => void,
  ): void {
    const { width, height } = renderer.getCanvasSize();
    const ctx               = renderer.getContext();
    const mouse             = input.getMousePosition();

    const tree       = GameStateData.sectorTree;
    const curId      = GameStateData.currentSectorNodeId;
    const curNode    = tree.find((n) => n.id === curId);
    const reachable  = new Set(curNode?.nextNodeIds ?? []);
    const templates  = AssetLoader.getJSON<SectorTemplate[]>('sectors') ?? [];

    renderer.clear('#000a18');

    // ── Title panel ──────────────────────────────────────────────────────────
    UIRenderer.drawSciFiPanel(ctx, width / 2 - 200, 8, 400, 52,
      { chamfer: 10, borderColor: '#44aaff', alpha: 0.96 });
    renderer.drawText('SECTOR MAP', width / 2, 42,
      'bold 18px monospace', '#88ddff', 'center');

    // ── Compute node screen positions ─────────────────────────────────────────
    const usableW = width  - MARGIN_X * 2;
    const usableH = height - MARGIN_TOP - MARGIN_BOT;

    const byLevel = new Map<number, SectorNode[]>();
    for (const node of tree) {
      if (!byLevel.has(node.level)) byLevel.set(node.level, []);
      byLevel.get(node.level)!.push(node);
    }

    const positions = new Map<number, { x: number; y: number }>();
    for (const [level, nodes] of byLevel) {
      const nx   = MARGIN_X + ((level - 1) / 7) * usableW;
      const step = usableH / (nodes.length + 1);
      nodes.forEach((n, i) => {
        positions.set(n.id, { x: Math.round(nx), y: Math.round(MARGIN_TOP + step * (i + 1)) });
      });
    }

    // ── Edges ─────────────────────────────────────────────────────────────────
    for (const node of tree) {
      const from = positions.get(node.id);
      if (from === undefined) continue;
      for (const nextId of node.nextNodeIds) {
        const to = positions.get(nextId);
        if (to === undefined) continue;
        const isLive = node.id === curId && reachable.has(nextId);
        renderer.drawLine(from.x, from.y, to.x, to.y,
          isLive ? '#4488ff' : '#1c3a55', isLive ? 2 : 1);
      }
    }

    // ── Nodes ─────────────────────────────────────────────────────────────────
    let hoveredNode: SectorNode | null = null;

    for (const node of tree) {
      const pos = positions.get(node.id);
      if (pos === undefined) continue;

      const isCurrent   = node.id === curId;
      const isReachable = reachable.has(node.id);
      const isPast      = node.level < (curNode?.level ?? 1);
      const tmpl        = templates.find((t) => t.id === node.sectorTemplateId);
      const typeColor   = TYPE_COLORS[tmpl?.type ?? 'CIVILIAN'] ?? '#44aacc';

      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      const isHovered = dx * dx + dy * dy <= NODE_R * NODE_R;
      if (isHovered) hoveredNode = node;

      const fillColor = isCurrent   ? '#1a4466'
        : isPast       ? '#0d1520'
        : isReachable  ? typeColor
        :                '#0d1520';

      const borderColor = isCurrent   ? '#ffffff'
        : isReachable   ? '#88bbff'
        : isHovered     ? '#557799'
        :                 '#1c3a55';

      // Shadow.
      renderer.drawCircle(pos.x + 3, pos.y + 4, NODE_R, 'rgba(0,0,0,0.55)', true);
      // Fill.
      renderer.drawCircle(pos.x, pos.y, NODE_R, fillColor, true);
      // Border.
      renderer.drawCircle(pos.x, pos.y, NODE_R, borderColor, false, isCurrent ? 2.5 : 1.5);
      // Level label.
      renderer.drawText(String(node.level), pos.x, pos.y + 5,
        'bold 12px monospace', isCurrent ? '#ffffff' : (isPast ? '#334455' : '#aaccee'), 'center');
    }

    // ── Hover tooltip ─────────────────────────────────────────────────────────
    if (hoveredNode !== null) {
      const tmpl    = templates.find((t) => t.id === hoveredNode!.sectorTemplateId);
      const ttLines: string[] = [
        `Level ${hoveredNode.level}  ·  ${tmpl?.type ?? ''}`,
        tmpl?.description?.slice(0, 48) ?? '',
      ].filter((l) => l.length > 0);

      const TTW = 280;
      const TTH = ttLines.length * 20 + 28;
      let ttx = mouse.x + 16;
      let tty = mouse.y - TTH - 8;
      if (ttx + TTW > width  - 8) ttx = mouse.x - TTW - 8;
      if (tty < 8)                tty = mouse.y + 16;

      UIRenderer.drawSciFiPanel(ctx, ttx, tty, TTW, TTH,
        { chamfer: 8, borderColor: '#44aaff', alpha: 0.97 });
      renderer.drawText(
        (tmpl?.name ?? hoveredNode.sectorTemplateId).toUpperCase(),
        ttx + TTW / 2, tty + 18,
        'bold 11px monospace', '#88ddff', 'center',
      );
      for (let i = 0; i < ttLines.length; i++) {
        renderer.drawText(ttLines[i], ttx + 12, tty + 34 + i * 20,
          '10px monospace', '#99aabb', 'left');
      }
    }

    // ── Legend (bottom-right) ─────────────────────────────────────────────────
    {
      const LW = 180; const LH = 88; const LX = width - LW - 10; const LY = height - LH - 10;
      UIRenderer.drawSciFiPanel(ctx, LX, LY, LW, LH,
        { chamfer: 8, lightBg: true, borderColor: '#ffffff', alpha: 0.92 });
      renderer.drawText('SECTOR TYPES', LX + LW / 2, LY + 14, '9px monospace', '#001830', 'center');
      const legendEntries: Array<[string, string]> = [
        ['#44ff44', 'Civilian'],
        ['#ff4444', 'Hostile'],
        ['#aa44ff', 'Nebula'],
        ['#ff2222', 'Boss'],
      ];
      legendEntries.forEach(([color, label], i) => {
        const ey = LY + 26 + i * 16;
        ctx.fillStyle = color;
        ctx.fillRect(LX + 10, ey, 10, 10);
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 0.5; ctx.strokeRect(LX + 10, ey, 10, 10);
        renderer.drawText(label, LX + 26, ey + 9, '10px monospace', '#001830', 'left');
      });
    }

    // ── Player ship icon at current sector node ────────────────────────────────
    {
      const shipId = GameStateData.playerShipTemplateId;
      const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships') ?? [];
      const shipTpl  = allShips.find((s) => s.id === shipId);
      if (shipTpl !== undefined && curNode !== undefined) {
        const pos = positions.get(curNode.id);
        if (pos !== undefined) {
          drawShipIcon(ctx, shipTpl, pos.x, pos.y - NODE_R - 20, 0.09, '#00ffcc');
        }
      }
    }

    // ── Bottom hint ───────────────────────────────────────────────────────────
    renderer.drawText('Click a highlighted sector to jump there.',
      width / 2, height - 18, '11px monospace', '#445566', 'center');

    // ── Click handling ────────────────────────────────────────────────────────
    if (input.isMouseJustPressed(0)) {
      for (const node of tree) {
        if (!reachable.has(node.id)) continue;
        const pos = positions.get(node.id);
        if (pos === undefined) continue;
        const dx = mouse.x - pos.x;
        const dy = mouse.y - pos.y;
        if (dx * dx + dy * dy <= NODE_R * NODE_R) {
          const tmpl = templates.find((t) => t.id === node.sectorTemplateId);
          if (tmpl !== undefined) onSelect(node, tmpl);
          break;
        }
      }
    }
  }
}
