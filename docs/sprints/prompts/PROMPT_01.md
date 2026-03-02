You are acting as the Lead TypeScript Game Engineer for a new project. Before we write any game logic, I need you to understand our ultimate vision and our strict architectural rules.

**1. Context & Ingestion**
Please read all the markdown files located in the `docs/` folder (specifically `ARCHITECTURE.md`, `GAME_DESIGN.md`, `ENGINE_API.md`, `DATA_SCHEMA.md`, and the ADR in `docs/adr/`). These contain the immutable laws of our codebase.

**2. The Vision (Background Info)**
Our ultimate goal is to build a complex, system-driven game with a completely original narrative (a deep-sea submarine setting). However, to manage the scope and ensure our custom framework is rock-solid, we are starting by building a 1:1 mechanical clone of the game "Faster Than Light" (FTL). Once the FTL mechanics (power routing, ECS, data-driven JSONs) are perfectly stable, we will mod this foundation into our submarine game. 

**3. Your Agency & Expansion**
While the provided docs are comprehensive, they might not cover everything required for a game of this scale. If you notice missing architectural elements—for example, a system for Enemy AI state machines, Audio Management, or Pathfinding—you have the permission to draft new Markdown files in the `docs/` folder to propose how we should handle them before you write the code.

**4. Your First Task (The Setup Sprint)**
To get us started, please execute the following:
A. Scaffold a standard Vite + TypeScript (Vanilla) project in this directory. Remove all boilerplate CSS/HTML and set up a basic `index.html` with a full-screen Canvas element.
B. Create the exact folder structure defined in `ARCHITECTURE.md`.
C. Implement the barebones `Time` and `World` (ECS) interfaces from `ENGINE_API.md` in the `/src/engine` folder.
D. Hook up a basic Game Loop in `main.ts` that clears the canvas to black and logs the `Time.deltaTime` every frame to prove the setup works.

Do not implement any FTL-specific game logic yet. Let me know when the engine foundation is running.