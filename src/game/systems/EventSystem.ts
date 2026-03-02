import { AssetLoader } from '../../utils/AssetLoader';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { EventChoice, EventReward, EventTemplate } from '../data/EventTemplate';

// ── Layout constants ──────────────────────────────────────────────────────────
const MODAL_W       = 660;
const MODAL_PAD     = 30;
const MODAL_BG      = 'rgba(4,10,20,0.97)';
const MODAL_BORDER  = '#44aaff';

const TITLE_FONT    = '18px monospace';
const TITLE_COLOR   = '#88ddff';
const TEXT_FONT     = '13px monospace';
const TEXT_COLOR    = '#aabbcc';
const TEXT_LINE_H   = 20;
const TEXT_MAX_W    = MODAL_W - MODAL_PAD * 2;

const HAZARD_COLOR: Record<string, string> = {
  SOLAR_FLARE: '#ffaa22',
  ASTEROIDS:   '#aaaaaa',
  ION_STORM:   '#aa44ff',
};

const CHOICE_H      = 44;
const CHOICE_GAP    = 10;
const CHOICE_BG     = '#0d1520';
const CHOICE_BORDER = '#3355aa';
const CHOICE_TEXT   = '#cce0ff';
const CHOICE_HOVER_BORDER = '#66aaff';
const CHOICE_FONT   = '13px monospace';

const DIVIDER_COLOR = '#1c2e44';

interface Hitbox { x: number; y: number; w: number; h: number; action: () => void }

/**
 * Handles the EVENT game state.
 *
 * Call `loadEvent(id)` or `loadRandomEvent()` before entering the EVENT state.
 * Then each frame, call `drawEventScreen(renderer, input, callbacks)`.
 *
 * Callbacks:
 *   onCombat(shipId)   — triggers combat; caller calls enterCombat(shipId)
 *   onReward(reward)   — caller applies reward to player ship and returns to STAR_MAP
 *   onNextEvent(id)    — chains to a new event; caller calls loadEvent(id)
 *   onContinue()       — returns to STAR_MAP
 */
export class EventSystem {
  private currentEvent: EventTemplate | null = null;

  /** Loads an event by ID. Returns false if the ID isn't found. */
  loadEvent(eventId: string): boolean {
    const events = AssetLoader.getJSON<EventTemplate[]>('events');
    const found  = events?.find((e) => e.id === eventId);
    if (found !== undefined) {
      this.currentEvent = found;
      return true;
    }
    console.warn(`EventSystem.loadEvent: event '${eventId}' not found.`);
    return false;
  }

  /** Picks a random event from the loaded pool. */
  loadRandomEvent(): boolean {
    const events = AssetLoader.getJSON<EventTemplate[]>('events');
    if (events === undefined || events.length === 0) return false;
    this.currentEvent = events[Math.floor(Math.random() * events.length)];
    return true;
  }

  /** Returns the event currently staged for display. */
  getCurrentEvent(): EventTemplate | null {
    return this.currentEvent;
  }

  // ── Drawing ───────────────────────────────────────────────────────────────

