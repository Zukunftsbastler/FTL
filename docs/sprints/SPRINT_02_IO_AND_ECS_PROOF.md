# SPRINT 02: I/O Systems & ECS Proof of Life

## 1. Sprint Objective
**To the AI Assistant:** Our engine foundation is running, but it is blind and deaf. The goal of this sprint is to implement the Input System, an asynchronous Asset Loader, and a basic Render System. We will then prove the ECS works by spawning a test entity that follows the mouse cursor.


## 2. Tasks

### A. Implement the Input System (`src/engine/Input.ts`)
Implement the `IInput` interface defined in `ENGINE_API.md`.
* Attach global event listeners (`mousemove`, `mousedown`, `mouseup`, `keydown`, `keyup`) to the window or canvas.
* Track key/button states. 
* **Crucial:** Implement the logic for `isKeyJustPressed` and `isMouseJustPressed`. This usually requires storing the "previous frame state" and updating it at the very end of the game loop in `main.ts`.

### B. Implement the Asset Loader (`src/utils/AssetLoader.ts`)
We need a simple, Promise-based static class or singleton to load assets before the game loop begins.
* `loadImage(id: string, url: string): Promise<void>` -> Loads an `HTMLImageElement` and stores it in a dictionary.
* `loadJSON<T>(id: string, url: string): Promise<T>` -> Fetches and parses a JSON file.
* Update `Renderer.drawSprite()` to accept an `id`, look up the `HTMLImageElement` from the AssetLoader, and draw it to the canvas.

### C. Create the First Components (`src/game/components/`)
Create two minimal components to test the ECS:
1. `PositionComponent` (`_type = 'Position'`): Contains `x` and `y` coordinates.
2. `SpriteComponent` (`_type = 'Sprite'`): Contains an `assetId` string, `width`, and `height`.

### D. Create the Render System (`src/game/systems/RenderSystem.ts`)
This is our first true ECS System.
* It must have an `update(world: IWorld)` method.
* It queries the world for all entities that have BOTH `'Position'` and `'Sprite'` components.
* It iterates through them and calls `Renderer.drawSprite()` using their position and asset ID.

### E. The "Proof of Life" (Update `src/main.ts`)
Tie it all together in the main entry point:
1. **Pre-load:** Use the AssetLoader to load a temporary placeholder image (e.g., a simple colored square or any available icon, you can generate a 1x1 pixel via canvas API dynamically if no URL is available).
2. **Setup:** Create a test Entity via `world.createEntity()`. Attach a `PositionComponent` and `SpriteComponent` to it.
3. **Game Loop:** * Update the `PositionComponent` of the test entity to match `Input.getMousePosition()`.
    * Call `RenderSystem.update(world)`.
    * Call `Input.update()` (to reset the "just pressed" states for the next frame).

## 3. Success Criteria
* The canvas no longer just shows a black screen.
* A sprite or colored box renders on the screen and accurately follows the mouse cursor.
* Clicking the mouse logs a message to the console exactly *once* per click (proving `isMouseJustPressed` works).
* No TypeScript errors (`tsc --noEmit`).