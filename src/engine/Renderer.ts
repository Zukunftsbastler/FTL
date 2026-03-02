import type { IRenderer } from './IRenderer';

/** Canvas 2D implementation of IRenderer. Constructed once in main.ts and passed to UI/render systems. */
export class Renderer implements IRenderer {
  private readonly ctx: CanvasRenderingContext2D;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  clear(hexColor: string): void {
    const { canvas } = this.ctx;
    this.ctx.fillStyle = hexColor;
    this.ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: string,
    filled = true,
  ): void {
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fillRect(x, y, width, height);
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.strokeRect(x, y, width, height);
    }
  }

  drawSprite(
    assetId: string,
    _x: number,
    _y: number,
    _width?: number,
    _height?: number,
    _rotation?: number,
  ): void {
    // Asset pipeline not yet implemented. Stub added for interface compliance.
    console.warn(`Renderer.drawSprite: asset '${assetId}' not yet loaded.`);
  }

  drawText(
    text: string,
    x: number,
    y: number,
    font: string,
    color: string,
    align: 'left' | 'center' | 'right' = 'left',
  ): void {
    this.ctx.font = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;
    this.ctx.fillText(text, x, y);
  }
}
