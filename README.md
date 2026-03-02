# FTL Engine Clone

A browser-based recreation of the core mechanics from *Faster Than Light* (FTL), built with a custom Entity-Component-System (ECS) engine in TypeScript and Vite. The primary goal is a clean, data-driven architecture that will serve as the foundation for a future deep-sea submarine game.

---

## Features (current)

| Sprint | Feature |
|--------|---------|
| 1 | Vite + TypeScript scaffold, full-screen canvas, game loop |
| 2 | Input system, AssetLoader, sprite rendering |
| 3 | Data-driven ship layout from JSON, room rendering |
| 4 | Crew spawning, left-click selection, basic movement |
| 5 | Door entities, A\* pathfinding, tile-by-tile crew movement |
| 6 | Reactor power management, unit-tested power logic, power bar HUD |

---

## Setup

**Prerequisites:** Node.js 20+, npm 10+

```bash
# Install dependencies
npm install

# Start the development server (hot reload)
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check and build for production |
| `npm run preview` | Preview the production build locally |
| `npm run test` | Run the Vitest unit-test suite |

---

## How to Play

| Action | Input |
|--------|-------|
| Select a crew member | Left-click on the crew circle |
| Move selected crew | Right-click on any walkable room tile |
| Allocate power to a system | Hover over a system room + press **↑** |
| Deallocate power | Hover over a system room + press **↓** |

Crew navigate around solid walls and through doors using A\* pathfinding.
The reactor power budget is displayed in the bottom-left corner of the screen.

---

## Running Tests

```bash
npm run test
```

The test suite uses [Vitest](https://vitest.dev/) and covers the pure power-allocation logic in `src/game/logic/PowerMath.ts`:

- `allocatePower` — transfers 1 unit from the reactor to a system; guards reactor empty / system full
- `deallocatePower` — returns 1 unit from a system to the reactor; guards system at 0
- Round-trip and power-conservation invariants

---

## Architecture

### Custom ECS

The engine uses a minimalist Entity-Component-System pattern with no third-party ECS library.

```
Entity    — a plain number (unique ID)
Component — a pure-data interface with a discriminating _type literal
System    — a class with an update(world) method; all game logic lives here
World     — the central registry: Map<Entity, Map<componentType, Component>>
```

**Key files:**

| File | Role |
|------|------|
| `src/engine/World.ts` | ECS world — entity lifecycle, component storage, query |
| `src/engine/Renderer.ts` | Canvas 2D drawing (implements `IRenderer`) |
| `src/engine/Input.ts` | Keyboard + mouse with "just pressed" semantics |
| `src/engine/Time.ts` | Delta-time tracker |
| `src/game/world/ShipFactory.ts` | Spawns ship / room / door / crew / system entities from JSON |
| `src/utils/Pathfinder.ts` | Pre-built A\* navigation graph from ship template data |
| `src/game/logic/PowerMath.ts` | Pure power-allocation functions (unit-tested) |
| `data/ships.json` | Ship blueprints — rooms, doors, systems, crew |

### Design principles

- **Data-driven:** All ship blueprints live in `data/ships.json`; no hardcoded layouts.
- **Interface-first:** Game systems depend only on `IWorld`, `IInput`, and `IRenderer` — never on concrete classes.
- **One class/interface per file:** Encourages clear ownership and easy navigation.
- **No DOM manipulation in game logic:** All rendering goes through `IRenderer`; all input goes through `IInput`.
- **Strict TypeScript:** `strict: true`, `noUnusedLocals`, `noUnusedParameters` — zero `as any` casts.

---

## Project Structure

```
FTL-Clone/
├── data/                        # Static JSON game data
│   └── ships.json
├── src/
│   ├── engine/                  # Framework-agnostic engine layer
│   │   ├── Component.ts
│   │   ├── Entity.ts
│   │   ├── IInput.ts / Input.ts
│   │   ├── IRenderer.ts / Renderer.ts
│   │   ├── ITime.ts / Time.ts
│   │   └── IWorld.ts / World.ts
│   ├── game/
│   │   ├── components/          # Pure-data component interfaces
│   │   ├── data/                # TypeScript types mirroring JSON schema
│   │   ├── logic/               # Pure, testable game logic (no ECS/DOM)
│   │   ├── systems/             # ECS systems (all game behaviour)
│   │   └── world/               # Entity factories
│   └── utils/                   # Shared utilities (AssetLoader, Pathfinder)
├── tests/                       # Vitest unit tests
│   └── game/
│       └── PowerMath.test.ts
└── docs/                        # Architecture and sprint documents
```
