import type { UINode, ComputedBounds, ComputedNode } from './UITypes';

/**
 * Stateless flex-style layout solver for the Canvas UI system.
 *
 * Supports a simplified 1-D Flexbox model:
 *   • Row nodes  — children flow horizontally; each child fills the row's full height.
 *   • Column nodes — children flow vertically; each child fills the column's full width.
 *   • Fixed sizing  — integer pixel values assigned directly.
 *   • Percentage sizing — resolved relative to the parent's content area.
 *   • Flex sizing  — remaining space distributed proportionally via `flexGrow`.
 *   • Padding and margin — uniformly applied on all four sides.
 *
 * Usage:
 *   const root = LayoutEngine.computeLayout(myUINode, { x: 0, y: 0, w: cw, h: ch });
 */
export class LayoutEngine {
  /**
   * Recursively solves the layout for `node` given the pixel rectangle
   * `parentBounds` that the parent has already allocated for it.
   *
   * Returns a `ComputedNode` tree with fully resolved absolute bounds for
   * every node in the sub-tree.
   */
  static computeLayout(node: UINode, parentBounds: ComputedBounds): ComputedNode {
    // ── 1. Apply margin to shrink this node's own bounds ────────────────────
    const margin = node.margin ?? 0;
    const myBounds: ComputedBounds = {
      x: parentBounds.x + margin,
      y: parentBounds.y + margin,
      w: Math.max(0, parentBounds.w - margin * 2),
      h: Math.max(0, parentBounds.h - margin * 2),
    };

    // ── 2. Compute the content area (after padding) for child layout ─────────
    const padding = node.padding ?? 0;
    const content: ComputedBounds = {
      x: myBounds.x + padding,
      y: myBounds.y + padding,
      w: Math.max(0, myBounds.w - padding * 2),
      h: Math.max(0, myBounds.h - padding * 2),
    };

    // ── 3. Layout children ───────────────────────────────────────────────────
    const computedChildren: ComputedNode[] = [];

    if (node.children !== undefined && node.children.length > 0) {
      if (node.type === 'Row') {
        LayoutEngine.layoutRow(node.children, content, computedChildren);
      } else if (node.type === 'Column') {
        LayoutEngine.layoutColumn(node.children, content, computedChildren);
      }
      // Panel / Spacer / Text with children: treat like Column (unusual but safe).
    }

    return { node, bounds: myBounds, children: computedChildren };
  }

  // ── Row layout (horizontal flow) ──────────────────────────────────────────

  private static layoutRow(
    children: UINode[],
    content: ComputedBounds,
    out: ComputedNode[],
  ): void {
    const childWidths = LayoutEngine.resolveMainAxis(children, content.w, 'width');

    let currentX = content.x;
    for (let i = 0; i < children.length; i++) {
      const childBounds: ComputedBounds = {
        x: currentX,
        y: content.y,
        w: childWidths[i],
        h: content.h,
      };
      out.push(LayoutEngine.computeLayout(children[i], childBounds));
      currentX += childWidths[i];
    }
  }

  // ── Column layout (vertical flow) ─────────────────────────────────────────

  private static layoutColumn(
    children: UINode[],
    content: ComputedBounds,
    out: ComputedNode[],
  ): void {
    const childHeights = LayoutEngine.resolveMainAxis(children, content.h, 'height');

    let currentY = content.y;
    for (let i = 0; i < children.length; i++) {
      const childBounds: ComputedBounds = {
        x: content.x,
        y: currentY,
        w: content.w,
        h: childHeights[i],
      };
      out.push(LayoutEngine.computeLayout(children[i], childBounds));
      currentY += childHeights[i];
    }
  }

  // ── Flex size solver (shared for both axes) ───────────────────────────────

  /**
   * For an array of child nodes and an available `totalPx` budget,
   * returns an array of resolved pixel sizes on the requested axis.
   *
   * Algorithm:
   *   Pass 1 — assign fixed-px and percentage sizes.
   *   Pass 2 — divide remaining space among flexGrow children.
   */
  private static resolveMainAxis(
    children: UINode[],
    totalPx: number,
    axis: 'width' | 'height',
  ): number[] {
    const sizes: number[] = new Array<number>(children.length).fill(0);
    let fixedTotal    = 0;
    let totalFlexGrow = 0;

    // Pass 1: fixed and percentage children.
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      const spec  = child[axis];

      if (typeof spec === 'number') {
        // Fixed pixel value.
        sizes[i]    = spec;
        fixedTotal += spec;
      } else if (typeof spec === 'string' && spec.endsWith('%')) {
        // Percentage of the available container size.
        const pct   = Math.max(0, Math.min(100, parseFloat(spec))) / 100;
        sizes[i]    = Math.round(totalPx * pct);
        fixedTotal += sizes[i];
      } else if ((child.flexGrow ?? 0) > 0) {
        // Will be resolved in pass 2.
        totalFlexGrow += child.flexGrow!;
      }
      // else: no spec, no flexGrow → stays at 0.
    }

    // Pass 2: flex children share the remaining space.
    const remaining = Math.max(0, totalPx - fixedTotal);
    if (totalFlexGrow > 0 && remaining > 0) {
      let distributed = 0;
      const flexIndices: number[] = [];

      for (let i = 0; i < children.length; i++) {
        const fg = children[i].flexGrow ?? 0;
        if (fg > 0 && children[i][axis] === undefined) {
          const share   = Math.round(remaining * fg / totalFlexGrow);
          sizes[i]      = share;
          distributed  += share;
          flexIndices.push(i);
        }
      }

      // Fix rounding drift by adding the leftover px to the last flex child.
      const drift = remaining - distributed;
      if (drift !== 0 && flexIndices.length > 0) {
        sizes[flexIndices[flexIndices.length - 1]] += drift;
      }
    }

    return sizes;
  }
}
