We need to fix a critical math artifact in our background shader. The current hash function produces repeating 10x10 tile patterns, and the galaxy is stretching elliptically.

Please read `docs/sprints/SPRINT_51_SHADER_ARTIFACT_FIXES.md`.

**Execution Rules:**
1. **Hash Fix (Task A):** Open `src/game/world/BackgroundGenerator.ts` and completely replace the `hash` function inside `FRAG_SRC` with the provided Hash13 logic.
2. **Aspect Ratio (Task B):** In the `STANDARD` branch of the `main()` function in the shader, apply the `p.x *= u_resolution.x / u_resolution.y;` fix before calculating distance and angle. This ensures the galaxy is perfectly round.
3. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the shader math is fixed, stage and commit the changes.
Use the commit message: "fix: Sprint 51 complete - Fixed shader grid artifacts and corrected galaxy aspect ratio".

Please apply these changes now!