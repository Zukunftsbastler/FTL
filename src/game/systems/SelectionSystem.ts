import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { FactionComponent } from '../components/FactionComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SelectableComponent } from '../components/SelectableComponent';

/**
 * Handles crew selection via left mouse click.
 *
 * Rules:
 *  - Only PLAYER faction crew may be selected. ENEMY crew are always deselected.
 *  - On every left-click, derives each crew member's ship pixel origin dynamically
 *    (via OwnerComponent → any owned room) so the grid conversion is correct for
 *    any ship position — fixing the bug where selection coords were hardcoded to
 *    the player ship's spawn position.
 */
export class SelectionSystem {
  private readonly input: IInput;

  constructor(input: IInput) {
    this.input = input;
  }

  update(world: IWorld): void {
    const mouse = this.input.getMousePosition();

    // ── Cursor: pointer when hovering a PLAYER crew member ───────────────────
    for (const entity of world.query(['Crew', 'Selectable', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(entity, 'Owner');
      if (ownerComp === undefined) continue;
      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') continue;

      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) continue;
      const dx = mouse.x - pos.x;
      const dy = mouse.y - pos.y;
      if (dx * dx + dy * dy <= 14 * 14) {
        this.input.setCursor('pointer');
        break;
      }
    }

    if (!this.input.isMouseJustPressed(0)) return;

    const entities = world.query(['Crew', 'Selectable', 'Position', 'Owner']);

    for (const entity of entities) {
      const ownerComp  = world.getComponent<OwnerComponent>(entity, 'Owner');
      const selectable = world.getComponent<SelectableComponent>(entity, 'Selectable');
      if (ownerComp === undefined || selectable === undefined) continue;

      const faction = world.getComponent<FactionComponent>(ownerComp.shipEntity, 'Faction');
      if (faction?.id !== 'PLAYER') {
        // Enemy crew can never be selected.
        selectable.isSelected = false;
        continue;
      }

      // Derive ship pixel origin from any room owned by this crew's parent ship.
      const origin = this.getShipOrigin(world, ownerComp.shipEntity);
      if (origin === null) { selectable.isSelected = false; continue; }

      // Convert click pixel → grid tile using the crew member's own ship origin.
      const clickGridX = Math.floor((mouse.x - origin.x) / TILE_SIZE);
      const clickGridY = Math.floor((mouse.y - origin.y) / TILE_SIZE);

      const pos = world.getComponent<PositionComponent>(entity, 'Position');
      if (pos === undefined) { selectable.isSelected = false; continue; }

      const crewGridX = Math.floor((pos.x - origin.x) / TILE_SIZE);
      const crewGridY = Math.floor((pos.y - origin.y) / TILE_SIZE);

      selectable.isSelected = crewGridX === clickGridX && crewGridY === clickGridY;
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────

  /**
   * Derives the ship's pixel origin (top-left corner) by finding any room owned
   * by the given ship entity and back-calculating:
   *   originX = roomPos.x - room.x * TILE_SIZE
   */
  private getShipOrigin(world: IWorld, shipEntity: number): { x: number; y: number } | null {
    for (const re of world.query(['Room', 'Position', 'Owner'])) {
      const owner = world.getComponent<OwnerComponent>(re, 'Owner');
      if (owner?.shipEntity !== shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(re, 'Position');
      const room = world.getComponent<RoomComponent>(re, 'Room');
      if (pos !== undefined && room !== undefined) {
        return { x: pos.x - room.x * TILE_SIZE, y: pos.y - room.y * TILE_SIZE };
      }
    }
    return null;
  }
}
