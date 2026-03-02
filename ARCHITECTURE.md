# ARCHITECTURE.md: FTL Clone & AI Coding Guidelines

## 1. Project Overview & AI Instructions
This project is a 1:1 clone of the game "Faster Than Light" (FTL). 
**To the AI Assistant (Claude Code / etc.):** You are acting as the Lead Software Engineer. This document contains the immutable laws of this codebase. Read this carefully before generating or modifying any code. 
* **Do not guess systems:** If a dependency or interface is missing, ask for the relevant documentation or API contract first.
* **Keep files microscopic:** Never write monolithic files. One class/interface/system per file.
* **Fail loudly:** Use TypeScript's strict typing to ensure components map correctly. If types mismatch, do not cast with `as any` – fix the underlying architectural flaw.

## 2. Tech Stack
* **Language:** TypeScript (Strict Mode).
* **Environment:** Web browser via Vite (bundler).
* **Rendering:** Vanilla HTML5 Canvas API (2D context). No heavy external game engines.
* **State Management:** Custom Entity-Component-System (ECS).

## 3. Core Architectural Pillars

### A. Entity-Component-System (ECS)
We strictly adhere to the ECS paradigm to ensure maximum decoupling. This is crucial for keeping the context window small and modular.

* **Entities:** Are strictly numerical IDs (`type Entity = number;`). They have no logic and no data.
* **Components:** Are pure data containers (Interfaces or simple classes). **NO logic or methods allowed.** * *Example:* `HealthComponent { current: number; max: number; }`
* **Systems:** Contain ALL the game logic. A System iterates over Entities that possess a specific set of Components and mutates their data.
    * *Example:* `CombatSystem` looks for entities with `WeaponComponent` and `TargetComponent`.

### B. Data-Driven Design
Game content is never hardcoded. All ships, weapons, crew stats, and text events are loaded from JSON files located in the `/data` directory. The Engine only knows how to parse these files and attach the corresponding Components to Entities.

### C. UI / Logic Separation
The User Interface (Canvas drawing, button clicks) must be completely decoupled from the game logic. 
* The UI reads Component data to draw the screen (e.g., reading a `RoomComponent` to draw an oxygen bar).
* The UI sends generic actions (e.g., `Action.FIRE_WEAPON`) to an Event Bus or Input Queue. It never calls `CombatSystem.fire()` directly.

## 4. Directory Structure
```text
/src
  /engine        # The generic game framework (ECS, Game Loop, Canvas Renderer).
  /game          # FTL-specific logic.
    /components  # Pure data (e.g., CrewComp, ShieldComp, RoomComp).
    /systems     # Logic (e.g., CombatSystem, OxygenSystem, MovementSystem).
    /states      # Game States (MainMenu, StarMap, Combat).
  /ui            # UI Elements and Canvas drawing logic.
  /utils         # Math, Pathfinding (A* for crew), Data Loaders.
/data            # JSON files (ships.json, weapons.json, events.json).
/assets          # Images, Sprites, Sounds.
/tests           # Automated unit tests.
```

## 5. Coding Standards for the AI
* **Interfaces First:** Before implementing a new System, define its input/output interfaces.
* **No Circular Dependencies:** A System can read Components, but Systems should not directly call other Systems. Use an Event/Message Bus for cross-system communication.
* **Test-Driven:** Write a unit test for the logic (e.g., "Shields block 1 damage and reduce charge") before writing the System that implements it.