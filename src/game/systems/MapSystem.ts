import { AssetLoader } from '../../utils/AssetLoader';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SectorTemplate } from '../data/SectorTemplate';

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
/** Radius of the dim "unknown star" dot rendered for HIDDEN nodes. */
const NODE_HIDDEN_RADIUS   = 4;
const NODE_HIDDEN_FILL     = '#1a2030';
const NODE_HIDDEN_BORDER   = '#2a3348';
const NODE_CURRENT_RING    = '#ffffff';
const NODE_REACHABLE_RING  = '#44aaff';

/** Node fill colours by visibility / type. */
const NODE_VISITED_FILL    = '#1a2e3e';
const NODE_VISITED_BORDER  = '#2a4a60';
const NODE_ADJACENT_FILL   = '#1e2d3a';
const NODE_ADJACENT_BORDER = '#3a5570';
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

const REBEL_FILL           = 'rgba(180,20,20,0.22)';
const REBEL_EDGE_COLOR     = '#cc2222';
const REBEL_LABEL_FONT     = '13px monospace';
const REBEL_LABEL_COLOR    = '#ff4444';

const HUD_FONT             = '13px monospace';
const HUD_MARGIN_X         = 14;
const HUD_MARGIN_Y         = 24;

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
  private nodes:          MapNode[] = [];
  private edges:          Array<[number, number]> = [];
  private currentNodeId:  number = 0;
  private rebelFleetX:    number = REBEL_START_X;
  private generated:      boolean = false;
  private sectorTemplate: SectorTemplate | null = null;

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

    // ── Layer 0: Rebel Fleet red zone ────────────────────────────────────────
    if (this.rebelFleetX > 0) {
      renderer.drawRect(0, 0, this.rebelFleetX, height, REBEL_FILL, true);
      renderer.drawLine(this.rebelFleetX, 0, this.rebelFleetX, height, REBEL_EDGE_COLOR, 2);
      renderer.drawText(
        '⚠ REBEL FLEET',
        Math.max(6, this.rebelFleetX - 6), height / 2,
        REBEL_LABEL_FONT, REBEL_LABEL_COLOR, 'right',
      );
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
    for (const node of this.nodes) {
      const isCurrent  = node.id === this.currentNodeId;
      const isJumpable = jumpableIds.has(node.id);

      // HIDDEN nodes: render as a tiny dim star dot — no labels, no rings, no tags.
      if (node.visibility === 'HIDDEN') {
        renderer.drawCircle(node.x, node.y, NODE_HIDDEN_RADIUS, NODE_HIDDEN_FILL,   true);
        renderer.drawCircle(node.x, node.y, NODE_HIDDEN_RADIUS, NODE_HIDDEN_BORDER, false, 1);
        continue;
      }

      // Outer rings (only for non-hidden nodes).
      if (isCurrent) {
        renderer.drawCircle(node.x, node.y, NODE_RADIUS + 6, NODE_CURRENT_RING, false, 2);
      } else if (isJumpable) {
        renderer.drawCircle(node.x, node.y, NODE_RADIUS + 4, NODE_REACHABLE_RING, false, 1);
      }

      if (node.visibility === 'ADJACENT') {
        // Unknown node — show dim circle and "???" label.
        renderer.drawCircle(node.x, node.y, NODE_RADIUS, NODE_ADJACENT_FILL, true);
        renderer.drawCircle(node.x, node.y, NODE_RADIUS, NODE_ADJACENT_BORDER, false, 1);
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
                  : NODE_EVENT_FILL;

        const borderColor = node.isExit
          ? '#aa8800'
          : node.visibility === 'VISITED'
            ? NODE_VISITED_BORDER
            : '#224466';

        renderer.drawCircle(node.x, node.y, NODE_RADIUS, fillColor, true);
        renderer.drawCircle(node.x, node.y, NODE_RADIUS, borderColor, false, 1);

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

    // ── Sector name HUD ──────────────────────────────────────────────────────
    if (this.sectorTemplate !== null) {
      renderer.drawText(
        this.sectorTemplate.name.toUpperCase(),
        width / 2, HUD_MARGIN_Y + 20,
        '11px monospace', '#556677', 'center',
      );
    }

    // ── Fuel HUD ─────────────────────────────────────────────────────────────
    const fuel = this.getPlayerFuel(world);
    renderer.drawText(
      `FUEL: ${fuel}`,
      HUD_MARGIN_X + width / 2, HUD_MARGIN_Y,
      HUD_FONT, fuel > 0 ? '#ffaa44' : '#ff3333', 'center',
    );

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

  // ── Graph generation ──────────────────────────────────────────────────────

  private generate(canvasW: number, canvasH: number): void {
    // Pick a random sector type.
    const sectors = AssetLoader.getJSON<SectorTemplate[]>('sectors');
    if (sectors !== undefined && sectors.length > 0) {
      this.sectorTemplate = sectors[Math.floor(Math.random() * sectors.length)];
    } else {
      this.sectorTemplate = null;
    }

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

    this.nodes         = nodes;
    this.currentNodeId = 0;
    this.rebelFleetX   = REBEL_START_X;

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
    this.rebelFleetX += REBEL_ADVANCE;

    this.currentNodeId = nodeId;
    node.visibility    = 'VISITED';

    // Reveal neighbours from the new position.
    this.revealAdjacent(nodeId);

    // Rebel fleet check: node inside fleet territory → forced combat.
    if (node.x <= this.rebelFleetX) {
      callbacks.onCombat('rebel_a');
      return;
    }

    if (node.isExit) {
      callbacks.onExit();
      return;
    }

    if (wasVisited) {
      // Already explored — safe passage.
      callbacks.onEvent('safe_passage');
      return;
    }

    // Dispatch based on pre-assigned node type.
    switch (node.nodeType) {
      case 'COMBAT':            callbacks.onCombat('rebel_a'); break;
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

  private getPlayerFuel(world: IWorld): number {
    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      if (ship !== undefined) return ship.fuel;
    }
    return 0;
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
