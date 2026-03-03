import { AssetLoader } from '../../utils/AssetLoader';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SectorTemplate } from '../data/SectorTemplate';

// ── Layout / style constants ──────────────────────────────────────────────────
const NODE_RADIUS       = 18;
const NODE_COLOR        = '#aaddff';
const NODE_EXIT_COLOR   = '#ffdd44';
const NODE_CURRENT_RING = '#ffffff';
const NODE_VISITED_COLOR = '#334455';
const NODE_REACHABLE_RING = '#44aaff';
const EDGE_COLOR        = '#1c3a55';
const EDGE_HOVER_COLOR  = '#3366aa';
const LABEL_FONT        = '11px monospace';
const LABEL_COLOR       = '#88aacc';
const EXIT_LABEL_COLOR  = '#ffee88';

const REBEL_FILL        = 'rgba(180,20,20,0.22)';
const REBEL_EDGE_COLOR  = '#cc2222';
const REBEL_LABEL_FONT  = '13px monospace';
const REBEL_LABEL_COLOR = '#ff4444';

const HUD_FONT          = '13px monospace';
const HUD_MARGIN_X      = 14;
const HUD_MARGIN_Y      = 24;

// How many pixels the rebel fleet advances per jump.
const REBEL_ADVANCE     = 70;

// ── Margin constants for node placement ──────────────────────────────────────
const MARGIN_X    = 90;  // left / right margin for START and EXIT nodes
const MARGIN_TOP  = 130; // top margin for intermediate nodes
const MARGIN_BOT  = 80;  // bottom margin for intermediate nodes

/** Possible environmental hazard types assignable to a node. */
const HAZARD_TYPES = ['ASTEROIDS', 'SOLAR_FLARE', 'ION_STORM', 'NEBULA'] as const;
type HazardType = typeof HAZARD_TYPES[number];

/** Hazard label colours shown on the map. */
const HAZARD_COLORS: Record<HazardType, string> = {
  ASTEROIDS:   '#cc8844',
  SOLAR_FLARE: '#ffaa22',
  ION_STORM:   '#44aaff',
  NEBULA:      '#9966cc',
};

interface MapNode {
  id:      number;
  x:       number;
  y:       number;
  label:   string;
  visited: boolean;
  isExit:  boolean;
  /** Environmental hazard active during combat at this node, or null. */
  hazard:  HazardType | null;
}

/**
 * Manages the procedurally-generated star map.
 *
 * Call `drawStarMap(renderer, input, world, callbacks)` from the STAR_MAP game state.
 * The map graph is lazily generated on the first call using the canvas dimensions.
 *
 * Callbacks:
 *   onCombat(shipId)   — rebel fleet caught the player; enter combat
 *   onEvent(eventId?)  — jump to unvisited node (undefined = random event); visited = 'safe_passage'
 *   onExit()           — player reached the EXIT node; next sector
 */
export class MapSystem {
  private nodes:           MapNode[] = [];
  private edges:           Array<[number, number]> = [];
  private currentNodeId:   number = 0;
  private rebelFleetX:     number = -REBEL_ADVANCE; // starts off the left edge
  private generated:       boolean = false;
  /** The sector template active for this map (picked randomly on generation). */
  private sectorTemplate:  SectorTemplate | null = null;

  // ── Public API ────────────────────────────────────────────────────────────

