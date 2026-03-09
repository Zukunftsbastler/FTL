We need to overhaul our UI styling for better readability and sci-fi flair, fix an overflowing resource bar, and add a crucial missing navigation button to the Star Map.

Please read the requirements in `docs/sprints/SPRINT_56_UI_STYLING_AND_SHIP_MENU.md` carefully.

**Execution Rules:**
1. **Beveled Panels (Task A):** Update your UI drawing functions (likely in `UIRenderer.ts` or `LayoutEngine.ts`). Thicken the borders, make them white, and drastically increase the size of the corner bevels.
2. **Cyan Item Pills (Task B):** When rendering lists inside panels (like Resources or Sector details), add cyan rounded rectangles behind the items and make the text color dark for maximum contrast.
3. **Resource Bar Fix (Task C):** Ensure the Resource bar's width is calculated dynamically so "Scrap" doesn't overflow. Lock its position to the top-left corner in both Map and Combat views.
4. **Ship Menu Button (Task D):** Add a "SHIP" button below the resource bar on the Star Map. Bind its click event to transition to the Ship Upgrade / Equipment screen so the player can install newly found systems outside of stores.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the UI is visually overhauled, the resource bar behaves correctly, and the Ship button works, stage and commit the changes.
Use the commit message: "feat: Sprint 56 complete - Overhauled beveled UI styling, dynamic cyan list items, and added Ship equipment menu".

Please begin by analyzing the UI rendering logic and the Map/Combat systems. Let me know when the commit is successful!