# ENGINE_API.md: Core Framework Interfaces

## 1. Document Purpose
**To the AI Assistant:** This document defines the exact public API for the custom TypeScript game engine underlying this project. You must NEVER use DOM manipulation (e.g., `document.createElement`, `innerHTML`) for gameplay or rendering. You must ONLY use the interfaces provided below to interact with the screen, audio, input, and entity data.

## 2. Global Time System
All systems that involve movement, charging, or timers MUST use `Time.deltaTime` to remain frame-rate independent.


```typescript
interface ITime {
  /** Time in seconds since the last frame (e.g., 0.016 for 60fps) */
  readonly deltaTime: number;
  /** Total elapsed time since game start in seconds */
  readonly totalTime: number;
}
declare const Time: ITime;
```

## 3. Entity-Component-System (ECS) API
The World instance is the central registry for all game state. Systems receive the World instance in their update() method.

```typescript
type Entity = number;

/** Base interface for all components. Components must be pure data. */
interface Component {
  _type: string; // e.g., 'Position', 'Health', 'Weapon'
}

interface IWorld {
  /** Creates a new unique Entity ID */
  createEntity(): Entity;
  
  /** Destroys an entity and removes all its components */
  destroyEntity(entity: Entity): void;
  
  /** Attaches a component to an entity */
  addComponent(entity: Entity, component: Component): void;
  
  /** Removes a component of a specific type from an entity */
  removeComponent(entity: Entity, componentType: string): void;
  
  /** Gets a specific component from an entity. Returns undefined if not found. */
  getComponent<T extends Component>(entity: Entity, componentType: string): T | undefined;
  
  /** Returns an array of all Entities that possess ALL of the specified component types */
  query(componentTypes: string[]): Entity[];
}
```

## 4. Rendering API (Canvas 2D Wrapper)
The Renderer is strictly for drawing. It should primarily be called by dedicated Render Systems or UI Systems, not by gameplay logic systems.

```typescript

interface IRenderer {
  /** Clears the screen. Called automatically at the start of the frame. */
  clear(hexColor: string): void;
  
  /** Draws a primitive rectangle. Used for UI, health bars, or debugging. */
  drawRect(x: number, y: number, width: number, height: number, color: string, filled?: boolean): void;
  
  /** Draws an image/sprite from the pre-loaded asset dictionary. */
  drawSprite(assetId: string, x: number, y: number, width?: number, height?: number, rotation?: number): void;
  
  /** Draws text to the canvas. */
  drawText(text: string, x: number, y: number, font: string, color: string, align?: 'left' | 'center' | 'right'): void;
}
declare const Renderer: IRenderer;
```

## 5. Input System
The Input system polls the current state of the mouse and keyboard. It does not use event listeners directly in the game logic.

```typescript
interface IInput {
  /** Returns true if the key is currently held down. (e.g., 'Space', 'KeyW') */
  isKeyDown(keyCode: string): boolean;
  
  /** Returns true ONLY on the exact frame the key was pressed. */
  isKeyJustPressed(keyCode: string): boolean;
  
  /** Returns the current mouse X and Y coordinates relative to the canvas. */
  getMousePosition(): { x: number, y: number };
  
  /** Returns true if the left (0) or right (2) mouse button is held. */
  isMouseDown(button: number): boolean;
  
  /** Returns true ONLY on the exact frame the mouse button was clicked. */
  isMouseJustPressed(button: number): boolean;
}
declare const Input: IInput;
```

## 6. Asset & Audio Management
Assets are pre-loaded during the loading screen state. Gameplay systems only trigger them via IDs.

```typescript
interface IAudio {
  /** Plays a pre-loaded sound effect once. */
  playSound(assetId: string, volume?: number): void;
  
  /** Plays a looping background track, stopping the previous one. */
  playMusic(assetId: string, volume?: number): void;
}
declare const Audio: IAudio;
```