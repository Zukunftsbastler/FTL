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

  drawLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color: string,
    lineWidth = 1,
  ): void {
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth   = lineWidth;
    this.ctx.stroke();
  }

  drawEllipse(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    color: string,
    filled = true,
    lineWidth = 1,
  ): void {
    this.ctx.beginPath();
    this.ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth   = lineWidth;
      this.ctx.stroke();
    }
  }

  drawPolygon(
    points: ReadonlyArray<{ x: number; y: number }>,
    color: string,
    filled = true,
    lineWidth = 1,
  ): void {
    if (points.length < 2) return;
    this.ctx.beginPath();
    this.ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      this.ctx.lineTo(points[i].x, points[i].y);
    }
    this.ctx.closePath();
    if (filled) {
      this.ctx.fillStyle = color;
      this.ctx.fill();
    } else {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth   = lineWidth;
      this.ctx.stroke();
    }
  }

  drawTextWrapped(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    lineHeight: number,
    font: string,
    color: string,
    align: 'left' | 'center' | 'right' = 'left',
  ): number {
    this.ctx.font      = font;
    this.ctx.fillStyle = color;
    this.ctx.textAlign = align;

    const words: string[] = text.split(' ');
    let   line            = '';
    let   currentY        = y;

    for (const word of words) {
      const testLine  = line.length === 0 ? word : `${line} ${word}`;
      const testWidth = this.ctx.measureText(testLine).width;

      if (testWidth > maxWidth && line.length > 0) {
        // Current line is full — flush it and start a new one with the current word.
        this.ctx.fillText(line, x, currentY);
        line     = word;
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }

    // Flush the last partial line.
    if (line.length > 0) {
      this.ctx.fillText(line, x, currentY);
      currentY += lineHeight;
    }

    return currentY;
  }

  drawTooltip(x: number, y: number, text: string): void {
    const FONT   = '12px monospace';
    const PAD_X  = 8;
    const PAD_Y  = 5;
    const LINE_H = 14;

    this.ctx.font = FONT;
    const textW = this.ctx.measureText(text).width;
    const boxW  = textW + PAD_X * 2;
    const boxH  = LINE_H + PAD_Y * 2;

    // Position right of cursor; flip left if too close to the right edge.
    let bx = x + 14;
    if (bx + boxW > this.ctx.canvas.width - 4) bx = x - boxW - 8;
    const by = Math.max(4, y - boxH - 4);

    this.ctx.fillStyle = 'rgba(8,12,24,0.92)';
    this.ctx.fillRect(bx, by, boxW, boxH);

    this.ctx.strokeStyle = '#445566';
    this.ctx.lineWidth   = 1;
    this.ctx.strokeRect(bx, by, boxW, boxH);

    this.ctx.fillStyle = '#cceeff';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(text, bx + PAD_X, by + PAD_Y + LINE_H - 1);
  }
}
