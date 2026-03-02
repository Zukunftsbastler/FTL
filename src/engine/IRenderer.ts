/** Rendering contract. Must only be called from Render Systems or UI Systems — never from gameplay logic. */
export interface IRenderer {
  /** Fills the entire canvas with the given hex colour. Called once at the start of each frame. */
  clear(hexColor: string): void;

  /** Draws a filled or stroked rectangle. Useful for UI, health bars, and debug overlays. */
  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    filled?: boolean,
  ): void;

  /** Draws a pre-loaded sprite at the given position. Rotation is in radians. */
  drawSprite(
    assetId: string,
    x: number,
    y: number,
    width?: number,
    height?: number,
    rotation?: number,
  ): void;

  /** Draws text onto the canvas. */
  drawText(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align?: 'left' | 'center' | 'right',
  ): void;

  /** Draws a filled or stroked circle centred at (x, y). lineWidth only applies when filled=false. */
  drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    filled?: boolean,
    lineWidth?: number,
  ): void;

  /** Returns the current pixel dimensions of the rendering surface. Used for HUD layout. */
  getCanvasSize(): { width: number; height: number };

  /** Draws a straight line between two points. */
  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth?: number,
  ): void;

  /**
   * Draws a small floating tooltip box near (x, y).
   * Automatically flips left if the box would overflow the right edge of the canvas.
   */
  drawTooltip(x: number, y: number, text: string): void;

  /**
   * Draws a closed polygon defined by an array of {x, y} vertices.
   * @param points  Two or more vertices in drawing order.
   * @param color   Fill or stroke colour.
   * @param filled  True to fill, false to stroke.
   * @param lineWidth  Only used when filled=false.
   */
  drawPolygon(
    points: ReadonlyArray<{ x: number; y: number }>,
    color: string,
    filled?: boolean,
    lineWidth?: number,
  ): void;
}
