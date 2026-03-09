import { Time } from '../../engine/Time';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

// ── FTL button layout (top-right corner) ─────────────────────────────────────
export const FTL_BTN_W     = 160;
export const FTL_BTN_H     = 40;
export const FTL_BTN_TOP   = 10;   // distance from top of canvas
export const FTL_BTN_RIGHT = 10;   // distance from right of canvas

/** Base FTL charge rate (fraction per second) with no engines. */
const FTL_BASE_RATE     = 0.04;
/** Additional charge rate per engine power point. */
const FTL_ENGINE_FACTOR = 0.15;
/** Multiplier when PILOTING system is unpowered/destroyed. */
const FTL_NO_PILOT_MULT = 0.5;

/**
 * Handles FTL drive charging and the in-combat jump button.
 *
 * The FTL drive charges over time during combat:
 *   - Base rate: 4%/s (fully charged in ~25 s with no engines)
 *   - +15% per engine power point
 *   - ×0.5 multiplier if PILOTING system is unpowered or destroyed
 *
 * The JUMP button becomes active when:
 *   - ftlCharge >= 1.0 (escape mid-combat), OR
 *   - the enemy ship hull is 0 (standard post-victory jump)
 */
export class JumpSystem {
  private readonly input:    IInput;
  private readonly renderer: IRenderer;
  private readonly onJump:   () => void;

  constructor(input: IInput, renderer: IRenderer, onJump: () => void) {
    this.input    = input;
    this.renderer = renderer;
    this.onJump   = onJump;
  }

  update(world: IWorld): void {
    const dt = Time.deltaTime;

    // Charge the player FTL drive and retrieve current charge level.
    const ftlCharge = this.chargeFtlDrive(world, dt);

    const enemyDead = !this.isEnemyAlive(world);
    const ftlReady  = ftlCharge >= 1.0;
    const available = enemyDead || ftlReady;

    this.drawButton(available, ftlCharge, enemyDead);

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

  // ── FTL charging ─────────────────────────────────────────────────────────

  /**
   * Advances the player ship's ftlCharge based on ENGINES power and PILOTING state.
   * Returns the updated charge value (0.0–1.0).
   */
  private chargeFtlDrive(world: IWorld, dt: number): number {
    let playerShipEntity: number | null = null;
    let playerShip: ShipComponent | undefined;

    for (const entity of world.query(['Ship', 'Faction'])) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === 'PLAYER') {
        playerShipEntity = entity;
        playerShip       = world.getComponent<ShipComponent>(entity, 'Ship');
        break;
      }
    }
    if (playerShip === undefined || playerShipEntity === null) return 0;

    // Read ENGINES power and PILOTING status for this ship.
    let enginePower   = 0;
    let pilotingPower = 0;
    for (const entity of world.query(['System', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys === undefined) continue;
      if (sys.type === 'ENGINES')  enginePower   = sys.currentPower;
      if (sys.type === 'PILOTING') pilotingPower = sys.currentPower;
    }

    const pilotMult  = pilotingPower > 0 ? 1.0 : FTL_NO_PILOT_MULT;
    const chargeRate = FTL_BASE_RATE * (1 + enginePower * FTL_ENGINE_FACTOR) * pilotMult;

    playerShip.ftlCharge = Math.min(1.0, playerShip.ftlCharge + chargeRate * dt);
    return playerShip.ftlCharge;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private drawButton(available: boolean, ftlCharge: number, enemyDead: boolean): void {
    const { width } = this.renderer.getCanvasSize();
    const bx = width - FTL_BTN_RIGHT - FTL_BTN_W;
    const by = FTL_BTN_TOP;

    const bgColor     = available ? '#0a2a0a' : '#161616';
    const borderColor = available ? '#44cc44' : '#333333';
    const textColor   = available ? '#44ff44' : '#444444';
    const label       = enemyDead ? 'FTL JUMP' : (ftlCharge >= 1.0 ? 'FTL ESCAPE' : 'FTL JUMP');

    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, bgColor,     true);
    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, borderColor, false);
    this.renderer.drawText(label, bx + FTL_BTN_W / 2, by + FTL_BTN_H / 2 + 5, '14px monospace', textColor, 'center');

    // FTL charge bar below the button.
    const barY = by + FTL_BTN_H + 4;
    const barH = 5;
    this.renderer.drawRect(bx, barY, FTL_BTN_W,                             barH, '#111111',  true);
    this.renderer.drawRect(bx, barY, Math.round(FTL_BTN_W * ftlCharge),     barH,
      ftlCharge >= 1.0 ? '#44ff44' : '#3366bb', true);
    this.renderer.drawRect(bx, barY, FTL_BTN_W,                             barH, '#333333', false);
    this.renderer.drawText('FTL', bx + FTL_BTN_W - 3, barY + barH - 1, '8px monospace', '#556677', 'right');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

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
