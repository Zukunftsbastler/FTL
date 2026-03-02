import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';

// ── FTL button layout (top-right corner) ─────────────────────────────────────
export const FTL_BTN_W     = 160;
export const FTL_BTN_H     = 40;
export const FTL_BTN_TOP   = 10;   // distance from top of canvas
export const FTL_BTN_RIGHT = 10;   // distance from right of canvas

/**
 * Renders the "FTL JUMP" button in the top-right corner of the combat screen.
 *
 * The button is always visible but only active (green) when the enemy ship's hull
 * has reached 0.  Clicking the active button:
 *   1. Destroys all enemy ECS entities (ship root + all owned children).
 *   2. Fires the `onJump` callback, which transitions the state machine to STAR_MAP.
 */
export class JumpSystem {
  private readonly input: IInput;
  private readonly renderer: IRenderer;
  private readonly onJump: () => void;

  constructor(input: IInput, renderer: IRenderer, onJump: () => void) {
    this.input    = input;
    this.renderer = renderer;
    this.onJump   = onJump;
  }

  update(world: IWorld): void {
    const available = !this.isEnemyAlive(world);
    this.drawButton(available);

    if (available && this.input.isMouseJustPressed(0)) {
      const { width } = this.renderer.getCanvasSize();
      const bx = width - FTL_BTN_RIGHT - FTL_BTN_W;
      const by = FTL_BTN_TOP;
      const mouse = this.input.getMousePosition();
      if (
        mouse.x >= bx && mouse.x <= bx + FTL_BTN_W &&
        mouse.y >= by && mouse.y <= by + FTL_BTN_H
      ) {
        this.destroyEnemyShip(world);
        this.onJump();
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private drawButton(available: boolean): void {
    const { width } = this.renderer.getCanvasSize();
    const bx = width - FTL_BTN_RIGHT - FTL_BTN_W;
    const by = FTL_BTN_TOP;

    const bgColor     = available ? '#0a2a0a' : '#161616';
    const borderColor = available ? '#44cc44' : '#333333';
    const textColor   = available ? '#44ff44' : '#444444';

    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, bgColor, true);
    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, borderColor, false);
    this.renderer.drawText(
      'FTL JUMP',
      bx + FTL_BTN_W / 2,
      by + FTL_BTN_H / 2 + 5,
      '14px monospace',
      textColor,
      'center',
    );
  }

  /** Returns true if the enemy ship entity exists and still has hull > 0. */
  private isEnemyAlive(world: IWorld): boolean {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id !== 'ENEMY') continue;
      const ship = world.getComponent<ShipComponent>(entity, 'Ship');
      return ship !== undefined && ship.currentHull > 0;
    }
    return false;
  }

  /**
   * Destroys all entities owned by the enemy ship (rooms, doors, weapons),
   * then destroys the ship root entity itself.
   */
  private destroyEnemyShip(world: IWorld): void {
    const shipEntities = world.query(['Ship', 'Faction']);
    let enemyShipEntity: number | null = null;
    for (const entity of shipEntities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'ENEMY') {
        enemyShipEntity = entity;
        break;
      }
    }
    if (enemyShipEntity === null) return;

    // Destroy child entities (query returns a snapshot, safe to destroy during iteration).
    const ownerEntities = world.query(['Owner']);
    for (const entity of ownerEntities) {
      const owner = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (owner?.shipEntity === enemyShipEntity) {
        world.destroyEntity(entity);
      }
    }

    world.destroyEntity(enemyShipEntity);
  }
}
