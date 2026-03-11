import { TILE_SIZE }      from '../constants';
import { TutorialSystem } from './TutorialSystem';
import type { Entity } from '../../engine/Entity';
import type { IInput } from '../../engine/IInput';
import type { IRenderer } from '../../engine/IRenderer';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { WeaponComponent } from '../components/WeaponComponent';

// ── Weapon UI layout constants ────────────────────────────────────────────────
// Must match the values used in RenderSystem.drawWeaponUI().
export const WEAPON_BOX_W      = 130;
export const WEAPON_BOX_H      = 65;
export const WEAPON_BOX_MARGIN = 8;
export const WEAPON_BOX_BOTTOM = 10; // distance from bottom of canvas

/**
 * Manages the two-step weapon targeting interaction:
 *   Step 1. Left-click a weapon box at the bottom of the screen → enter targeting mode.
 *   Step 2. Left-click an enemy room → set weapon.targetRoomEntity; exit targeting mode.
 *           Left-click anywhere else (or right-click) → cancel targeting.
 *
 * The "selected weapon entity" state is kept here (not in a component) because it is
 * purely UI state that does not need to participate in ECS queries.
 */
export class TargetingSystem {
  private readonly input: IInput;
  private readonly renderer: IRenderer;

  /** The weapon entity currently awaiting a target click, or null if idle. */
  private selectedWeaponEntity: Entity | null = null;

  constructor(input: IInput, renderer: IRenderer) {
    this.input    = input;
    this.renderer = renderer;
  }

  /** Exposed so RenderSystem can highlight the selected weapon box. */
  getSelectedWeaponEntity(): Entity | null {
    return this.selectedWeaponEntity;
  }

  update(world: IWorld): void {
    const leftClick  = this.input.isMouseJustPressed(0);
    const rightClick = this.input.isMouseJustPressed(2);
    const mouse      = this.input.getMousePosition();

    const { height } = this.renderer.getCanvasSize();
    const boxBaseY = height - WEAPON_BOX_H - WEAPON_BOX_BOTTOM;
    const playerWeapons = this.getPlayerWeapons(world);

    // ── Cursor (runs every frame before any click guard) ─────────────────────
    this.updateCursor(world, playerWeapons, boxBaseY, mouse);

    // ── Right-click on weapon box: power it OFF ───────────────────────────────
    if (rightClick) {
      for (let i = 0; i < playerWeapons.length; i++) {
        const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
        if (
          mouse.x >= bx && mouse.x <= bx + WEAPON_BOX_W &&
          mouse.y >= boxBaseY && mouse.y <= boxBaseY + WEAPON_BOX_H
        ) {
          const [entity, weapon] = playerWeapons[i];
          // Right-click always powers OFF and cancels targeting for this weapon.
          weapon.userPowered = false;
          if (this.selectedWeaponEntity === entity) {
            this.selectedWeaponEntity = null;
          }
          return;
        }
      }
      // Right-click elsewhere: cancel active targeting mode.
      this.selectedWeaponEntity = null;
      return;
    }

    if (!leftClick) return;

    // ── Left-click on a weapon UI box ─────────────────────────────────────────
    for (let i = 0; i < playerWeapons.length; i++) {
      const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      if (
        mouse.x >= bx && mouse.x <= bx + WEAPON_BOX_W &&
        mouse.y >= boxBaseY && mouse.y <= boxBaseY + WEAPON_BOX_H
      ) {
        const [entity, weapon] = playerWeapons[i];

        if (!weapon.userPowered) {
          // Unpowered: attempt to power ON by drawing from the WEAPONS pool.
          const pool = this.getWeaponSystemPower(world);
          const usedByOthers = playerWeapons.reduce(
            (sum, [, w]) => sum + (w.userPowered ? w.powerRequired : 0), 0,
          );
          if (weapon.powerRequired <= pool - usedByOthers) {
            weapon.userPowered = true;
            TutorialSystem.showTutorial('tut_weapons',
              'INFO: Click the weapon again to select a target room immediately — no need to wait. The weapon will charge and fire automatically once it is ready!',
              'INFO');
          }
          // Do not enter targeting mode on the power-on click.
        } else {
          // Already powered: Left-click enters / toggles targeting mode.
          this.selectedWeaponEntity = this.selectedWeaponEntity === entity ? null : entity;
        }
        return;
      }
    }

    // ── Step 2: when in targeting mode, click an enemy room ──────────────────
    if (this.selectedWeaponEntity !== null) {
      const targetEntity = this.getEnemyRoomAtMouse(world, mouse.x, mouse.y);
      if (targetEntity !== null) {
        const weapon = world.getComponent<WeaponComponent>(this.selectedWeaponEntity, 'Weapon');
        if (weapon !== undefined) {
          weapon.targetRoomEntity = targetEntity;
          TutorialSystem.showTutorial('tut_sensors',
            'INFO: Room targeted. Upgrading your Sensors system reveals enemy crew positions so you can target occupied rooms for maximum crew damage.',
            'INFO');
        }
      }
      // Regardless of hit or miss, exit targeting mode after the click.
      this.selectedWeaponEntity = null;
    }
  }

