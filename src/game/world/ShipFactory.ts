import { AssetLoader } from '../../utils/AssetLoader';
import { TILE_SIZE } from '../constants';
import { allocatePower } from '../logic/PowerMath';
import type { IWorld } from '../../engine/IWorld';
import type { ShipTemplate } from '../data/ShipTemplate';
import type { WeaponTemplate } from '../data/WeaponTemplate';
import type { CrewTemplate } from '../data/CrewTemplate';
import type { ShipComponent } from '../components/ShipComponent';
import type { FactionComponent } from '../components/FactionComponent';
import type { ReactorComponent } from '../components/ReactorComponent';
import type { OwnerComponent } from '../components/OwnerComponent';
import type { RoomComponent } from '../components/RoomComponent';
import type { SystemComponent } from '../components/SystemComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { DoorComponent } from '../components/DoorComponent';
import type { CrewComponent } from '../components/CrewComponent';
import type { SelectableComponent } from '../components/SelectableComponent';
import type { PathfindingComponent } from '../components/PathfindingComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { WeaponComponent } from '../components/WeaponComponent';
import type { ShieldComponent } from '../components/ShieldComponent';

/**
 * System types in the order they should receive auto-power on spawn.
 * OXYGEN first prevents immediate crew suffocation.
 */
const POWER_PRIORITY: string[] = ['OXYGEN', 'SHIELDS', 'PILOTING', 'ENGINES', 'WEAPONS'];

/**
 * Translates a raw ShipTemplate (loaded from JSON) into ECS entities.
 *
 * Coordinate contract:
 *   pixelX = startX + gridX * TILE_SIZE
 *   pixelY = startY + gridY * TILE_SIZE
 *   crewCentre = startXY + gridXY * TILE_SIZE + TILE_SIZE / 2
 *   doorPixel  = startXY + door.XY * TILE_SIZE  (the shared wall pixel boundary)
 *
 * Every child entity (room, door, crew, weapon) receives an OwnerComponent pointing
 * at the ship root entity.  This allows multi-ship systems to scope queries correctly.
 *
 * After spawning all rooms, vital systems are auto-powered in priority order
 * (OXYGEN → SHIELDS → PILOTING → ENGINES → WEAPONS) until the reactor pool is empty.
 */
