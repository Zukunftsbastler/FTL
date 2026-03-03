import { TILE_SIZE } from '../constants';
import type { IInput } from '../../engine/IInput';
import type { IWorld } from '../../engine/IWorld';
import type { PositionComponent } from '../components/PositionComponent';
import type { SelectableComponent } from '../components/SelectableComponent';

/**
 * Handles crew selection via left mouse click.
 *
 * On every left-click:
 *  - Converts mouse pixel coordinates → ship grid coordinates.
 *  - Queries all entities with [Crew, Selectable, Position].
 *  - Selects the crew member whose tile matches the click; deselects all others.
 *  - If no crew occupies the clicked tile, all crew are deselected.
 *
 * Note: shipX/shipY are the pixel offsets of the ship's top-left corner and must
 * match the values passed to ShipFactory.spawnShip(). If the canvas is resized and
 * the ship re-centred, a new SelectionSystem must be constructed with the new offsets.
 */
export class SelectionSystem {
  private readonly input: IInput;
  private readonly shipX: number;
  private readonly shipY: number;

  constructor(input: IInput, shipX: number, shipY: number) {
    this.input  = input;
    this.shipX  = shipX;
    this.shipY  = shipY;
  }

  update(world: IWorld): void {
    const mouse = this.input.getMousePosition();

    // ── Cursor: pointer when hovering a crew member ───────────────────────────
    for (const entity of world.query(['Crew', 'Selectable', 'Position'])) {
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

    // Convert click pixel → grid tile.
    const clickGridX = Math.floor((mouse.x - this.shipX) / TILE_SIZE);
    const clickGridY = Math.floor((mouse.y - this.shipY) / TILE_SIZE);

    const entities = world.query(['Crew', 'Selectable', 'Position']);

    for (const entity of entities) {
      const pos        = world.getComponent<PositionComponent>(entity, 'Position');
      const selectable = world.getComponent<SelectableComponent>(entity, 'Selectable');
      if (pos === undefined || selectable === undefined) continue;

      // Crew pos.x/y is the centre of their current tile — floor-divide to recover grid coords.
      const crewGridX = Math.floor((pos.x - this.shipX) / TILE_SIZE);
      const crewGridY = Math.floor((pos.y - this.shipY) / TILE_SIZE);

      selectable.isSelected = crewGridX === clickGridX && crewGridY === clickGridY;
    }
  }
}