  drawStarMap(
    renderer: IRenderer,
    input:    IInput,
    world:    IWorld,
    callbacks: {
      onCombat: (shipId: string) => void;
      onEvent:  (eventId?: string) => void;
      onExit:   () => void;
    },
  ): void {
    const { width, height } = renderer.getCanvasSize();

    // Lazy-generate the graph once we know the canvas size.
    if (!this.generated) {
      this.generate(width, height);
      this.generated = true;
    }

    const mouse = input.getMousePosition();

    // Determine which nodes the player can jump to from the current node.
    const reachableIds = new Set(
      this.edges
        .filter(([a, b]) => a === this.currentNodeId || b === this.currentNodeId)
        .map(([a, b]) => (a === this.currentNodeId ? b : a)),
    );

    // ── Layer 0: Rebel Fleet red zone (drawn first, behind everything) ────────
    if (this.rebelFleetX > 0) {
      renderer.drawRect(0, 0, this.rebelFleetX, height, REBEL_FILL, true);
      renderer.drawLine(this.rebelFleetX, 0, this.rebelFleetX, height, REBEL_EDGE_COLOR, 2);
      renderer.drawText(
        '⚠ REBEL FLEET',
        Math.max(6, this.rebelFleetX - 6),
        height / 2,
        REBEL_LABEL_FONT, REBEL_LABEL_COLOR, 'right',
      );
    }

    // ── Layer 1: Edges ────────────────────────────────────────────────────────
    for (const [a, b] of this.edges) {
      const na = this.nodes[a];
      const nb = this.nodes[b];
      // Highlight edges connected to the current node that lead somewhere reachable.
      const isReachableEdge =
        (a === this.currentNodeId && reachableIds.has(b)) ||
        (b === this.currentNodeId && reachableIds.has(a));
      renderer.drawLine(na.x, na.y, nb.x, nb.y, isReachableEdge ? EDGE_HOVER_COLOR : EDGE_COLOR, isReachableEdge ? 2 : 1);
    }

    // ── Layer 2: Nodes ────────────────────────────────────────────────────────
    for (const node of this.nodes) {
      const isCurrent   = node.id === this.currentNodeId;
      const isReachable = reachableIds.has(node.id);

      // Outer ring: white for current, blue for reachable.
      if (isCurrent) {
        renderer.drawCircle(node.x, node.y, NODE_RADIUS + 6, NODE_CURRENT_RING, false, 2);
      } else if (isReachable) {
        renderer.drawCircle(node.x, node.y, NODE_RADIUS + 4, NODE_REACHABLE_RING, false, 1);
      }

      const fillColor = node.isExit
        ? NODE_EXIT_COLOR
        : node.visited
          ? NODE_VISITED_COLOR
          : NODE_COLOR;

      renderer.drawCircle(node.x, node.y, NODE_RADIUS, fillColor, true);
      renderer.drawCircle(node.x, node.y, NODE_RADIUS, '#224466', false, 1);

      // Label below node.
      const labelColor = node.isExit ? EXIT_LABEL_COLOR : LABEL_COLOR;
      renderer.drawText(node.label, node.x, node.y + NODE_RADIUS + 16, LABEL_FONT, labelColor, 'center');

      // Hazard indicator below the label.
      if (node.hazard !== null) {
        const hazardColor = HAZARD_COLORS[node.hazard];
        renderer.drawText(`⚡${node.hazard}`, node.x, node.y + NODE_RADIUS + 28, '9px monospace', hazardColor, 'center');
      }
    }

    // ── Sector name HUD ────────────────────────────────────────────────────────
    if (this.sectorTemplate !== null) {
      renderer.drawText(
        this.sectorTemplate.name.toUpperCase(),
        width / 2, HUD_MARGIN_Y + 20,
        '11px monospace', '#556677', 'center',
      );
    }

    // ── Layer 3: HUD — fuel + fleet distance ──────────────────────────────────
    const fuel = this.getPlayerFuel(world);
    renderer.drawText(
      `FUEL: ${fuel}`,
      HUD_MARGIN_X + width / 2, HUD_MARGIN_Y,
      HUD_FONT, fuel > 0 ? '#ffaa44' : '#ff3333', 'center',
    );

    // ── Input: handle left-clicks on reachable nodes ──────────────────────────
    if (input.isMouseJustPressed(0)) {
      for (const node of this.nodes) {
        if (!reachableIds.has(node.id)) continue;
        const dx = mouse.x - node.x;
        const dy = mouse.y - node.y;
        if (dx * dx + dy * dy <= NODE_RADIUS * NODE_RADIUS) {
          this.jump(node.id, world, callbacks);
          break;
        }
      }
    }
  }

  /** Marks all nodes as visited (mercenary "reveal map" reward). */
  revealAllNodes(): void {
    for (const node of this.nodes) node.visited = true;
  }

