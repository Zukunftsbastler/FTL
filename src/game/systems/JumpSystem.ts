import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { ShipComponent } from '../components/ShipComponent';
import type { SystemComponent } from '../components/SystemComponent';

// ── FTL button layout (top-right corner) ─────────────────────────────────────
export const FTL_BTN_W     = 160;
export const FTL_BTN_H     = 40;
export const FTL_BTN_TOP   = 10;   // distance from top of canvas
export const FTL_BTN_RIGHT = 10;   // distance from right of canvas

/**
 * Authentic FTL charge times (seconds) indexed by engine power level.
 * Index 0 = no engine power → no charging.
 * Based on original FTL: 1 power = 68 s … 8 power = 23 s.
 */
const FTL_CHARGE_TIMES: readonly number[] = [0, 68, 53, 44, 37, 32, 28, 25, 23];

/** Charge rate multiplier applied when the ENGINES room is manned (+10%). */
const FTL_ENGINES_MANNING_BONUS = 1.1;

/**
 * Handles FTL drive charging and the in-combat escape button.
 *
 * Charging rules (mirroring original FTL):
 *   1. Only charges if a crew member is in the PILOTING room, OR if the
 *      PILOTING system level ≥ 2 (autopilot).
 *   2. Charge time is determined by ENGINES power (see FTL_CHARGE_TIMES table).
 *   3. +10% charge rate bonus if the ENGINES room is manned.
 *
 * The JUMP button:
 *   - Always visible during combat.
 *   - Yellow progress bar shows current charge.
 *   - Becomes clickable only when ftlCharge >= 1.0.
 *   - Clicking escapes combat WITHOUT destroying the enemy ship.
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

    const ftlCharge = this.chargeFtlDrive(world, dt);

    this.drawButton(ftlCharge);

    // Only clickable when fully charged.
    if (ftlCharge >= 1.0 && this.input.isMouseJustPressed(0)) {
      const { width } = this.renderer.getCanvasSize();
      const bx = width - FTL_BTN_RIGHT - FTL_BTN_W;
      const by = FTL_BTN_TOP;
      const mouse = this.input.getMousePosition();
      if (
        mouse.x >= bx && mouse.x <= bx + FTL_BTN_W &&
        mouse.y >= by && mouse.y <= by + FTL_BTN_H
      ) {
        // Escape mid-combat — do NOT destroy the enemy ship.
        this.onJump();
      }
    }
  }

  // ── FTL charging ─────────────────────────────────────────────────────────

  /**
   * Advances the player ship's ftlCharge using the authentic FTL charge table.
   * Returns the updated charge (0.0–1.0).
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

    // Gather system data and room bounds for ENGINES and PILOTING.
    let enginePower   = 0;
    let pilotingLevel = 0;
    let engineBounds:  { x: number; y: number; w: number; h: number } | null = null;
    let pilotingBounds: { x: number; y: number; w: number; h: number } | null = null;

    for (const entity of world.query(['System', 'Position', 'Room', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerShipEntity) continue;
      const sys  = world.getComponent<SystemComponent>(entity, 'System');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (sys === undefined || pos === undefined || room === undefined) continue;

      if (sys.type === 'ENGINES') {
        enginePower  = sys.currentPower;
        engineBounds = { x: pos.x, y: pos.y, w: room.width * TILE_SIZE, h: room.height * TILE_SIZE };
      }
      if (sys.type === 'PILOTING') {
        pilotingLevel  = sys.level;
        pilotingBounds = { x: pos.x, y: pos.y, w: room.width * TILE_SIZE, h: room.height * TILE_SIZE };
      }
    }

    // Piloting check: crew in PILOTING room OR autopilot (system level >= 2).
    const pilotManned = pilotingBounds !== null &&
      this.isRoomManned(world, playerShipEntity, pilotingBounds);
    if (!pilotManned && pilotingLevel < 2) {
      return playerShip.ftlCharge; // Can't charge without pilot or autopilot.
    }

    // Engine power check: 0 power → no charging.
    const power = Math.max(0, Math.min(8, enginePower));
    if (power === 0) return playerShip.ftlCharge;

    const chargeTime = FTL_CHARGE_TIMES[power];
    let chargeRate = 1.0 / chargeTime;

    // +10% charge rate bonus if ENGINES room is manned.
    if (engineBounds !== null && this.isRoomManned(world, playerShipEntity, engineBounds)) {
      chargeRate *= FTL_ENGINES_MANNING_BONUS;
    }

    playerShip.ftlCharge = Math.min(1.0, playerShip.ftlCharge + chargeRate * dt);
    return playerShip.ftlCharge;
  }

  /** Returns true if at least one crew member of the given ship is inside `bounds`. */
  private isRoomManned(
    world: IWorld,
    shipEntity: number,
    bounds: { x: number; y: number; w: number; h: number },
  ): boolean {
    for (const entity of world.query(['Crew', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) continue;
      if (
        pos.x >= bounds.x && pos.x < bounds.x + bounds.w &&
        pos.y >= bounds.y && pos.y < bounds.y + bounds.h
      ) {
        return true;
      }
    }
    return false;
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  private drawButton(ftlCharge: number): void {
    const { width } = this.renderer.getCanvasSize();
    const bx = width - FTL_BTN_RIGHT - FTL_BTN_W;
    const by = FTL_BTN_TOP;

    const isReady     = ftlCharge >= 1.0;
    const bgColor     = isReady ? '#2a2200' : '#161616';
    const borderColor = isReady ? '#eecc00' : '#444444';
    const textColor   = isReady ? '#ffee44' : '#555555';
    const label       = isReady ? 'FTL ESCAPE' : 'FTL CHARGING';

    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, bgColor,     true);
    this.renderer.drawRect(bx, by, FTL_BTN_W, FTL_BTN_H, borderColor, false);
    this.renderer.drawText(label, bx + FTL_BTN_W / 2, by + FTL_BTN_H / 2 + 5,
      '13px monospace', textColor, 'center');

    // Yellow FTL charge bar below the button.
    const barY = by + FTL_BTN_H + 3;
    const barH = 6;
    this.renderer.drawRect(bx, barY, FTL_BTN_W,                             barH, '#1a1600', true);
    this.renderer.drawRect(bx, barY, Math.round(FTL_BTN_W * ftlCharge),     barH,
      isReady ? '#ffee00' : '#aa8800', true);
    this.renderer.drawRect(bx, barY, FTL_BTN_W,                             barH, '#554400', false);
  }
}
