We are ready for the next phase. Please read the new sprint document I just created: `docs/sprints/SPRINT_02_IO_AND_ECS_PROOF.md`.

This sprint is our "ECS Proof of Life." Your task is to implement the Input System, Asset Loader, and our very first ECS System (the RenderSystem). Then, tie them together in `main.ts` so we have an entity following the mouse cursor.

**Execution Rules:**
1. Strictly follow the interfaces defined in `docs/api/ENGINE_API.md`. 
2. Remember our golden rule from `ARCHITECTURE.md`: Do not use DOM manipulation (no HTML elements for game objects). Everything visual must be drawn onto the Canvas via the Renderer.
3. Work step-by-step through Tasks A to E in the sprint document. For the placeholder asset in Task E, you can programmatically generate a 32x32 colored square using the Canvas API and store it as a data URL, so we don't need external image files just yet.
4. Ensure your code is strictly typed. Run `tsc --noEmit` to verify there are no TypeScript errors.

**Version Control Instructions:**
Once you have verified that the success criteria are met (a sprite follows the mouse, clicks are logged exactly once, and there are zero TS errors), please stage and commit all changes to the Git repository. Use the commit message: "feat: Sprint 2 complete - Input, AssetLoader, and ECS Proof of Life".

Please begin and let me know when the commit is successful!