  /**
   * Pushes the rebel fleet back by `steps` advance-steps
   * (minimum: off the left edge so it never goes behind the start).
   */
  delayRebels(steps: number): void {
    this.rebelFleetX = Math.max(-REBEL_ADVANCE, this.rebelFleetX - REBEL_ADVANCE * steps);
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
    // ── Pick a random sector type from sectors.json ───────────────────────────
    const sectors = AssetLoader.getJSON<SectorTemplate[]>('sectors');
    if (sectors !== undefined && sectors.length > 0) {
      this.sectorTemplate = sectors[Math.floor(Math.random() * sectors.length)];
    } else {
      this.sectorTemplate = null;
    }
    const hazardChance = this.sectorTemplate?.hazardChance ?? 0.15;

    const N = 16; // total node count including START and EXIT
    const nodes: MapNode[] = [];

    // START node — far left, vertically centred.
    nodes.push({
      id: 0, x: MARGIN_X, y: Math.round(canvasH / 2),
      label: 'START', visited: true, isExit: false, hazard: null,
    });

    // Intermediate nodes — spread across the canvas with gentle randomness.
    const usableW  = canvasW - 2 * MARGIN_X;
    const usableH  = canvasH - MARGIN_TOP - MARGIN_BOT;
    const slotW    = usableW / (N - 1);

    for (let i = 1; i < N - 1; i++) {
      const baseFrac = i / (N - 1);
      const jitter   = (Math.random() - 0.5) * slotW * 0.7;
      const x        = Math.round(Math.max(MARGIN_X + 20, Math.min(canvasW - MARGIN_X - 20,
        MARGIN_X + baseFrac * usableW + jitter,
      )));
      const y        = Math.round(MARGIN_TOP + Math.random() * usableH);
      // Randomly assign a hazard based on the sector's hazardChance.
      const hazard: HazardType | null = Math.random() < hazardChance
        ? HAZARD_TYPES[Math.floor(Math.random() * HAZARD_TYPES.length)]
        : null;
      nodes.push({ id: i, x, y, label: `Beacon ${i}`, visited: false, isExit: false, hazard });
    }

    // EXIT node — far right, vertically centred.
    nodes.push({
      id: N - 1, x: canvasW - MARGIN_X, y: Math.round(canvasH / 2),
      label: 'EXIT', visited: false, isExit: true, hazard: null,
    });

    // Sort by x so ids increase left→right.
    nodes.sort((a, b) => a.x - b.x);
    nodes.forEach((n, i) => { n.id = i; });

    // START is always first (leftmost), EXIT always last (rightmost) due to our placement.
    nodes[0].visited = true;
    nodes[0].label   = 'START';
    nodes[N - 1].isExit = true;
    nodes[N - 1].label  = 'EXIT';

    this.nodes         = nodes;
    this.currentNodeId = 0;
    this.rebelFleetX   = -REBEL_ADVANCE;

    // ── Build edges ────────────────────────────────────────────────────────
    const edgeSet = new Set<string>();
    const edges: Array<[number, number]> = [];

    const addEdge = (a: number, b: number): void => {
      if (a === b) return;
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      if (edgeSet.has(key)) return;
      edgeSet.add(key);
      edges.push([a, b]);
    };

    // Spine: each node → next (guarantees full connectivity).
    for (let i = 0; i < N - 1; i++) addEdge(i, i + 1);

    // Extra edges: connect nearby non-adjacent pairs with ~40% probability.
    const threshold = Math.round(canvasW / (N / 3.5));
    for (let i = 0; i < N; i++) {
      for (let j = i + 2; j < N; j++) {
        const dx   = nodes[i].x - nodes[j].x;
        const dy   = nodes[i].y - nodes[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < threshold && Math.random() < 0.4) addEdge(i, j);
      }
    }

    this.edges = edges;
  }

  // ── Jump logic ────────────────────────────────────────────────────────────

  private jump(
    nodeId: number,
    world: IWorld,
    callbacks: {
      onCombat: (shipId: string) => void;
      onEvent:  (eventId?: string) => void;
      onExit:   () => void;
    },
  ): void {
    const node      = this.nodes[nodeId];
    const wasVisited = node.visited;

    // Deduct fuel.
    this.deductFuel(world);

    // Advance rebel fleet.
    this.rebelFleetX += REBEL_ADVANCE;

    // Update state.
    this.currentNodeId = nodeId;
    node.visited       = true;

    // Rebel fleet check: if destination is inside the fleet's reach, force combat.
    if (node.x <= this.rebelFleetX) {
      callbacks.onCombat('rebel_a');
      return;
    }

    if (node.isExit) {
      callbacks.onExit();
      return;
    }

    // Visited node → empty event; unvisited node → random event.
    callbacks.onEvent(wasVisited ? 'safe_passage' : undefined);
  }

  // ── World helpers ─────────────────────────────────────────────────────────

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
