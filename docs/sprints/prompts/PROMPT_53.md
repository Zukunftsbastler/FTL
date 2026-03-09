We need to completely overhaul the visual style of our galaxy backgrounds. The previous implementation was too mathematical and symmetrical. We are moving to a photorealistic shader using domain warping and subtractive dust lanes.

Please read `docs/sprints/SPRINT_53_PHOTOREALISTIC_GALAXY.md` carefully.

**Execution Rules:**
1. **Shader Overhaul (Task A):** Open `src/game/world/BackgroundGenerator.ts`. Find the `STANDARD` branch inside the `main()` function of `FRAG_SRC`. Replace its contents entirely with the highly detailed, photorealistic GLSL math provided in the sprint document.
2. **Cleanup (Task B):** Make sure to delete the old variables (`arms`, `twist`, `armSignal`, etc.) inside that block so the WebGL compiler doesn't throw warnings about unused variables.
3. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the photorealistic shader math is implemented and running without GLSL errors, stage and commit the changes.
Use the commit message: "feat: Sprint 53 complete - Implemented photorealistic galaxy shader with domain warping and dust lanes".

Please apply these changes to `BackgroundGenerator.ts` now! Let me know when the commit is successful.