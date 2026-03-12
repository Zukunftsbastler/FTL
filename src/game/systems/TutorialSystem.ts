import { GameStateData }  from '../../engine/GameState';
import { UIRenderer }     from '../../engine/ui/UIRenderer';
import type { IInput }    from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';

/** Visual severity of a tutorial message. Controls the panel border style. */
export type TutorialType = 'INFO' | 'WARNING' | 'CRITICAL';

interface PendingModal {
  id:       string;
  text:     string;
  type:     TutorialType;
  anchorId: string | null;
}

/**
 * The Tutorial Director — all methods are static so any system can call
 * `TutorialSystem.showTutorial(...)` without needing an injected instance.
 *
 * Call `TutorialSystem.draw(renderer, input)` every frame at the end of
 * the render pass (before `input.update()`) so the overlay stays on top.
 */
export class TutorialSystem {
  private static modal: PendingModal | null = null;
  /** Modals queued to display after the current one is dismissed. */
  private static readonly pendingQueue: PendingModal[] = [];

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Show a tutorial modal immediately if nothing is active.  Silently ignored if:
   *   - `tutorialEnabled` is false, OR
   *   - `id` is already in `seenTutorials`, OR
   *   - another modal is already active.
   *
   * @param anchorId  Optional key into `GameStateData.uiAnchors` to spotlight.
   */
  static showTutorial(
    id:        string,
    text:      string,
    type:      TutorialType,
    anchorId?: string,
  ): void {
    if (!GameStateData.tutorialEnabled)       return;
    if (GameStateData.seenTutorials.has(id))  return;
    if (GameStateData.tutorialActive)         return;

    GameStateData.seenTutorials.add(id);
    GameStateData.tutorialActive = true;
    TutorialSystem.modal = { id, text, type, anchorId: anchorId ?? null };
  }

  /**
   * Enqueue a tutorial in the pending-display queue.
   *
   * Unlike `showTutorial`, this method will not silently drop the modal if
   * another is currently active — instead the modal is appended to the queue
   * so the sequence is preserved.  Duplicate IDs and already-seen IDs are
   * still filtered.
   *
   * If no modal is currently active the item is shown immediately.
   */
  static enqueueTutorial(
    id:        string,
    text:      string,
    type:      TutorialType,
    anchorId?: string,
  ): void {
    if (!GameStateData.tutorialEnabled)      return;
    if (GameStateData.seenTutorials.has(id)) return;
    // Prevent duplicate queue entries.
    if (TutorialSystem.pendingQueue.some((m) => m.id === id)) return;
    // Also skip if it is somehow already the active modal.
    if (TutorialSystem.modal?.id === id) return;

    const item: PendingModal = { id, text, type, anchorId: anchorId ?? null };

    if (!GameStateData.tutorialActive) {
      GameStateData.seenTutorials.add(id);
      GameStateData.tutorialActive = true;
      TutorialSystem.modal = item;
    } else {
      TutorialSystem.pendingQueue.push(item);
    }
  }

  /** Advance to the next queued modal (called internally on dismiss). */
  private static showNextFromQueue(): void {
    while (TutorialSystem.pendingQueue.length > 0) {
      const next = TutorialSystem.pendingQueue.shift()!;
      if (GameStateData.seenTutorials.has(next.id)) continue;
      GameStateData.seenTutorials.add(next.id);
      GameStateData.tutorialActive = true;
      TutorialSystem.modal = next;
      return;
    }
  }

