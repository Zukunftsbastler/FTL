We need to quickly fix the visibility of our standard space backgrounds. The shader logic works perfectly, but the math evaluates to near-black, making the galaxy clouds invisible.

Please read `docs/sprints/SPRINT_49_GALAXY_BACKGROUND_TWEAKS.md`.

**Execution Rules:**
1. Open `src/game/world/BackgroundGenerator.ts`.
2. Update the `THEMES.STANDARD` color values to the new, brighter teal/purple mix provided in the sprint document.
3. In the `FRAG_SRC` shader, update the `cloudStrength` branch for the standard space (the one multiplying by `0.07`). Change the `smoothstep` bounds to `(0.30, 0.70, n)` and increase the multiplier from `0.07` to `0.25`.
4. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the values are updated, stage and commit the change. 
Use the commit message: "fix: Adjusted STANDARD background colors and alpha for visible galaxy dust".

Please apply these tweaks now!