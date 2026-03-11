import { GameStateData }  from '../../engine/GameState';
import { UIRenderer }     from '../../engine/ui/UIRenderer';
import type { IInput }    from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';

/** Visual severity of a tutorial message. Controls the panel border style. */
export type TutorialType = 'INFO' | 'WARNING' | 'CRITICAL';

interface PendingModal {
  id:   string;
  text: string;
  type: TutorialType;
}

/**
 * The Tutorial Director.
 *
 * Call `showTutorial(id, text, type)` from anywhere in the game loop.
 * If the tutorial is enabled and this id has not been seen yet, the Director:
 *   1. Records the id in `GameStateData.seenTutorials` (won't show again this session).
 *   2. Sets `GameStateData.tutorialActive = true` — the game loop produces dt = 0.
 *   3. Renders a centred, type-styled modal with an "UNDERSTOOD" dismiss button.
 *
 * Call `draw(renderer, input)` every frame at the TOP of the render pass
 * (before `input.update()`) so the overlay always appears on top.
 */
export class TutorialSystem {
  private modal: PendingModal | null = null;

  // ── Public API ─────────────────────────────────────────────────────────────

  /**
   * Queue a tutorial modal.  Silently ignored if:
   *   - `GameStateData.tutorialEnabled` is false, OR
   *   - `id` is already in `GameStateData.seenTutorials`.
   */
  showTutorial(id: string, text: string, type: TutorialType): void {
    if (!GameStateData.tutorialEnabled)       return;
    if (GameStateData.seenTutorials.has(id))  return;
    if (GameStateData.tutorialActive)         return; // another modal already showing

    GameStateData.seenTutorials.add(id);
    GameStateData.tutorialActive = true;
    this.modal = { id, text, type };
  }

  /**
   * Draw the tutorial overlay if active.
   * Returns immediately when no modal is queued.
   * Must be called each frame AFTER all game-state rendering.
   */
  draw(renderer: IRenderer, input: IInput): void {
    if (!GameStateData.tutorialActive || this.modal === null) return;

    const { width, height } = renderer.getCanvasSize();
    const ctx               = renderer.getContext();
    const modal             = this.modal;

    // ── Full-screen dimming overlay ────────────────────────────────────────
    renderer.drawRect(0, 0, width, height, 'rgba(0,0,0,0.72)', true);

    // ── Modal dimensions ───────────────────────────────────────────────────
    const MW = Math.min(620, width - 40);
    const MH = 300;
    const MX = Math.round((width  - MW) / 2);
    const MY = Math.round((height - MH) / 2);

    // ── Panel background styled by type ────────────────────────────────────
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
      this.modal = null;
    }
  }
}