export class ShipFactory {
  /**
   * Spawns a ship, all its rooms, doors, crew, and weapons into the world.
   *
   * @param world       ECS world to populate.
   * @param templateId  The `id` in the loaded ships JSON array (e.g. 'kestrel_a').
   * @param startX      Pixel X of the ship's top-left corner on the canvas.
   * @param startY      Pixel Y of the ship's top-left corner on the canvas.
   * @param faction     Which side this ship belongs to.
   */
  static spawnShip(
    world: IWorld,
    templateId: string,
    startX: number,
    startY: number,
    faction: 'PLAYER' | 'ENEMY',
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

    // ── Ship root entity ──────────────────────────────────────────────────────
    const shipEntity = world.createEntity();

    const shipComp: ShipComponent = {
      _type: 'Ship',
      id: template.id,
      maxHull: template.maxHull,
      currentHull: template.maxHull,
      fuel: template.startingResources.fuel,
      scrap: template.startingResources.scrap,
      missiles: template.startingResources.missiles,
      droneParts: template.startingResources.droneParts,
      cargoWeapons: [],
      evasion: 0,
    };
    const factionComp: FactionComponent = {
      _type: 'Faction',
      id: faction,
    };
    const reactorComp: ReactorComponent = {
      _type: 'Reactor',
      totalPower: template.startingReactorPower,
      currentPower: template.startingReactorPower,
    };

    world.addComponent(shipEntity, shipComp);
    world.addComponent(shipEntity, factionComp);
    world.addComponent(shipEntity, reactorComp);

    // Helper: owner component pointing back to the ship root.
    const owner = (entity: number): OwnerComponent => ({
      _type: 'Owner',
      shipEntity: entity,
    });

    // ── Room entities ─────────────────────────────────────────────────────────
    const spawnedSystems: SystemComponent[] = [];

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
      const oxygenComp: OxygenComponent = { _type: 'Oxygen', level: 100 };

      world.addComponent(roomEntity, roomComp);
      world.addComponent(roomEntity, posComp);
      world.addComponent(roomEntity, oxygenComp);
      world.addComponent(roomEntity, owner(shipEntity));

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
            damageAmount: 0,
          };
          world.addComponent(roomEntity, systemComp);
          spawnedSystems.push(systemComp);
        }
      }
    }

    // ── Auto-power vital systems ──────────────────────────────────────────────
    // Sort by POWER_PRIORITY so OXYGEN is powered before SHIELDS, etc.
    spawnedSystems.sort((a, b) => {
      const pa = POWER_PRIORITY.indexOf(a.type);
      const pb = POWER_PRIORITY.indexOf(b.type);
      return (pa === -1 ? POWER_PRIORITY.length : pa) - (pb === -1 ? POWER_PRIORITY.length : pb);
    });
    for (const sys of spawnedSystems) {
      while (reactorComp.currentPower > 0 && sys.currentPower < sys.maxCapacity) {
        allocatePower(reactorComp, sys);
      }
    }

    // ── Shield component (attached to ship root if SHIELDS system exists) ─────
    const hasShields = spawnedSystems.some((s) => s.type === 'SHIELDS');
    if (hasShields) {
      const shieldComp: ShieldComponent = {
        _type: 'Shield',
        currentLayers: 0,
        maxLayers: 0,
      };
      world.addComponent(shipEntity, shieldComp);
    }

    // ── Door entities ──────────────────────────────────────────────────────────
    for (const doorData of template.doors) {
      const doorEntity = world.createEntity();

      const doorComp: DoorComponent = {
        _type: 'Door',
        roomA: doorData.roomA,
        roomB: doorData.roomB,
        isOpen: true,
        isVertical: doorData.vertical,
      };
      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + doorData.x * TILE_SIZE,
        y: startY + doorData.y * TILE_SIZE,
      };

      world.addComponent(doorEntity, doorComp);
      world.addComponent(doorEntity, posComp);
      world.addComponent(doorEntity, owner(shipEntity));
    }

    // ── Crew entities ──────────────────────────────────────────────────────────
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
        crewClass: crewData.crewClass,
        health: 100,
        maxHealth: 100,
        skills: { ...crewData.skills },
        xp: { piloting: 0, engineering: 0, gunnery: 0, repair: 0, combat: 0 },
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
      const posComp: PositionComponent = {
        _type: 'Position',
        x: startX + spawnRoom.x * TILE_SIZE + TILE_SIZE / 2,
        y: startY + spawnRoom.y * TILE_SIZE + TILE_SIZE / 2,
      };

      world.addComponent(crewEntity, crewComp);
      world.addComponent(crewEntity, selectableComp);
      world.addComponent(crewEntity, pathComp);
      world.addComponent(crewEntity, posComp);
      world.addComponent(crewEntity, owner(shipEntity));
    }

    // ── Weapon entities ────────────────────────────────────────────────────────
    const allWeapons = AssetLoader.getJSON<WeaponTemplate[]>('weapons');
    if (allWeapons === undefined) {
      // Weapons JSON not loaded yet — skip silently.
      return;
    }

    for (const weaponId of template.startingWeapons) {
      const weaponTemplate = allWeapons.find((w) => w.id === weaponId);
      if (weaponTemplate === undefined) {
        console.warn(`ShipFactory: weapon '${weaponId}' not found in weapons registry — skipped.`);
        continue;
      }

      const weaponEntity = world.createEntity();

      const weaponComp: WeaponComponent = {
        _type: 'Weapon',
        templateId: weaponTemplate.id,
        charge: 0,
        maxCharge: weaponTemplate.cooldown,
        powerRequired: weaponTemplate.powerCost,
        userPowered: false,
        isPowered: false,
        targetRoomEntity: undefined,
        chargeRateMultiplier: 1.0,
      };

      world.addComponent(weaponEntity, weaponComp);
      world.addComponent(weaponEntity, owner(shipEntity));
    }
  }

  /**
   * Spawns a single crew member entity onto an existing ship at runtime (e.g. from a loot reward).
   * The crew is placed at the centre of the first room found owned by `shipEntity`.
   */
  static spawnCrewMember(
    world: IWorld,
    crewData: CrewTemplate,
    shipEntity: number,
  ): void {
    // Find the first room owned by this ship to determine spawn position.
    let spawnX = 0;
    let spawnY = 0;
    let found  = false;
    for (const re of world.query(['Room', 'Position', 'Owner'])) {
      const ownerComp = world.getComponent<OwnerComponent>(re, 'Owner');
      if (ownerComp?.shipEntity !== shipEntity) continue;
      const pos  = world.getComponent<PositionComponent>(re, 'Position');
      const room = world.getComponent<RoomComponent>(re, 'Room');
      if (pos === undefined || room === undefined) continue;
      spawnX = pos.x + (room.width  * TILE_SIZE) / 2;
      spawnY = pos.y + (room.height * TILE_SIZE) / 2;
      found  = true;
      break;
    }
    if (!found) return;

    const crewEntity = world.createEntity();

    const crewComp: CrewComponent = {
      _type: 'Crew',
      name: crewData.name,
      race: crewData.race,
      crewClass: crewData.crewClass,
      health: 100,
      maxHealth: 100,
      skills: { ...crewData.skills },
      xp: { piloting: 0, engineering: 0, gunnery: 0, repair: 0, combat: 0 },
    };
    const selectableComp: SelectableComponent = {
      _type: 'Selectable',
      isSelected: false,
    };
    const pathComp: PathfindingComponent = {
      _type: 'Pathfinding',
      targetX: 0,
      targetY: 0,
      path: [],
    };
    const posComp: PositionComponent = {
      _type: 'Position',
      x: spawnX,
      y: spawnY,
    };
    const ownerComp: OwnerComponent = {
      _type: 'Owner',
      shipEntity,
    };

    world.addComponent(crewEntity, crewComp);
    world.addComponent(crewEntity, selectableComp);
    world.addComponent(crewEntity, pathComp);
    world.addComponent(crewEntity, posComp);
    world.addComponent(crewEntity, ownerComp);
  }
}
