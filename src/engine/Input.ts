import type { IInput } from './IInput';

/**
 * Concrete Input implementation. Constructed once in main.ts with the game canvas.
 *
 * "Just pressed" logic:
 *   - Raw DOM events populate `keysDown` / `buttonsDown` (held state).
 *   - keydown fires with e.repeat suppressed to guarantee exactly one "just pressed" entry.
 *   - `update()` must be called at the END of every game loop iteration to clear the
 *     justPressed sets so they are empty for the next frame.
 */
export class Input implements IInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly keysDown = new Set<string>();
  private readonly keysJustPressed = new Set<string>();

  private readonly buttonsDown = new Set<number>();
  private readonly buttonsJustPressed = new Set<number>();

  private mouseX: number = 0;
  private mouseY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      // Prevent space from scrolling the page while the game is running.
      if (e.code === 'Space') e.preventDefault();
      // e.repeat is true when the OS is auto-repeating a held key — ignore those.
      if (!e.repeat) {
        this.keysJustPressed.add(e.code);
      }
      this.keysDown.add(e.code);
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keysDown.delete(e.code);
    });

    canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = e.clientX - rect.left;
      this.mouseY = e.clientY - rect.top;
    });

    canvas.addEventListener('mousedown', (e: MouseEvent) => {
      this.buttonsJustPressed.add(e.button);
      this.buttonsDown.add(e.button);
    });

    canvas.addEventListener('mouseup', (e: MouseEvent) => {
      this.buttonsDown.delete(e.button);
    });

    // Prevent the browser's native right-click context menu over the canvas.
    // Without this, right-clicking during gameplay would surface the browser menu.
    canvas.addEventListener('contextmenu', (e: MouseEvent) => {
      e.preventDefault();
    });

  }

  isKeyDown(keyCode: string): boolean {
    return this.keysDown.has(keyCode);
  }

  isKeyJustPressed(keyCode: string): boolean {
    return this.keysJustPressed.has(keyCode);
  }

  getMousePosition(): { x: number; y: number } {
    return { x: this.mouseX, y: this.mouseY };
  }

  isMouseDown(button: number): boolean {
    return this.buttonsDown.has(button);
  }

  isMouseJustPressed(button: number): boolean {
    return this.buttonsJustPressed.has(button);
  }

  setCursor(type: string): void {
    this.canvas.style.cursor = type;
  }

  /**
   * Call once at the END of the game loop to reset "just pressed" states.
   * After this call, isKeyJustPressed / isMouseJustPressed return false until
   * the next raw input event fires.
   */
  update(): void {
    this.keysJustPressed.clear();
    this.buttonsJustPressed.clear();
  }
}
