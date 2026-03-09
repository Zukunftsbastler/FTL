We need to fix a critical UI scaling bug and drastically improve the immersion of our Ship Overview and Store screens by adopting the multi-panel overlay approach from the original FTL.

Please review the requirements in `docs/sprints/SPRINT_57_IMMERSIVE_UI_AND_BEVEL_FIX.md`.

**Execution Rules:**
1. **Bevel Fix (Task A):** Open your UI rendering logic (`UIRenderer.ts` or `LayoutEngine.ts`). Fix the `drawBeveledPanel` math so the corner cutouts are hard-capped at around 15-20 pixels maximum. Do not let them scale endlessly with the height of the panel.
2. **Transparent Overlay (Task B):** Modify the main render loop. When in the `UPGRADE` or `STORE` state, you must render the underlying `STAR_MAP` first, then apply a translucent black overlay (`rgba(0,0,0, 0.65)`), and only THEN render the UI elements.
3. **Modular Layouts (Task C & D):** Refactor the UI layout in `UpgradeSystem.ts` (and `StoreSystem.ts` if applicable). Stop using a single giant bounding box. Draw multiple discrete beveled panels (Left for systems, Center-Top for weapons, Right for crew). Do the same for the Store (Left for resources, Center for item categories).
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the background rendering preserves immersion, the bevel sizes are capped, and the UI uses modular "island" panels, stage and commit all changes.
Use the commit message: "fix: Sprint 57 complete - Capped UI bevel sizes, immersive translucent backgrounds, and modular FTL-style layouts".

Please begin by analyzing `UIRenderer.ts`, `RenderSystem.ts` (or your main render loop), and `UpgradeSystem.ts`. Let me know when the commit is successful!