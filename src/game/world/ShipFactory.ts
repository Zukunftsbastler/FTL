import { AssetLoader } from '../../utils/AssetLoader';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { ShipTemplate } from '../data/ShipTemplate';
import type { ShipComponent } from '../components/ShipComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { PositionComponent } from '../components/PositionComponent';

/**
 * Translates a raw ShipTemplate (loaded from JSON) into ECS entities.
 *
 * Coordinate contract:
 *   pixelX = startX + room.x * TILE_SIZE
 *   pixelY = startY + room.y * TILE_SIZE
 *
 * Call AssetLoader.loadJSON<ShipTemplate[]>('ships', ...) before using this factory.
 */
export class ShipFactory {
  /**
   * Spawns a ship and all its rooms into the world.
   *
   * @param world       The ECS world to add entities to.
   * @param templateId  The `id` field of the desired ship in the loaded JSON array.
   * @param startX      Pixel X offset for the ship's top-left corner on the canvas.
   * @param startY      Pixel Y offset for the ship's top-left corner on the canvas.
   */
  static spawnShip(
    world: IWorld,
    templateId: string,
    startX: number,
    startY: number,
  ): void {
    const allShips = AssetLoader.getJSON<ShipTemplate[]>('ships');
    if (allShips === undefined) {
      throw new Error(
        `ShipFactory.spawnShip: JSON asset 'ships' is not loaded. ` +
          `Call AssetLoader.loadJSON before spawning ships.`,
      );
    }

    const template = allShips.find((s) => s.id === templateId);
    if (template === undefined) {
      throw new Error(
        `ShipFactory.spawnShip: no ship template found with id '${templateId}'.`,
      );
    }

    // ── Ship root entity ────────────────────────────────────────────────────
    const shipEntity = world.createEntity();
    const shipComp: ShipComponent = {
      _type: 'Ship',
      id: template.id,
      maxHull: template.maxHull,
      currentHull: template.maxHull,
    };
    world.addComponent(shipEntity, shipComp);

    // ── Room entities ───────────────────────────────────────────────────────
    for (const roomData of template.rooms) {
      const roomEntity = world.createEntity();

      const roomComp: RoomComponent = {
        _type: 'Room',
        roomId: roomData.roomId,
        x: roomData.x,
        y: roomData.y,
        width: roomData.width,
        height: roomData.height,
        system: roomData.system,
      };

      // Convert grid coordinates to pixel coordinates using the global tile size.
      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + roomData.x * TILE_SIZE,
        y: startY + roomData.y * TILE_SIZE,
      };

      world.addComponent(roomEntity, roomComp);
      world.addComponent(roomEntity, posComp);
    }
  }
}
