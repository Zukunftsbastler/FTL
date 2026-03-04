/**
 * Node types supported by the declarative Canvas layout engine.
 *
 *   Row    — lays children out horizontally (flex row).
 *   Column — lays children out vertically (flex column).
 *   Panel  — leaf / container that renders a sci-fi panel via UIRenderer.drawSciFiPanel.
 *   Spacer — invisible structural placeholder (e.g., the "safe zone" between HUD panels).
 *   Text   — leaf that renders a text string via ctx.fillText.
 */
export type NodeType = 'Row' | 'Column' | 'Panel' | 'Spacer' | 'Text';

/**
 * A single node in the UI abstract syntax tree.
 *
 * Sizing rules (same axis as the parent's main axis):
 *   • Fixed pixel value  — e.g. `width: 260`
 *   • Percentage string  — e.g. `width: '50%'`  (relative to parent content area)
 *   • flexGrow           — remaining space is distributed proportionally
 *   • Neither            — node collapses to 0 on the main axis
 *
 * Cross-axis always fills the parent's content area.
 */
export interface UINode {
  /** Node type determines layout behaviour and render output. */
  type: NodeType;

  /** Optional stable identifier — used to look up computed bounds at runtime. */
  id?: string;

  /** Explicit width. Number = px, string ending in '%' = percentage of parent content width. */
  width?: number | string;

  /** Explicit height. Number = px, string ending in '%' = percentage of parent content height. */
  height?: number | string;

  /**
   * Flex-grow factor. When multiple siblings all have flexGrow > 0 the remaining
   * space in the container is split proportionally between them.
   */
  flexGrow?: number;

  /**
   * Padding (px) applied to this node's content area before laying out children.
   * Shrinks the usable area uniformly on all four sides.
   */
  padding?: number;

  /**
   * Margin (px) applied outside this node, shrinking it inward from the parent's
   * allocated bounds on all four sides.
   */
  margin?: number;

  /** Child nodes laid out inside this node. */
  children?: UINode[];

  /**
   * Type-specific payload.
   *   Panel → SciFiPanelOptions (chamfer, borderColor, alpha, title …)
   *   Text  → string to render, or a TextContent descriptor
   */
  content?: unknown;
}

// ── Computed output types ────────────────────────────────────────────────────

/**
 * Absolute pixel rectangle on the canvas.  Output of LayoutEngine.computeLayout.
 */
export interface ComputedBounds {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * A UINode with its absolute pixel bounds fully resolved, plus recursively
 * resolved children.  Produced by LayoutEngine.computeLayout.
 */
export interface ComputedNode {
  node: UINode;
  bounds: ComputedBounds;
  children: ComputedNode[];
}

// ── Tree utilities ───────────────────────────────────────────────────────────

/**
 * Depth-first search for the first ComputedNode whose `node.id` matches `id`.
 * Returns `null` if not found.
 */
export function findComputedNodeById(root: ComputedNode, id: string): ComputedNode | null {
  if (root.node.id === id) return root;
  for (const child of root.children) {
    const found = findComputedNodeById(child, id);
    if (found !== null) return found;
  }
  return null;
}
