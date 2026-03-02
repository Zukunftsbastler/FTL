import { AssetLoader } from '../../utils/AssetLoader';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { ShipTemplate } from '../data/ShipTemplate';
import type { ShipComponent } from '../components/ShipComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { DoorComponent } from '../components/DoorComponent';
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
 *   crewCentre = startXY + gridXY * TILE_SIZE + TILE_SIZE / 2
 *   doorPixel  = startXY + door.XY * TILE_SIZE  (the shared wall pixel boundary)
 */
export class ShipFactory {
  /**
   * Spawns a ship, all its rooms, all its doors, and all starting crew into the world.
   *
   * @param world       ECS world to populate.
   * @param templateId  The `id` in the loaded ships JSON array (e.g. 'kestrel_a').
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

    // ── Ship root entity (+ reactor) ─────────────────────────────────────────
    const shipEntity = world.createEntity();
    const shipComp: ShipComponent = {
      _type: 'Ship',
      id: template.id,
      maxHull: template.maxHull,
      currentHull: template.maxHull,
    };
    const reactorComp: ReactorComponent = {
      _type: 'Reactor',
      totalPower: template.startingReactorPower,
      currentPower: template.startingReactorPower, // all power available at start
    };
    world.addComponent(shipEntity, shipComp);
    world.addComponent(shipEntity, reactorComp);

    // ── Room entities (+ optional SystemComponent) ──────────────────────────
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

      // If this room hosts a system, attach a SystemComponent with its capacity.
      if (roomData.system !== undefined) {
        const systemData = template.systems.find((s) => s.type === roomData.system);
        if (systemData !== undefined) {
          const systemComp: SystemComponent = {
            _type: 'System',
            type: systemData.type,
            maxCapacity: systemData.level,
            currentPower: 0,
            roomId: roomData.roomId,
          };
          world.addComponent(roomEntity, systemComp);
        }
      }
    }

    // ── Door entities ───────────────────────────────────────────────────────
    for (const doorData of template.doors) {
      const doorEntity = world.createEntity();

      const doorComp: DoorComponent = {
        _type: 'Door',
        roomA: doorData.roomA,
        roomB: doorData.roomB,
        isOpen: true,
        isVertical: doorData.vertical,
      };

      // PositionComponent stores the pixel coordinate of the shared wall:
      //   vertical door   → pos.x = pixel column boundary (startX + door.x * TILE_SIZE)
      //   horizontal door → pos.y = pixel row    boundary (startY + door.y * TILE_SIZE)
      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + doorData.x * TILE_SIZE,
        y: startY + doorData.y * TILE_SIZE,
      };

      world.addComponent(doorEntity, doorComp);
      world.addComponent(doorEntity, posComp);
    }

    // ── Crew entities ───────────────────────────────────────────────────────
    for (const crewData of template.startingCrew) {
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
      const pathComp: PathfindingComponent = {
        _type: 'Pathfinding',
        targetX: spawnRoom.x,
        targetY: spawnRoom.y,
        path: [],
      };
      // Crew spawns at centre of the first (top-left) tile of their assigned room.
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