  drawEventScreen(
    renderer: IRenderer,
    input: IInput,
    callbacks: {
      onCombat:    (shipId: string) => void;
      onReward:    (reward: EventReward) => void;
      onNextEvent: (eventId: string) => void;
      onContinue:  () => void;
    },
  ): void {
    const event = this.currentEvent;
    if (event === null) { callbacks.onContinue(); return; }

    const { width, height } = renderer.getCanvasSize();
    const hitboxes: Hitbox[] = [];

    // ── Compute modal height ────────────────────────────────────────────────
    // We need modal height before drawing so we can centre it. Estimate:
    // header (title + hazard + divider) = 72px
    // text block = estimated lines * TEXT_LINE_H (use ~60 chars/line as rough estimate)
    const estimatedCharsPerLine = Math.floor(TEXT_MAX_W / 7.5);  // ~7.5px per char at 13px mono
    const words         = event.text.split(' ');
    let   lineCount     = 1;
    let   charCount     = 0;
    for (const word of words) {
      charCount += word.length + 1;
      if (charCount > estimatedCharsPerLine) { lineCount++; charCount = word.length + 1; }
    }
    const textBlockH   = lineCount * TEXT_LINE_H + 10;
    const choicesBlockH = event.choices.length * (CHOICE_H + CHOICE_GAP) + CHOICE_GAP;
    const MODAL_H      = Math.max(280, 72 + textBlockH + 24 + choicesBlockH + 24);

    const mx = Math.round((width  - MODAL_W) / 2);
    const my = Math.round((height - MODAL_H) / 2);

    // ── Modal background ────────────────────────────────────────────────────
    renderer.drawRect(mx, my, MODAL_W, MODAL_H, MODAL_BG, true);
    renderer.drawRect(mx, my, MODAL_W, MODAL_H, MODAL_BORDER, false);

    // ── Title / hazard ────────────────────────────────────────────────────
    let oy = my + MODAL_PAD;

    if (event.hazard !== undefined) {
      const hColor = HAZARD_COLOR[event.hazard] ?? '#ffffff';
      renderer.drawText(
        `⚠ ${event.hazard.replace('_', ' ')}`,
        mx + MODAL_W / 2, oy + 14, '12px monospace', hColor, 'center',
      );
      oy += 24;
    }

    renderer.drawText('EVENT', mx + MODAL_W / 2, oy + 14, TITLE_FONT, TITLE_COLOR, 'center');
    oy += 28;

    renderer.drawLine(mx + 16, oy, mx + MODAL_W - 16, oy, DIVIDER_COLOR, 1);
    oy += 16;

    // ── Narrative text (word-wrapped) ────────────────────────────────────────
    const textX = mx + MODAL_PAD;
    oy = renderer.drawTextWrapped(
      event.text,
      textX, oy,
      TEXT_MAX_W, TEXT_LINE_H,
      TEXT_FONT, TEXT_COLOR,
      'left',
    );
    oy += 16;

    renderer.drawLine(mx + 16, oy, mx + MODAL_W - 16, oy, DIVIDER_COLOR, 1);
    oy += CHOICE_GAP;

    // ── Choices ────────────────────────────────────────────────────────────
    const mouse = input.getMousePosition();
    for (const choice of event.choices) {
      const bx = mx + MODAL_PAD;
      const by = oy;
      const bw = MODAL_W - MODAL_PAD * 2;
      const bh = CHOICE_H;

      const isHovered = (
        mouse.x >= bx && mouse.x <= bx + bw &&
        mouse.y >= by && mouse.y <= by + bh
      );

      renderer.drawRect(bx, by, bw, bh, CHOICE_BG, true);
      renderer.drawRect(bx, by, bw, bh, isHovered ? CHOICE_HOVER_BORDER : CHOICE_BORDER, false);
      renderer.drawText(
        choice.text,
        bx + 16, by + bh / 2 + 5,
        CHOICE_FONT, CHOICE_TEXT, 'left',
      );

      // Show reward preview if applicable.
      const rewardPreview = this.buildRewardPreview(choice);
      if (rewardPreview !== '') {
        renderer.drawText(
          rewardPreview,
          bx + bw - 12, by + bh / 2 + 5,
          '11px monospace', '#888877', 'right',
        );
      }

      const capturedChoice = choice;
      hit(hitboxes, bx, by, bw, bh, () => this.resolveChoice(capturedChoice, callbacks));

      oy += bh + CHOICE_GAP;
    }

    // ── Process clicks ────────────────────────────────────────────────────
    if (input.isMouseJustPressed(0)) {
      for (const hb of hitboxes) {
        if (mouse.x >= hb.x && mouse.x <= hb.x + hb.w &&
            mouse.y >= hb.y && mouse.y <= hb.y + hb.h) {
          hb.action();
          break;
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private resolveChoice(
    choice: EventChoice,
    callbacks: {
      onCombat:    (shipId: string) => void;
      onReward:    (reward: EventReward) => void;
      onNextEvent: (eventId: string) => void;
      onContinue:  () => void;
    },
  ): void {
    if (choice.triggerCombatWithShipId !== undefined) {
      callbacks.onCombat(choice.triggerCombatWithShipId);
    } else if (choice.reward !== undefined) {
      callbacks.onReward(choice.reward);
    } else if (choice.nextEventId !== undefined) {
      callbacks.onNextEvent(choice.nextEventId);
    } else {
      callbacks.onContinue();
    }
  }

  /** Builds a short inline text summarising a choice's reward for display. */
  private buildRewardPreview(choice: EventChoice): string {
    if (choice.triggerCombatWithShipId !== undefined) return '[COMBAT]';
    if (choice.nextEventId !== undefined)              return '[→ event]';
    if (choice.reward === undefined) return '';
    const r = choice.reward;
    const parts: string[] = [];
    if (r.scrap      !== undefined) parts.push(`+${r.scrap} scrap`);
    if (r.fuel       !== undefined) parts.push(`+${r.fuel} fuel`);
    if (r.missiles   !== undefined) parts.push(`+${r.missiles} missiles`);
    if (r.hullRepair !== undefined) parts.push(`+${r.hullRepair} hull`);
    if (r.weaponId   !== undefined) parts.push('weapon');
    if (r.crewMember === true)      parts.push('crew');
    return parts.join(', ');
  }
}

function hit(hitboxes: Hitbox[], x: number, y: number, w: number, h: number, action: () => void): void {
  hitboxes.push({ x, y, w, h, action });
}
