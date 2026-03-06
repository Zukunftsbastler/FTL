# SPRINT 32: Declarative Canvas UI Engine (Flexbox for Canvas)

## 1. Sprint Objective
**To the AI Assistant:** Currently, UI rendering in `RenderSystem.ts` relies on hardcoded, imperative math (calculating exact X/Y/W/H pixels for every panel). We are migrating to a **declarative UI layout engine** inspired by Flexbox, operating entirely within the Canvas API (NO HTML/DOM elements). The goal is to define UI as a tree of nodes (Rows, Columns, Panels, Spacers) and build a `LayoutEngine` that recursively calculates absolute pixel bounds based on flex constraints, which are then passed to our existing `UIRenderer`.

## 2. Tasks

### A. Define UI Types (`src/engine/ui/UITypes.ts`)
Create a new file for the AST (Abstract Syntax Tree) definitions.
* Define `NodeType`: `'Row' | 'Column' | 'Panel' | 'Spacer' | 'Text'`
* Define `UINode` interface:
  * `type: NodeType`
  * `id?: string`
  * `width?: number | string` (e.g., `200` or `'100%'`)
  * `height?: number | string`
  * `flexGrow?: number` (How much remaining space this node consumes)
  * `padding?: number`
  * `margin?: number`
  * `children?: UINode[]`
  * `content?: any` (Text string, or style config for panels)
* Define a `ComputedBounds` interface: `{ x: number, y: number, w: number, h: number }`. Every processed node will receive this.

### B. The Layout Solver (`src/engine/ui/LayoutEngine.ts`)
Create a utility class with a method `computeLayout(node: UINode, parentBounds: ComputedBounds): ComputedNode`.
* **The Math Logic:**
  1. Apply padding and margins to shrink the usable `parentBounds`.
  2. If the node is a `'Row'`, lay out children horizontally. If `'Column'`, vertically.
  3. **First Pass (Fixed Size):** Iterate over `children`. If a child has a fixed pixel width/height or a percentage (e.g., `'50%'` of parent), assign it.
  4. **Second Pass (Flex):** Calculate the remaining unassigned space in the parent container. Sum up the `flexGrow` values of all children. Distribute the remaining space proportionally to the `flexGrow` children.
  5. Recursively call `computeLayout` on all children, passing their newly computed localized bounds.

### C. Tree Renderer (`src/engine/ui/UIRenderer.ts`)
* Add a new method: `renderTree(ctx: CanvasRenderingContext2D, computedNode: ComputedNode)`.
* Iterate through the computed tree recursively.
* If `type === 'Panel'`, call the existing `drawSciFiPanel` using the node's computed X, Y, W, H.
* If `type === 'Text'`, draw `ctx.fillText` based on the computed bounds and text alignment.
* `'Row'`, `'Column'`, and `'Spacer'` do not render anything; they are just invisible structural containers.

### D. Refactor RenderSystem (`src/game/systems/RenderSystem.ts`)
* Delete all the imperative math for the Top Bar, Left Pillar, and Bottom Weapons.
* Define a constant `CombatHUD: UINode` tree at the top of the file that mimics our layout:
  * Root: `Column`, `100% / 100%`, `padding: 15`.
  * Child 1: `Panel` (Top Bar), `height: 45`.
  * Child 2: `Row` (Middle Section), `flexGrow: 1`. 
    * Row Child A: `Panel` (Left Pillar), `width: 260`.
    * Row Child B: `Spacer` (The Safe Zone), `flexGrow: 1`.
  * Child 3: `Panel` (Bottom Bar), `height: 120`.
* In the `update` loop, call `LayoutEngine.computeLayout` using the full `canvas.width/height` as the root bounds, then pass the result to `UIRenderer.renderTree`.

## 3. Success Criteria
* The UI visual output looks structurally identical to the end of Sprint 31 (margins, floating panels), but is generated entirely from a declarative TypeScript object tree.
* Resizing the browser/canvas automatically mathematically recalculates the tree and reflows the UI without overlapping.
* The game relies purely on Canvas (no DOM overlays).
* No TypeScript errors.