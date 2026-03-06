We are undertaking a major software engineering upgrade to our UI system. We are replacing our imperative, hardcoded canvas math with a declarative, AST-based layout engine (a mini "Flexbox" for Canvas).

Please read `docs/sprints/SPRINT_32_DECLARATIVE_UI_ENGINE.md`.

**Execution Rules:**
1. **NO HTML/CSS:** This must be implemented purely via TypeScript math calculating `ComputedBounds` (X, Y, Width, Height) to feed into our existing `UIRenderer` Canvas methods. Do not create DOM elements.
2. **The Layout Algorithm:** In Task B (`LayoutEngine.ts`), keep the solver simple but robust. It only needs to support 1D flow per node (Row or Column). First allocate space for fixed/percentage children, then divide the remaining available pixels among children with `flexGrow > 0`.
3. **Refactoring RenderSystem:** In Task D, define the `CombatHUD` tree structure as a constant. This tree is the single source of truth for the layout. Pass `canvas.width` and `canvas.height` as the root bounds to the solver.
4. **Safe Zone Integration:** The "Safe Zone" for ships we created earlier is now simply the empty `Spacer` node in the middle of our UI tree. You can read the computed bounds of that specific `Spacer` node from the solver result to dynamically determine where to draw the player/enemy ships!
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the LayoutEngine mathematically solves the tree, the UIRenderer recursively draws it, and RenderSystem successfully uses the `CombatHUD` AST to render the interface, please stage and commit all changes. Use the commit message: "feat: Sprint 32 complete - Declarative AST Flexbox layout engine for Canvas UI".

Please begin and let me know when the commit is successful!