  /**
   * Draw the tutorial overlay if active.  Must be called every frame
   * AFTER all game-state rendering and BEFORE `input.update()`.
   */
  static draw(renderer: IRenderer, input: IInput): void {
    if (!GameStateData.tutorialActive || TutorialSystem.modal === null) return;

    const { width, height } = renderer.getCanvasSize();
    const ctx               = renderer.getContext();
    const modal             = TutorialSystem.modal;

    // Resolve the anchor bounding box (may be null if not registered yet).
    const anchor = modal.anchorId !== null
      ? (GameStateData.uiAnchors[modal.anchorId] ?? null)
      : null;

    // ── Darkening overlay with optional spotlight hole ─────────────────────
    const OV = 'rgba(0,0,0,0.72)';
    if (anchor !== null) {
      const PAD = 12;
      const ax = anchor.x - PAD, ay = anchor.y - PAD;
      const aw = anchor.w + PAD * 2, ah = anchor.h + PAD * 2;
      // Four rects surrounding the spotlight hole.
      renderer.drawRect(0, 0, width, ay, OV, true);
      renderer.drawRect(0, ay + ah, width, Math.max(0, height - ay - ah), OV, true);
      renderer.drawRect(0, ay, ax, ah, OV, true);
      renderer.drawRect(ax + aw, ay, Math.max(0, width - ax - aw), ah, OV, true);
      // Glowing yellow highlight border.
      ctx.save();
      ctx.strokeStyle  = '#ffdd00';
      ctx.lineWidth    = 3;
      ctx.shadowColor  = '#ffdd00';
      ctx.shadowBlur   = 14;
      ctx.strokeRect(ax, ay, aw, ah);
      ctx.restore();
    } else {
      renderer.drawRect(0, 0, width, height, OV, true);
    }

    // ── Modal dimensions ───────────────────────────────────────────────────
    const MW = Math.min(620, width - 40);
    const MH = 300;
    const MX = Math.round((width  - MW) / 2);
    const MY = Math.round((height - MH) / 2);

    // ── Arrow line from modal to anchor ────────────────────────────────────
    if (anchor !== null) {
      const anchorCX = anchor.x + anchor.w / 2;
      const anchorCY = anchor.y + anchor.h / 2;
      const modalCX  = MX + MW / 2;
      const modalCY  = MY + MH / 2;

      ctx.save();
      ctx.setLineDash([8, 5]);
      ctx.strokeStyle = 'rgba(255,221,0,0.55)';
      ctx.lineWidth   = 2;
      ctx.beginPath();
      ctx.moveTo(modalCX, modalCY);
      ctx.lineTo(anchorCX, anchorCY);
      ctx.stroke();

      // Arrowhead at the anchor end.
      const angle = Math.atan2(anchorCY - modalCY, anchorCX - modalCX);
      const AL = 10; const AA = Math.PI / 6;
      ctx.setLineDash([]);
      ctx.strokeStyle = '#ffdd00';
      ctx.beginPath();
      ctx.moveTo(anchorCX, anchorCY);
      ctx.lineTo(anchorCX - AL * Math.cos(angle - AA), anchorCY - AL * Math.sin(angle - AA));
      ctx.moveTo(anchorCX, anchorCY);
      ctx.lineTo(anchorCX - AL * Math.cos(angle + AA), anchorCY - AL * Math.sin(angle + AA));
      ctx.stroke();
      ctx.restore();
    }

    // ── Panel styled by type ───────────────────────────────────────────────
    if (modal.type === 'CRITICAL') {
      UIRenderer.drawHazardPanel(ctx, MX, MY, MW, MH);
    } else {
      const borderColor = modal.type === 'WARNING' ? '#ff4444' : '#00ccdd';
      UIRenderer.drawSciFiPanel(ctx, MX, MY, MW, MH, {
        chamfer: 16, borderColor, alpha: 0.97,
      });
    }

    // ── Type badge ─────────────────────────────────────────────────────────
    const typeColor = modal.type === 'CRITICAL' ? '#ffdd00'
                    : modal.type === 'WARNING'  ? '#ff4444'
                    :                             '#00ccdd';
    renderer.drawText(modal.type, width / 2, MY + 28,
      'bold 14px monospace', typeColor, 'center');
    renderer.drawLine(MX + 16, MY + 38, MX + MW - 16, MY + 38, typeColor + '55', 1);

    // ── Tutorial text (word-wrapped) ───────────────────────────────────────
    renderer.drawTextWrapped(
      modal.text,
      MX + 22, MY + 58,
      MW - 44, 22,
      '13px monospace', '#eeeeee',
    );

    // ── "UNDERSTOOD" dismiss button ────────────────────────────────────────
    const BW = 210; const BH = 44;
    const BX = Math.round(width  / 2 - BW / 2);
    const BY = MY + MH - BH - 16;

    const mouse   = input.getMousePosition();
    const hovered =
      mouse.x >= BX && mouse.x <= BX + BW &&
      mouse.y >= BY && mouse.y <= BY + BH;

    UIRenderer.drawBeveledButton(ctx, BX, BY, BW, BH, 'UNDERSTOOD', hovered);

    if (input.isMouseJustPressed(0) && hovered) {
      GameStateData.tutorialActive = false;
      TutorialSystem.modal = null;
      TutorialSystem.showNextFromQueue();
    }
  }
}
