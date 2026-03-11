import { AssetLoader } from '../../utils/AssetLoader';
import { GameStateData } from '../../engine/GameState';
import { NarrativeSystem } from './NarrativeSystem';
import { getPlanetNodeColor } from '../world/PlanetGenerator';
import { BackgroundGenerator } from '../world/BackgroundGenerator';
import { drawShipIcon }        from '../world/ShipIconRenderer';
import type { MapTheme }       from '../world/BackgroundGenerator';
import type { ShipTemplate }   from '../data/ShipTemplate';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SectorTemplate } from '../data/SectorTemplate';
import { UIRenderer } from '../../engine/ui/UIRenderer';

// ── Segment intersection helpers ──────────────────────────────────────────────

/**
 * Signed area of triangle (A, B, C) via cross product.
 * Positive = CCW, negative = CW, zero = collinear.
 */
function orient(
  ax: number, ay: number,
  bx: number, by: number,
  cx: number, cy: number,
): number {
  return (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
}

/** True iff point P lies on segment AB (assumes P is collinear with A and B). */
function onSeg(
  px: number, py: number,
  ax: number, ay: number,
  bx: number, by: number,
): boolean {
  return (
    px >= Math.min(ax, bx) && px <= Math.max(ax, bx) &&
    py >= Math.min(ay, by) && py <= Math.max(ay, by)
  );
}

/**
 * Returns true if segments P1→Q1 and P2→Q2 properly intersect (cross or overlap).
 * Does NOT treat shared endpoints as intersections — callers handle that separately.
 */
function doIntersect(
  p1x: number, p1y: number, q1x: number, q1y: number,
  p2x: number, p2y: number, q2x: number, q2y: number,
): boolean {
  const d1 = orient(p2x, p2y, q2x, q2y, p1x, p1y);
  const d2 = orient(p2x, p2y, q2x, q2y, q1x, q1y);
  const d3 = orient(p1x, p1y, q1x, q1y, p2x, p2y);
  const d4 = orient(p1x, p1y, q1x, q1y, q2x, q2y);

  // Proper intersection: each segment straddles the other's supporting line.
  if (d1 * d2 < 0 && d3 * d4 < 0) return true;

  // Collinear / endpoint overlap cases.
  if (d1 === 0 && onSeg(p1x, p1y, p2x, p2y, q2x, q2y)) return true;
  if (d2 === 0 && onSeg(q1x, q1y, p2x, p2y, q2x, q2y)) return true;
  if (d3 === 0 && onSeg(p2x, p2y, p1x, p1y, q1x, q1y)) return true;
  if (d4 === 0 && onSeg(q2x, q2y, p1x, p1y, q1x, q1y)) return true;

  return false;
}

/**
 * True if edge (a,b) would cross edge (c,d) in the node list.
 * Edges that share a node ID are never considered intersecting.
 */
function edgesIntersect(
  a: number, b: number,
  c: number, d: number,
  nodes: ReadonlyArray<{ x: number; y: number }>,
): boolean {
  if (a === c || a === d || b === c || b === d) return false;
  return doIntersect(
    nodes[a].x, nodes[a].y, nodes[b].x, nodes[b].y,
    nodes[c].x, nodes[c].y, nodes[d].x, nodes[d].y,
  );
}

// ── Layout / style constants ──────────────────────────────────────────────────

const NODE_RADIUS          = 18;
/** Radius of the "unknown star" dot rendered for HIDDEN nodes. */
const NODE_HIDDEN_RADIUS   = 10;
const NODE_HIDDEN_FILL     = '#556677';
const NODE_HIDDEN_BORDER   = '#778899';
const NODE_CURRENT_RING    = '#ffffff';
const NODE_REACHABLE_RING  = '#44aaff';

/** Node fill colours by visibility / type. */
const NODE_VISITED_FILL    = '#1a2e3e';
// NODE_VISITED_BORDER removed — all beacons now use a white polygon border.
// NODE_ADJACENT_FILL / NODE_ADJACENT_BORDER replaced by inline dim-yellow diamond.
const NODE_EVENT_FILL      = '#aaddff';
const NODE_COMBAT_FILL     = '#cc4433';
const NODE_STORE_FILL      = '#44cc77';
const NODE_DISTRESS_FILL   = '#ddaa22';
const NODE_EXIT_FILL       = '#ffdd44';

const EDGE_COLOR           = '#1c3a55';
const EDGE_ACTIVE_COLOR    = '#3366aa';

const LABEL_FONT           = '11px monospace';
const LABEL_COLOR          = '#88aacc';
const ADJACENT_LABEL_COLOR = '#3a5060';
const EXIT_LABEL_COLOR     = '#ffee88';
const TAG_FONT             = '9px monospace';

const REBEL_FILL           = 'rgba(180,20,20,0.40)';
const REBEL_EDGE_COLOR     = '#cc2222';
const REBEL_LABEL_FONT     = '13px monospace';
const REBEL_LABEL_COLOR    = '#ff4444';

// HUD_FONT / HUD_MARGIN_X / HUD_MARGIN_Y removed — resource panel now uses inline layout.

/** How many pixels the rebel fleet advances per jump. */
const REBEL_ADVANCE        = 70;

/**
 * Starting X offset for the rebel fleet (negative = off the left edge).
 * A value of -250 means the fleet needs ~3–4 jumps before the red zone appears
 * on screen, giving the player breathing room to experience narrative events.
 */
const REBEL_START_X        = -250;

/** Left / right margin for START and EXIT node placement. */
const MARGIN_X             = 90;
/** Top / bottom margins for intermediate node placement. */
const MARGIN_TOP           = 130;
const MARGIN_BOT           = 80;

// ── Map data types ────────────────────────────────────────────────────────────

const HAZARD_TYPES = ['ASTEROIDS', 'SOLAR_FLARE', 'ION_STORM', 'NEBULA'] as const;
type HazardType = typeof HAZARD_TYPES[number];

const HAZARD_COLORS: Record<HazardType, string> = {
  ASTEROIDS:   '#cc8844',
  SOLAR_FLARE: '#ffaa22',
  ION_STORM:   '#44aaff',
  NEBULA:      '#9966cc',
};

/**
 * Fog-of-War visibility state for each node.
 *
 * HIDDEN   — player has no knowledge of this node.
 * ADJACENT — player knows the node exists (neighbour of a visited node) but not its contents.
 * VISIBLE  — contents are revealed (EXIT, DISTRESS, STORE when adjacent, or augment).
 * VISITED  — player has been here; full info always shown.
 */
type NodeVisibility = 'HIDDEN' | 'ADJACENT' | 'VISIBLE' | 'VISITED';

/** Pre-assigned category determines how the node is dispatched on jump. */
type NodeType = 'COMBAT' | 'STORE' | 'DISTRESS' | 'EVENT';

interface MapNode {
  id:         number;
  x:          number;
  y:          number;
  label:      string;
  isExit:     boolean;
  hazard:     HazardType | null;
  visibility: NodeVisibility;
  nodeType:   NodeType;
}

/**
 * Manages the procedurally-generated star map.
 *
 * Graph guarantees:
 *   • 16–22 nodes; START far-left, EXIT far-right.
 *   • A guaranteed left-to-right path via the sorted spine.
 *   • Extra edges only added when the `doIntersect` check confirms no crossing.
 *
 * Fog of War:
 *   • Nodes start HIDDEN. Visiting a node reveals its direct neighbours as ADJACENT.
 *   • DISTRESS and EXIT nodes start globally VISIBLE.
 *   • STORE nodes auto-upgrade from HIDDEN → VISIBLE when they become ADJACENT.
 *
 * Long-Range Scanners:
 *   • If the player has the `long_range_scanners` augment, ADJACENT COMBAT nodes
 *     show "[SHIP DETECTED]" and ADJACENT hazard nodes show "[HAZARD]".
 */
export class MapSystem {
  private nodes:            MapNode[] = [];
  private edges:            Array<[number, number]> = [];
  private currentNodeId:    number = 0;
  private rebelFleetX:      number = REBEL_START_X;
  private generated:        boolean = false;
  private sectorTemplate:   SectorTemplate | null = null;
  /** Cached procedural background canvas — generated once per sector in generate(). */
  private backgroundCanvas: HTMLCanvasElement | null = null;
  /** When set, generate() uses this template instead of picking randomly. */
  private forcedTemplate:   SectorTemplate | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  drawStarMap(
    renderer: IRenderer,
    input:    IInput,
    world:    IWorld,
    callbacks: {
      onCombat: (shipId: string) => void;
      onEvent:  (eventId?: string) => void;
      onStore:  () => void;
      onExit:   () => void;
      onShip?:  () => void;
    },
  ): void {
    const { width, height } = renderer.getCanvasSize();

    if (!this.generated) {
      this.generate(width, height);
      this.generated = true;
    }

    const mouse  = input.getMousePosition();
    const hasLRS = this.hasLRS(world);

    // Nodes the player can jump to from the current position:
    // all non-HIDDEN direct neighbours.
    const jumpableIds = new Set(
      this.edges
        .filter(([a, b]) => a === this.currentNodeId || b === this.currentNodeId)
        .map(([a, b]) => a === this.currentNodeId ? b : a)
        .filter(id => this.nodes[id].visibility !== 'HIDDEN'),
    );

    // ── Lazy quest-node assignment ────────────────────────────────────────────
    // For any unresolved quest (nodeId === null), find a node at the requested
    // BFS distance from the current position and bind it.
    for (const quest of GameStateData.activeQuests) {
      if (quest.nodeId !== null) continue;
      quest.nodeId = this.findNodeAtDistance(this.currentNodeId, quest.jumpsAway);
    }

    // ── Layer -1: Procedural space background ────────────────────────────────
    if (this.backgroundCanvas !== null) {
      renderer.drawCanvas(this.backgroundCanvas, 0, 0);
    }

    // ── Layer 0: Rebel Fleet red zone ────────────────────────────────────────
    if (this.rebelFleetX > 0) {
      renderer.drawRect(0, 0, this.rebelFleetX, height, REBEL_FILL, true);
      renderer.drawLine(this.rebelFleetX, 0, this.rebelFleetX, height, REBEL_EDGE_COLOR, 2);
      renderer.drawText(
        '⚠ REBEL FLEET',
        Math.max(6, this.rebelFleetX - 6), height / 2,
        REBEL_LABEL_FONT, REBEL_LABEL_COLOR, 'right',
      );
      // Register fleet anchor around the warning text.
      const textW = 90;
      GameStateData.uiAnchors['fleet'] = {
        x: Math.max(0, this.rebelFleetX - textW - 8), y: height / 2 - 22,
        w: textW, h: 28,
      };
    }

    // ── Layer 1: Edges ────────────────────────────────────────────────────────
    for (const [a, b] of this.edges) {
      const visA = this.nodes[a].visibility;
      const visB = this.nodes[b].visibility;
      // Only draw if at least one endpoint is VISITED or ADJACENT.
      if (visA === 'HIDDEN' && visB === 'HIDDEN') continue;
      if (visA !== 'VISITED' && visA !== 'ADJACENT' &&
          visB !== 'VISITED' && visB !== 'ADJACENT') continue;

      const isActive =
        (a === this.currentNodeId && jumpableIds.has(b)) ||
        (b === this.currentNodeId && jumpableIds.has(a));
      renderer.drawLine(
        this.nodes[a].x, this.nodes[a].y,
        this.nodes[b].x, this.nodes[b].y,
        isActive ? EDGE_ACTIVE_COLOR : EDGE_COLOR,
        isActive ? 2 : 1,
      );
    }

    // ── Layer 2: Nodes ────────────────────────────────────────────────────────
    // Returns the four vertices of a diamond (rotated square) centred at (cx, cy).
    const dmnd = (cx: number, cy: number, r: number) => [
      { x: cx,     y: cy - r },
      { x: cx + r, y: cy     },
      { x: cx,     y: cy + r },
      { x: cx - r, y: cy     },
    ];

    for (const node of this.nodes) {
      const isCurrent  = node.id === this.currentNodeId;
      const isJumpable = jumpableIds.has(node.id);

      // HIDDEN nodes: small dim diamond — no labels, no rings, no shadow.
      if (node.visibility === 'HIDDEN') {
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_HIDDEN_RADIUS), NODE_HIDDEN_FILL,   true);
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_HIDDEN_RADIUS), NODE_HIDDEN_BORDER, false, 1);
        continue;
      }

      // Outer selection ring (only for non-hidden nodes).
      if (isCurrent) {
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS + 6), NODE_CURRENT_RING,  false, 2);
        GameStateData.uiAnchors['current_node'] = {
          x: node.x - NODE_RADIUS, y: node.y - NODE_RADIUS,
          w: NODE_RADIUS * 2,      h: NODE_RADIUS * 2,
        };
      } else if (isJumpable) {
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS + 4), NODE_REACHABLE_RING, false, 1);
      }

      if (node.visibility === 'ADJACENT') {
        // Unknown node — dim yellow diamond + "???" label.
        renderer.drawPolygon(dmnd(node.x + 3, node.y + 4, NODE_RADIUS), 'rgba(0,0,0,0.45)', true);
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS), '#554400', true);
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS), '#ffffff', false, 1.5);
        renderer.drawText('???', node.x, node.y + 5, LABEL_FONT, ADJACENT_LABEL_COLOR, 'center');

        // Long-Range Scanner leak: show ship/hazard tags for adjacent nodes.
        if (hasLRS) {
          if (node.nodeType === 'COMBAT') {
            renderer.drawText(
              '[SHIP DETECTED]', node.x, node.y + NODE_RADIUS + 16,
              TAG_FONT, '#ff6644', 'center',
            );
          } else if (node.hazard !== null) {
            renderer.drawText(
              '[HAZARD]', node.x, node.y + NODE_RADIUS + 16,
              TAG_FONT, HAZARD_COLORS[node.hazard], 'center',
            );
          }
        }
      } else {
        // VISIBLE or VISITED — full information.
        const eventFill = GameStateData.planetTheme !== null
          ? getPlanetNodeColor(GameStateData.planetTheme)
          : NODE_EVENT_FILL;

        const fillColor = node.isExit
          ? NODE_EXIT_FILL
          : node.visibility === 'VISITED'
            ? NODE_VISITED_FILL
            : node.nodeType === 'COMBAT'
              ? NODE_COMBAT_FILL
              : node.nodeType === 'STORE'
                ? NODE_STORE_FILL
                : node.nodeType === 'DISTRESS'
                  ? NODE_DISTRESS_FILL
                  : eventFill;

        // Drop shadow → filled diamond → white border.
        renderer.drawPolygon(dmnd(node.x + 3, node.y + 4, NODE_RADIUS), 'rgba(0,0,0,0.45)', true);
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS), fillColor, true);
        renderer.drawPolygon(dmnd(node.x, node.y, NODE_RADIUS), '#ffffff', false, 1.5);

        const labelColor = node.isExit ? EXIT_LABEL_COLOR : LABEL_COLOR;
        renderer.drawText(
          node.label, node.x, node.y + NODE_RADIUS + 16, LABEL_FONT, labelColor, 'center',
        );

        // Type tag (not shown for visited or exit nodes).
        if (!node.isExit && node.visibility !== 'VISITED') {
          let tag      = '';
          let tagColor = '#aaaaaa';
          if (node.nodeType === 'COMBAT')   { tag = '[SHIP]';     tagColor = '#ff6644'; }
          else if (node.nodeType === 'STORE')    { tag = '[STORE]';    tagColor = '#44ff88'; }
          else if (node.nodeType === 'DISTRESS') { tag = '[DISTRESS]'; tagColor = '#ffdd44'; }
          if (tag !== '') {
            renderer.drawText(tag, node.x, node.y + NODE_RADIUS + 27, TAG_FONT, tagColor, 'center');
          }
        }

        // Hazard indicator (only for nodes not yet visited).
        if (node.hazard !== null && node.visibility !== 'VISITED') {
          const hy = node.y + NODE_RADIUS + (node.isExit ? 26 : 37);
          renderer.drawText(
            `⚡${node.hazard}`, node.x, hy,
            '9px monospace', HAZARD_COLORS[node.hazard], 'center',
          );
        }
      }
    }

    // ── Player ship icon at current beacon ────────────────────────────────────
    {
      const curNode = this.nodes[this.currentNodeId];
      const shipId  = GameStateData.playerShipTemplateId;
      if (curNode !== undefined && shipId !== '') {
        const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships') ?? [];
        const shipTpl  = allShips.find((s) => s.id === shipId);
        if (shipTpl !== undefined) {
          drawShipIcon(renderer.getContext(), shipTpl,
            curNode.x, curNode.y - NODE_RADIUS - 20, 0.08, '#00ffcc');
        }
      }
    }

    // ── Quest / Distress markers drawn above their assigned nodes ────────────
    for (const quest of GameStateData.activeQuests) {
      if (quest.nodeId === null) continue;
      const node = this.nodes[quest.nodeId];
      if (node === undefined) continue;
      const markerColor = quest.markerType === 'DISTRESS' ? '#ff4444' : '#ffee00';
      const markerLabel = quest.markerType === 'DISTRESS' ? '⚠ DISTRESS' : '★ QUEST';
      renderer.drawText(markerLabel, node.x, node.y - NODE_RADIUS - 6,
        'bold 10px monospace', markerColor, 'center');
    }

    // ── Bottom HUD panel (sector + type as pills, anchored to left edge) ────────
    {
      const ctx        = renderer.getContext();
      const PILL_H     = 24;
      const PILL_PAD_X = 9;
      const PILL_GAP   = 6;
      const PANEL_PAD  = 10;
      const FONT       = '12px monospace';

      ctx.font = FONT;
      const sectorLabel = this.sectorTemplate !== null
        ? this.sectorTemplate.name.toUpperCase()
        : '— UNKNOWN —';
      const botItems = [
        `SECTOR  ${GameStateData.sectorNumber}`,
        sectorLabel,
      ];
      const botWidths  = botItems.map((t) => ctx.measureText(t).width + PILL_PAD_X * 2);
      const botPanelW  = botWidths.reduce((s, w2) => s + w2, 0)
        + (botItems.length - 1) * PILL_GAP + PANEL_PAD * 2;
      const botPanelH  = PILL_H + PANEL_PAD * 2;
      const botPanelY  = height - botPanelH - 10;

      GameStateData.uiAnchors['sector_info'] = { x: 0, y: botPanelY, w: botPanelW, h: botPanelH };

      UIRenderer.drawSciFiPanel(ctx, 0, botPanelY, botPanelW, botPanelH,
        { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.93 });

      let bpx = PANEL_PAD;
      const bpy = botPanelY + PANEL_PAD;
      botItems.forEach((label, i) => {
        const pw = botWidths[i];
        UIRenderer.drawPill(ctx, bpx, bpy, pw, PILL_H, '#00ccdd');
        ctx.font      = FONT;
        ctx.fillStyle = '#001820';
        ctx.textAlign = 'left';
        ctx.fillText(label, bpx + PILL_PAD_X, bpy + PILL_H / 2 + 5);
        bpx += pw + PILL_GAP;
      });
    }

    // ── Top-left resource panel with cyan pills ───────────────────────────────
    {
      const ctx        = renderer.getContext();
      const ship       = this.getPlayerShip(world);
      const PILL_H     = 24;
      const PILL_PAD_X = 9;
      const PILL_GAP   = 6;
      const PANEL_PAD  = 10;
      const PANEL_X    = 0;
      const PANEL_Y    = 0;
      const FONT       = '12px monospace';

      ctx.font = FONT;
      const items = ship !== null ? [
        `FUEL  ${ship.fuel}`,
        `MSL  ${ship.missiles}`,
        `DRONES  ${ship.droneParts}`,
        `SCRAP  ${ship.scrap}`,
      ] : [];

      // Dynamically calculate panel width from pill widths.
      const pillWidths = items.map((t) => ctx.measureText(t).width + PILL_PAD_X * 2);
      const panelW     = pillWidths.reduce((s, w2) => s + w2, 0)
        + Math.max(0, items.length - 1) * PILL_GAP
        + PANEL_PAD * 2;
      const panelH     = PILL_H + PANEL_PAD * 2;

      GameStateData.uiAnchors['resources'] = { x: PANEL_X, y: PANEL_Y, w: panelW, h: panelH };

      UIRenderer.drawSciFiPanel(ctx, PANEL_X, PANEL_Y, panelW, panelH,
        { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.93 });

      const resourceTips = [
        'Fuel: Required for interstellar jumps.',
        'Missiles: Ammo consumed by missile and bomb weapons.',
        'Drone Parts: Required to deploy active drones.',
        'Scrap: Currency used in stores and for upgrades.',
      ];
      const mapMouse = input.getMousePosition();
      let px2 = PANEL_X + PANEL_PAD;
      const py2 = PANEL_Y + PANEL_PAD;
      // Collect the hovered tooltip so it can be drawn AFTER all pills,
      // preventing later pills from painting over it.
      let hoveredTip: string | null = null;
      items.forEach((label, i) => {
        const pw = pillWidths[i];
        UIRenderer.drawPill(ctx, px2, py2, pw, PILL_H, '#00ccdd');
        ctx.font      = FONT;
        ctx.fillStyle = '#001820';
        ctx.textAlign = 'left';
        ctx.fillText(label, px2 + PILL_PAD_X, py2 + PILL_H / 2 + 5);
        if (mapMouse.x >= px2 && mapMouse.x <= px2 + pw &&
            mapMouse.y >= py2 && mapMouse.y <= py2 + PILL_H) {
          hoveredTip = resourceTips[i];
        }
        px2 += pw + PILL_GAP;
      });
      // Draw tooltip on top of all pills.
      if (hoveredTip !== null) {
        renderer.drawTooltip(mapMouse.x, mapMouse.y, hoveredTip);
      }

      // ── SHIP button below the resource panel ────────────────────────────────
      const BTN_W = 110;
      const BTN_H = 34;
      const BTN_X = PANEL_X;
      const BTN_Y = PANEL_Y + panelH + 6;
      UIRenderer.drawSciFiPanel(ctx, BTN_X, BTN_Y, BTN_W, BTN_H,
        { noLeftChamfer: true, lightBg: true, borderColor: '#ffffff', alpha: 0.95 });
      renderer.drawText('⚙  SHIP', BTN_X + BTN_W / 2, BTN_Y + BTN_H / 2 + 6,
        'bold 12px monospace', '#001830', 'center');
      if (mapMouse.x >= BTN_X && mapMouse.x <= BTN_X + BTN_W &&
          mapMouse.y >= BTN_Y && mapMouse.y <= BTN_Y + BTN_H) {
        renderer.drawTooltip(mapMouse.x, mapMouse.y, 'View your ship\'s systems and weapons.');
      }

      if (input.isMouseJustPressed(0)) {
        const m = input.getMousePosition();
        if (m.x >= BTN_X && m.x <= BTN_X + BTN_W &&
            m.y >= BTN_Y && m.y <= BTN_Y + BTN_H) {
          callbacks.onShip?.();
        }
      }
    }

    // ── Input: click jumpable nodes ───────────────────────────────────────────
    if (input.isMouseJustPressed(0)) {
      for (const node of this.nodes) {
        if (!jumpableIds.has(node.id)) continue;
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
          this.jump(node.id, world, callbacks);
          break;
        }
      }
    }
  }

  /** Reveals all nodes (mercenary "reveal map" reward). */
  revealAllNodes(): void {
    for (const node of this.nodes) {
      if (node.visibility !== 'VISITED') node.visibility = 'VISIBLE';
    }
  }

  /**
   * Pushes the rebel fleet back by `steps` advance-steps
   * (minimum: off the left edge so it never goes behind the start).
   */
  delayRebels(steps: number): void {
    this.rebelFleetX = Math.max(REBEL_START_X, this.rebelFleetX - REBEL_ADVANCE * steps);
  }

  /** Advances the rebel fleet forward by `steps` extra advance-steps. */
  advanceRebels(steps: number): void {
    this.rebelFleetX += REBEL_ADVANCE * steps;
  }

  /**
   * Returns the environmental hazard type of the current node, or null if none.
   * HazardSystem reads this each frame during COMBAT to apply hazard effects.
   */
  getCurrentNodeHazard(): string | null {
    return this.nodes[this.currentNodeId]?.hazard ?? null;
  }

  /** Returns the ID of the active sector template (e.g. 'civilian_sector'). */
  getCurrentSectorId(): string {
    return this.sectorTemplate?.id ?? 'civilian_sector';
  }

  /** Resets the map and regenerates it (call when entering a new sector). */
  nextSector(canvasW: number, canvasH: number): void {
    this.generated = false;
    this.nodes     = [];
    this.edges     = [];
    this.generate(canvasW, canvasH);
    this.generated = true;
  }

  /** Like nextSector but uses a specific template for the new sector. */
  nextSectorWithTemplate(template: SectorTemplate, canvasW: number, canvasH: number): void {
    this.forcedTemplate = template;
    this.nextSector(canvasW, canvasH);
  }

  // ── Graph generation ──────────────────────────────────────────────────────

  private generate(canvasW: number, canvasH: number): void {
    // Use a forced template (from sector selection) or pick randomly.
    if (this.forcedTemplate !== null) {
      this.sectorTemplate  = this.forcedTemplate;
      this.forcedTemplate  = null;
    } else {
      const sectors = AssetLoader.getJSON<SectorTemplate[]>('sectors');
      if (sectors !== undefined && sectors.length > 0) {
        // Never randomly assign the BOSS sector — it is reserved for level 8
        // and only ever set via nextSectorWithTemplate() from the sector tree.
        const pool = sectors.filter((s) => s.type !== 'BOSS');
        const src  = pool.length > 0 ? pool : sectors;
        this.sectorTemplate = src[Math.floor(Math.random() * src.length)];
      } else {
        this.sectorTemplate = null;
      }
    }

    // Generate and cache the procedural background for this sector.
    const bgTheme: MapTheme = this.sectorTemplate?.type === 'NEBULA' ? 'NEBULA' : 'STANDARD';
    this.backgroundCanvas = BackgroundGenerator.generate(
      bgTheme, canvasW, canvasH,
      Math.floor(Math.random() * 99991),
    );

    const hazardChance  = this.sectorTemplate?.hazardChance  ?? 0.15;
    const hostileChance = this.sectorTemplate?.hostileChance ?? 0.25;

    // 16–22 total nodes (including START and EXIT).
    const N = 16 + Math.floor(Math.random() * 7);

    // Maximum jump radius scales with canvas width.
    const MAX_JUMP_RADIUS = Math.min(Math.round(canvasW / 6), 260);

    const usableW = canvasW - 2 * MARGIN_X;
    const usableH = canvasH - MARGIN_TOP - MARGIN_BOT;
    const slotW   = usableW / (N - 1);

    const storeChance    = 0.12;
    const distressChance = 0.15;

    const nodes: MapNode[] = [];

    // START node — far left.
    nodes.push({
      id: 0, x: MARGIN_X, y: Math.round(canvasH / 2),
      label: 'START', isExit: false, hazard: null,
      visibility: 'VISITED', nodeType: 'EVENT',
    });

    // Intermediate nodes — spread with jitter.
    for (let i = 1; i < N - 1; i++) {
      const baseFrac = i / (N - 1);
      const jitter   = (Math.random() - 0.5) * slotW * 0.7;
      const x = Math.round(Math.max(
        MARGIN_X + 20,
        Math.min(canvasW - MARGIN_X - 20, MARGIN_X + baseFrac * usableW + jitter),
      ));
      const y = Math.round(MARGIN_TOP + Math.random() * usableH);

      const hazard: HazardType | null = Math.random() < hazardChance
        ? HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)]
        : null;

      // Assign node type probabilistically.
      const r = Math.random();
      let nodeType: NodeType;
      if (r < hostileChance)                                      nodeType = 'COMBAT';
      else if (r < hostileChance + storeChance)                   nodeType = 'STORE';
      else if (r < hostileChance + storeChance + distressChance)  nodeType = 'DISTRESS';
      else                                                         nodeType = 'EVENT';

      // Distress beacons are globally visible (distress signal is always broadcast).
      const visibility: NodeVisibility = nodeType === 'DISTRESS' ? 'VISIBLE' : 'HIDDEN';

      nodes.push({ id: i, x, y, label: `Beacon ${i}`, isExit: false, hazard, visibility, nodeType });
    }

    // EXIT node — far right, always VISIBLE.
    nodes.push({
      id: N - 1, x: canvasW - MARGIN_X, y: Math.round(canvasH / 2),
      label: 'EXIT', isExit: true, hazard: null,
      visibility: 'VISIBLE', nodeType: 'EVENT',
    });

    // Sort by x so IDs increase left → right; re-index after sort.
    nodes.sort((a, b) => a.x - b.x);
    nodes.forEach((n, i) => { n.id = i; });

    // Fix guaranteed positions after sort.
    nodes[0].label      = 'START';
    nodes[0].visibility = 'VISITED';
    nodes[0].nodeType   = 'EVENT';
    nodes[N - 1].label      = 'EXIT';
    nodes[N - 1].isExit     = true;
    nodes[N - 1].visibility = 'VISIBLE';

    // ── Enforce shop count: at least 1, at most 5 ────────────────────────────
    const intermediate = nodes.slice(1, N - 1);
    const storePool    = intermediate.filter((n) => n.nodeType === 'STORE');

    if (storePool.length === 0) {
      // Guarantee at least one store by converting a random intermediate node.
      const pick = intermediate[Math.floor(Math.random() * intermediate.length)];
      if (pick !== undefined) {
        pick.nodeType   = 'STORE';
        pick.visibility = 'HIDDEN';
        storePool.push(pick);
      }
    }

    // Guarantee a store near the exit (last 3 intermediate nodes by x position).
    const nearExit = intermediate.slice(-3);
    if (!nearExit.some((n) => n.nodeType === 'STORE')) {
      const pick = nearExit[Math.floor(Math.random() * nearExit.length)];
      if (pick !== undefined) {
        pick.nodeType   = 'STORE';
        pick.visibility = 'HIDDEN';
        storePool.push(pick);
      }
    }

    // Cap at 5 stores — randomly demote extras to EVENT.
    while (storePool.length > 5) {
      const idx  = Math.floor(Math.random() * storePool.length);
      storePool[idx].nodeType = 'EVENT';
      storePool.splice(idx, 1);
    }

    this.nodes         = nodes;
    this.currentNodeId = 0;
    this.rebelFleetX   = REBEL_START_X;

    // Reset narrative jump counter for the new sector.
    NarrativeSystem.onSectorStart();

    // ── Build planar edge set ─────────────────────────────────────────────────
    const edgeSet = new Set<string>();
    const edges: Array<[number, number]> = [];

    const addEdge = (a: number, b: number): void => {
      if (a === b) return;
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push([a, b]);
    };

    // Guaranteed spine — consecutive nodes sorted by x form an x-monotone
    // (non-self-intersecting) path from START to EXIT.
    for (let i = 0; i < N - 1; i++) addEdge(i, i + 1);

    // Extra edges: connect pairs within MAX_JUMP_RADIUS only if the new segment
    // does not intersect any existing edge (planar graph constraint).
    for (let i = 0; i < N; i++) {
      for (let j = i + 2; j < N; j++) {
        const dx = nodes[i].x - nodes[j].x;
        const dy = nodes[i].y - nodes[j].y;
        if (dx * dx + dy * dy > MAX_JUMP_RADIUS * MAX_JUMP_RADIUS) continue;
        if (Math.random() > 0.55) continue; // ~45 % chance when in range

        // Reject if the candidate edge crosses any existing edge.
        const crosses = edges.some(([c, d]) => edgesIntersect(i, j, c, d, nodes));
        if (!crosses) addEdge(i, j);
      }
    }

    // ── Guarantee START has at least 2 outgoing connections ──────────────────
    // Count current edges from node 0.
    const startEdgeCount = edges.filter(([a, b]) => a === 0 || b === 0).length;
    if (startEdgeCount < 2) {
      // Sort all non-adjacent nodes by distance from START and try to add edges
      // until START has at least 2 connections (relaxing the intersection check
      // for the second guaranteed connection if nothing planar is available).
      const candidates = nodes
        .slice(2) // skip node 1 (already spine-connected) and node 0 itself
        .map((n) => ({
          id: n.id,
          dist2: (n.x - nodes[0].x) ** 2 + (n.y - nodes[0].y) ** 2,
        }))
        .sort((a, b) => a.dist2 - b.dist2);

      for (const cand of candidates) {
        const current = edges.filter(([a, b]) => a === 0 || b === 0).length;
        if (current >= 2) break;

        // First attempt: planar (no intersection).
        const crosses = edges.some(([c, d]) => edgesIntersect(0, cand.id, c, d, nodes));
        if (!crosses) {
          addEdge(0, cand.id);
        } else if (current < 1) {
          // If we still have zero extra edges, force-add the closest even if it crosses.
          addEdge(0, cand.id);
        }
      }
    }

    this.edges = edges;

    // Reveal neighbours of START immediately so the player has moves to make.
    this.revealAdjacent(0);
  }

  // ── Adjacency reveal ──────────────────────────────────────────────────────

  /**
   * Upgrades all HIDDEN neighbours of `fromNodeId` to ADJACENT.
   * STORE nodes auto-upgrade further to VISIBLE so the player always knows
   * a store is reachable before having to jump blind.
   */
  private revealAdjacent(fromNodeId: number): void {
    for (const [a, b] of this.edges) {
      const neighborId = a === fromNodeId ? b : b === fromNodeId ? a : -1;
      if (neighborId < 0) continue;
      const neighbor = this.nodes[neighborId];
      if (neighbor.visibility === 'HIDDEN') {
        neighbor.visibility = neighbor.nodeType === 'STORE' ? 'VISIBLE' : 'ADJACENT';
      }
    }
  }

  // ── Jump logic ────────────────────────────────────────────────────────────

  private jump(
    nodeId: number,
    world: IWorld,
    callbacks: {
      onCombat: (shipId: string) => void;
      onEvent:  (eventId?: string) => void;
      onStore:  () => void;
      onExit:   () => void;
    },
  ): void {
    const node       = this.nodes[nodeId];
    const wasVisited = node.visibility === 'VISITED';

    this.deductFuel(world);
    const fleetMult   = GameStateData.difficulty === 'EASY' ? 0.85
                      : GameStateData.difficulty === 'HARD' ? 1.1
                      : 1.0;
    this.rebelFleetX += REBEL_ADVANCE * fleetMult;

    // Track jumps for the Narrative Director.
    GameStateData.jumpsInCurrentSector += 1;

    this.currentNodeId = nodeId;
    node.visibility    = 'VISITED';

    // Update distance-to-exit for DISTANCE_TO_EXIT narrative beats.
    GameStateData.distanceToExit = this.computeDistanceToExit(nodeId);

    // Reveal neighbours from the new position.
    this.revealAdjacent(nodeId);

    // Previously-cleared nodes are always safe regardless of rebel fleet position.
    if (wasVisited) {
      callbacks.onEvent('safe_passage');
      return;
    }

    if (node.isExit) {
      callbacks.onExit();
      return;
    }

    // Rebel fleet check (only for unvisited nodes): forced combat if caught up.
    if (node.x <= this.rebelFleetX) {
      callbacks.onCombat('rebel_a');
      return;
    }

    // Quest marker override — skip for protected nodes (STORE, EXIT, visible DISTRESS).
    const questIdx = GameStateData.activeQuests.findIndex((q) => q.nodeId === nodeId);
    if (questIdx !== -1 && !this.isProtectedNode(node)) {
      const quest = GameStateData.activeQuests[questIdx];
      GameStateData.activeQuests.splice(questIdx, 1);
      callbacks.onEvent(quest.eventId);
      return;
    }

    // Narrative Director — skip for protected nodes so shops and distress beacons are preserved.
    const narrativeEvent = NarrativeSystem.intercept();
    if (narrativeEvent !== null && !this.isProtectedNode(node)) {
      callbacks.onEvent(narrativeEvent);
      return;
    }

    // Dispatch based on pre-assigned node type.
    // COMBAT nodes route through the Event System so the player sees the
    // narrative modal (encounter text + choices) before combat begins.
    const COMBAT_EVENTS = [
      'rebel_patrol',
      'pirate_ambush',
      'automated_rebel_scout',
      'slug_surrender_trick',
    ] as const;

    switch (node.nodeType) {
      case 'COMBAT': {
        const eventId = COMBAT_EVENTS[Math.floor(Math.random() * COMBAT_EVENTS.length)];
        callbacks.onEvent(eventId);
        break;
      }
      case 'STORE':             callbacks.onStore(); break;
      case 'DISTRESS':
      case 'EVENT':   default:  callbacks.onEvent(undefined); break;
    }
  }

  // ── Player / augment helpers ───────────────────────────────────────────────

  /** True if the player ship has the `long_range_scanners` augment equipped. */
  private hasLRS(world: IWorld): boolean {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      return ship?.augments.includes('long_range_scanners') ?? false;
    }
    return false;
  }

  private getPlayerShip(
    world: IWorld,
  ): { fuel: number; missiles: number; scrap: number; droneParts: number } | null {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship !== undefined) {
        return { fuel: ship.fuel, missiles: ship.missiles, scrap: ship.scrap, droneParts: ship.droneParts };
      }
    }
    return null;
  }

  /**
   * BFS to find a random unvisited node at exactly `targetDistance` hops from `fromNodeId`.
   * Falls back to any nearest unvisited node if no exact match exists.
   */
  private findNodeAtDistance(fromNodeId: number, targetDistance: number): number | null {
    const visited = new Set<number>();
    const queue: Array<{ id: number; dist: number }> = [{ id: fromNodeId, dist: 0 }];
    const candidates: number[] = [];

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      if (dist === targetDistance && id !== fromNodeId) {
        const n = this.nodes[id];
        if (n !== undefined && !this.isProtectedNode(n)) candidates.push(id);
      }
      if (dist >= targetDistance) continue;

      for (const [a, b] of this.edges) {
        const neighbor = a === id ? b : b === id ? a : -1;
        if (neighbor >= 0 && !visited.has(neighbor)) {
          queue.push({ id: neighbor, dist: dist + 1 });
        }
      }
    }

    if (candidates.length > 0) {
      return candidates[Math.floor(Math.random() * candidates.length)];
    }
    // Fallback: any unprotected unvisited node.
    const fallback = this.nodes.find(
      (n) => n.id !== fromNodeId && n.visibility !== 'VISITED' && !this.isProtectedNode(n),
    );
    return fallback?.id ?? null;
  }

  /**
   * Returns true for map nodes that must never be overwritten by quest or narrative injection:
   * the EXIT node, all STORE nodes, and pre-existing visible DISTRESS beacons.
   */
  private isProtectedNode(node: { isExit: boolean; nodeType: string; visibility: string }): boolean {
    if (node.isExit) return true;
    if (node.nodeType === 'STORE') return true;
    if (node.nodeType === 'DISTRESS' && node.visibility !== 'HIDDEN') return true;
    return false;
  }

  /**
   * BFS to find the shortest hop-count from `fromNodeId` to the EXIT node.
   * Returns 99 if the exit is unreachable (e.g. disconnected graph).
   * Stored in GameStateData.distanceToExit for the Narrative Director.
   */
  private computeDistanceToExit(fromNodeId: number): number {
    const exitNode = this.nodes.find((n) => n.isExit);
    if (exitNode === undefined) return 99;
    if (exitNode.id === fromNodeId) return 0;

    const visited = new Set<number>();
    const queue: Array<{ id: number; dist: number }> = [{ id: fromNodeId, dist: 0 }];

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      if (visited.has(id)) continue;
      visited.add(id);

      for (const [a, b] of this.edges) {
        const neighbor = a === id ? b : b === id ? a : -1;
        if (neighbor < 0 || visited.has(neighbor)) continue;
        if (neighbor === exitNode.id) return dist + 1;
        queue.push({ id: neighbor, dist: dist + 1 });
      }
    }
    return 99;
  }

  private deductFuel(world: IWorld): void {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship !== undefined) ship.fuel = Math.max(0, ship.fuel - 1);
      return;
    }
  }
}
