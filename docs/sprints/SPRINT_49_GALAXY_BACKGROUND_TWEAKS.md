# SPRINT 49: Galaxy Background Visibility Tweaks

## 1. Sprint Objective
**To the AI Assistant:** The procedural background generator is working, but the `STANDARD` space theme is tuned far too dark. The FBM clouds for the galaxy/milky way effect result in pixel values near RGB(1,1,1), making them entirely invisible to the user. We need to tweak the colors and alpha multipliers in `BackgroundGenerator.ts` to make the standard galaxy dust visible and aesthetically pleasing.

## 2. Tasks

### A. Adjust STANDARD Theme Palette (`BackgroundGenerator.ts`)
* **The Fix:** Find the `THEMES` constant. Change the `STANDARD` colors to be slightly brighter and more saturated to simulate distant galaxy dust (e.g., mixing a deep blue/cyan with a faint cosmic purple).
  * Update to: `STANDARD: { cloudA: [0.05, 0.15, 0.25], cloudB: [0.15, 0.05, 0.20] }`

### B. Adjust Shader Alpha & Spread (`BackgroundGenerator.ts`)
* **The Fix:** In the `FRAG_SRC`, modify the `cloudStrength` calculation for the standard theme (when `u_isNebula <= 0.5`).
  * Currently: `smoothstep(0.42, 0.58, n) * 0.07;`
  * **Change to:** `smoothstep(0.30, 0.70, n) * 0.25;`
  * *Reasoning:* Widening the smoothstep bounds (`0.30` to `0.70`) creates softer, wider dust bands rather than dense clumps. Increasing the multiplier to `0.25` ensures the color is actually visible against the black void without overpowering the UI.

## 3. Success Criteria
* The `STANDARD` background displays faint but clearly visible colorful galaxy/dust clouds.
* The `NEBULA` background remains unaffected.
* No TypeScript errors.