import { AssetLoader } from '../../utils/AssetLoader';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { ShipTemplate } from '../data/ShipTemplate';
import type { ShipComponent } from '../components/ShipComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { CrewComponent } from '../components/CrewComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';

/**
 * Translates a raw ShipTemplate (loaded from JSON) into ECS entities.
 *
 * Coordinate contract:
 *   pixelX = startX + gridX * TILE_SIZE
 *   pixelY = startY + gridY * TILE_SIZE
 *   crewPixel = startXY + gridXY * TILE_SIZE + TILE_SIZE / 2  (centre of first tile)
 *
 * Call AssetLoader.loadJSON<ShipTemplate[]>('ships', ...) before using this factory.
 */
export class ShipFactory {
  /**
   * Spawns a ship, all its rooms, and all starting crew into the world.
   *
   * @param world       The ECS world to add entities to.
   * @param templateId  The `id` field of the desired ship in the loaded JSON array.
   * @param startX      Pixel X of the ship's top-left corner on the canvas.
   * @param startY      Pixel Y of the ship's top-left corner on the canvas.
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

      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + roomData.x * TILE_SIZE,
        y: startY + roomData.y * TILE_SIZE,
      };

      world.addComponent(roomEntity, roomComp);
      world.addComponent(roomEntity, posComp);
    }

    // ── Crew entities ───────────────────────────────────────────────────────
    for (const crewData of template.startingCrew) {
      // Find the room this crew member spawns in so we can compute pixel coords.
      const spawnRoom = template.rooms.find((r) => r.roomId === crewData.roomId);
      if (spawnRoom === undefined) {
        console.warn(
          `ShipFactory: crew '${crewData.name}' references unknown roomId ${crewData.roomId} — skipped.`,
        );
        continue;
      }

      const crewEntity = world.createEntity();

      const crewComp: CrewComponent = {
        _type: 'Crew',
        name: crewData.name,
        race: crewData.race,
        health: 100,
        maxHealth: 100,
      };

      const selectableComp: SelectableComponent = {
        _type: 'Selectable',
        isSelected: false,
      };

      // Crew spawns at the centre of the first (top-left) tile of their assigned room.
      const pathComp: PathfindingComponent = {
        _type: 'Pathfinding',
        targetX: spawnRoom.x,
        targetY: spawnRoom.y,
        path: [],
      };

      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + spawnRoom.x * TILE_SIZE + TILE_SIZE / 2,
        y: startY + spawnRoom.y * TILE_SIZE + TILE_SIZE / 2,
      };

      world.addComponent(crewEntity, crewComp);
      world.addComponent(crewEntity, selectableComp);
      world.addComponent(crewEntity, pathComp);
      world.addComponent(crewEntity, posComp);
    }
  }
}
