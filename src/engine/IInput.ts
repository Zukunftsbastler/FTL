/** Public contract for the Input system. Poll this each frame — do not attach DOM listeners in game logic. */
export interface IInput {
  /** Returns true every frame the key is held down. Key codes follow the KeyboardEvent.code spec (e.g. 'Space', 'KeyW'). */
  isKeyDown(keyCode: string): boolean;

  /** Returns true ONLY on the single frame the key first went down. */
  isKeyJustPressed(keyCode: string): boolean;

  /** Returns the current mouse position relative to the canvas top-left corner. */
  getMousePosition(): { x: number; y: number };

  /** Returns true every frame the given mouse button is held. 0 = left, 2 = right. */
  isMouseDown(button: number): boolean;

  /** Returns true ONLY on the single frame the mouse button was first pressed. */
  isMouseJustPressed(button: number): boolean;
}
