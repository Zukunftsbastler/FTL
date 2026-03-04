import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import { getRaceStats } from '../logic/CrewStats';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';

/** O2 level below which crew begin taking suffocation damage. */
const SUFFOCATION_THRESHOLD = 5;

/** Health lost per second while in a room below the suffocation threshold. */
const SUFFOCATION_RATE = 1;

/** Health lost per second while in a room that is on fire. */
const FIRE_DAMAGE_RATE = 1.5;

/**
 * Applies suffocation damage to crew members standing in low-oxygen rooms,
 * and destroys any crew whose health reaches zero.
 */
export class CrewSystem {
  update(world: IWorld): void {
    const dt = Time.deltaTime;

    // Pre-build a snapshot of room oxygen levels indexed by pixel bounds
    // so we can look up O2 for any pixel position without nested queries.
    const roomData = this.collectRoomData(world);

    const crewEntities = world.query(['Crew', 'Position']);
    const toDestroy: number[] = [];

    for (const entity of crewEntities) {
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (crew === undefined || pos === undefined) continue;

      const room = this.getRoomAtPosition(pos.x, pos.y, roomData);
      if (room === null) continue;

      // ── Suffocation (low O2) ──────────────────────────────────────────────
      if (room.o2 < SUFFOCATION_THRESHOLD) {
        // Racial suffocationMultiplier: 0.0 = immune (Lanius), 0.5 = reduced (Crystal).
        const suffMult = getRaceStats(crew.race).suffocationMultiplier;
        crew.health -= SUFFOCATION_RATE * suffMult * dt;
      }

      // ── Fire damage ───────────────────────────────────────────────────────
      if (room.hasFire) {
        crew.health -= FIRE_DAMAGE_RATE * dt;
      }

      if (crew.health <= 0) {
        toDestroy.push(entity);
      }
    }

    for (const entity of toDestroy) {
      world.destroyEntity(entity);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectRoomData(
    world: IWorld,
  ): Array<{ left: number; top: number; right: number; bottom: number; o2: number; hasFire: boolean }> {
    const result: Array<{ left: number; top: number; right: number; bottom: number; o2: number; hasFire: boolean }> = [];
    const entities = world.query(['Room', 'Oxygen', 'Position']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
      if (pos === undefined || room === undefined || oxygen === undefined) continue;
      result.push({
        left:    pos.x,
        top:     pos.y,
        right:   pos.x + room.width  * TILE_SIZE,
        bottom:  pos.y + room.height * TILE_SIZE,
        o2:      oxygen.level,
        hasFire: room.hasFire,
      });
    }
    return result;
  }

  private getRoomAtPosition(
    x: number,
    y: number,
    rooms: Array<{ left: number; top: number; right: number; bottom: number; o2: number; hasFire: boolean }>,
  ): { o2: number; hasFire: boolean } | null {
    for (const room of rooms) {
      if (x >= room.left && x < room.right && y >= room.top && y < room.bottom) {
        return room;
      }
    }
    return null; // not inside any known room
  }
}