  // ── Cursor management ─────────────────────────────────────────────────────

  private updateCursor(
    world: IWorld,
    playerWeapons: Array<[Entity, WeaponComponent]>,
    boxBaseY: number,
    mouse: { x: number; y: number },
  ): void {
    // In targeting mode the entire canvas becomes a crosshair.
    if (this.selectedWeaponEntity !== null) {
      this.input.setCursor('crosshair');
      return;
    }

    // Hovering a weapon box?
    for (let i = 0; i < playerWeapons.length; i++) {
      const bx = WEAPON_BOX_MARGIN + i * (WEAPON_BOX_W + WEAPON_BOX_MARGIN);
      if (
        mouse.x >= bx && mouse.x <= bx + WEAPON_BOX_W &&
        mouse.y >= boxBaseY && mouse.y <= boxBaseY + WEAPON_BOX_H
      ) {
        const [, weapon] = playerWeapons[i];
        if (weapon.userPowered) {
          // Powered → left-click will enter targeting mode.
          this.input.setCursor('pointer');
        } else {
          // Can we afford to power this weapon on?
          const pool = this.getWeaponSystemPower(world);
          const used = playerWeapons.reduce(
            (s, [, w]) => s + (w.userPowered ? w.powerRequired : 0), 0,
          );
          this.input.setCursor(weapon.powerRequired <= pool - used ? 'pointer' : 'not-allowed');
        }
        return;
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  /** Returns [entity, WeaponComponent] pairs for all player-owned weapons, in entity-ID order. */
  getPlayerWeapons(world: IWorld): Array<[Entity, WeaponComponent]> {
    const playerEntity = this.findShipEntity(world, 'PLAYER');
    if (playerEntity === null) return [];

    const result: Array<[Entity, WeaponComponent]> = [];
    const entities = world.query(['Weapon', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerEntity) continue;
      const weapon = world.getComponent<WeaponComponent>(entity, 'Weapon');
      if (weapon !== undefined) result.push([entity, weapon]);
    }
    // Stable insertion-order (entity IDs are assigned sequentially).
    result.sort(([a], [b]) => a - b);
    return result;
  }

  /** Returns the current power allocated to the player's WEAPONS system, or 0 if absent. */
  private getWeaponSystemPower(world: IWorld): number {
    const playerEntity = this.findShipEntity(world, 'PLAYER');
    if (playerEntity === null) return 0;
    const entities = world.query(['System', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== playerEntity) continue;
      const sys = world.getComponent<SystemComponent>(entity, 'System');
      if (sys?.type === 'WEAPONS') return sys.currentPower;
    }
    return 0;
  }

  private findShipEntity(world: IWorld, factionId: 'PLAYER' | 'ENEMY'): Entity | null {
    const entities = world.query(['Ship', 'Faction']);
    for (const entity of entities) {
      const faction = world.getComponent<FactionComponent>(entity, 'Faction');
      if (faction?.id === factionId) return entity;
    }
    return null;
  }

  private getEnemyRoomAtMouse(world: IWorld, mx: number, my: number): Entity | null {
    const enemyShipEntity = this.findShipEntity(world, 'ENEMY');
    if (enemyShipEntity === null) return null;

    const entities = world.query(['Room', 'Position', 'Owner']);
    for (const entity of entities) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp?.shipEntity !== enemyShipEntity) continue;

      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      const room = world.getComponent<RoomComponent>(entity, 'Room');
      if (pos === undefined || room === undefined) continue;

      const right  = pos.x + room.width  * TILE_SIZE;
      const bottom = pos.y + room.height * TILE_SIZE;

      if (mx >= pos.x && mx < right && my >= pos.y && my < bottom) {
        return entity;
      }
    }
    return null;
  }
}
