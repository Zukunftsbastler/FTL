import { AssetLoader } from '../utils/AssetLoader';
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
    x: number,
    y: number,
    width?: number,
    height?: number,
    rotation?: number,
  ): void {
    const image = AssetLoader.getImage(assetId);
    if (image === undefined) {
      console.warn(`Renderer.drawSprite: asset '${assetId}' not found in registry.`);
      return;
    }

    const w = width ?? image.naturalWidth;
    const h = height ?? image.naturalHeight;

    if (rotation !== undefined && rotation !== 0) {
      this.ctx.save();
      this.ctx.translate(x + w / 2, y + h / 2);
      this.ctx.rotate(rotation);
      this.ctx.drawImage(image, -w / 2, -h / 2, w, h);
      this.ctx.restore();
    } else {
      this.ctx.drawImage(image, x, y, w, h);
    }
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

  drawCircle(
    x: number,
    y: number,
    radius: number,
    color: string,
    filled = true,
    lineWidth = 1,
  ): void {
    this.ctx.beginPath();
    this.ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.ctx.canvas.width, height: this.ctx.canvas.height };
  }
}
