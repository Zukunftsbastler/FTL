# SPRINT 57: Immersive UI Overlays & Modular Layouts

## 1. Sprint Objective
**To the AI Assistant:** The current Ship Overview (Upgrade) and Store menus are rendering as massive, single full-screen panels with a dark background. This breaks immersion and causes a severe visual bug where proportional bevel calculations create giant, screen-obscuring cutouts on large panels. We need to cap the bevel size, render the underlying game state (Star Map) transparently behind these menus, and break down the monolithic Ship and Store views into modular, FTL-authentic floating "island" panels.

## 2. Tasks

### A. Fix Beveled Panel Scaling (`UIRenderer.ts` or equivalent)
* **The Problem:** The corner cutouts (bevels) scale proportionally with height, breaking large panels.
* **The Fix:** In the function that draws the beveled path, replace the proportional inset calculation with an absolute pixel value, or cap it. 
  * Example: `const bevelSize = Math.min(width * 0.05, height * 0.05, 20);` (Lock it to a maximum of 20 pixels regardless of how large the panel is).

### B. Immersive Background Rendering (`RenderSystem.ts` / `main.ts`)
* **The Problem:** Opening the Store or Ship Menu replaces the game background entirely with black or fills the entire screen.
* **The Fix:** When the `GameState` is `UPGRADE` or `STORE` (or whatever the exact states are):
  1. Do NOT skip rendering the underlying environment. Render the `STAR_MAP` (or combat background) first.
  2. Draw a full-screen, translucent black overlay (e.g., `ctx.fillStyle = 'rgba(0, 0, 0, 0.65)'; ctx.fillRect(...)`) over the map to darken it.
  3. Draw the interactive UI panels on top.

### C. Modular Ship View Layout (`UpgradeSystem.ts`)
* **The Fix:** Break the massive single panel into distinct, floating beveled panels (like original FTL):
  * **Left Panel:** Systems and Reactor power.
  * **Top-Center Panel:** Weapons and Drones inventory/slots.
  * **Right Panel:** Crew list and Cargo/Augments.
  * *Leave the middle background visible* (or eventually draw the ship preview there).
* Apply the new cyan pill styling (from Sprint 56) to the items inside these modular panels.

### D. Modular Store Layout (`StoreSystem.ts` or `UpgradeSystem.ts`)
* **The Fix:** Similarly, refactor the Store UI to use floating panels over the darkened background:
  * **Left Panel:** Resources (Fuel, Missiles, Hull Repair, Drones).
  * **Center/Right Panels:** Display the generated store categories (e.g., one distinct beveled panel for "WEAPONS", one for "SYSTEMS").
  * **Top-Left:** Ensure the player's Resource Bar is still visible and correctly positioned.

## 3. Success Criteria
* Beveled corners remain sharp and appropriately sized (e.g., ~15px) even on very large UI panels.
* The Star Map / game background remains visible (but darkened) behind the Store and Ship Upgrade screens.
* The Ship Upgrade screen consists of multiple smaller floating panels grouped by category (Systems, Weapons, Crew).
* The Store screen consists of multiple smaller floating panels.
* No TypeScript errors.