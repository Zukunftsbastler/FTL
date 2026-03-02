import { Time } from '../../engine/Time';
import { TILE_SIZE } from '../constants';
import type { IWorld } from '../../engine/IWorld';
import type { CrewComponent } from '../components/CrewComponent';
import type { OxygenComponent } from '../components/OxygenComponent';
import type { PositionComponent } from '../components/PositionComponent';
import type { RoomComponent } from '../components/RoomComponent';

/** O2 level below which crew begin taking suffocation damage. */
const SUFFOCATION_THRESHOLD = 5;

/** Health lost per second while in a room below the suffocation threshold. */
const SUFFOCATION_RATE = 5;

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

    for (const entity of crewEntities) {
      const crew = world.getComponent<CrewComponent>(entity, 'Crew');
      const pos  = world.getComponent<PositionComponent>(entity, 'Position');
      if (crew === undefined || pos === undefined) continue;

      const o2 = this.getO2AtPosition(pos.x, pos.y, roomData);
      if (o2 !== null && o2 < SUFFOCATION_THRESHOLD) {
        crew.health -= SUFFOCATION_RATE * dt;
        if (crew.health <= 0) {
          world.destroyEntity(entity);
        }
      }
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  private collectRoomData(
    world: IWorld,
  ): Array<{ left: number; top: number; right: number; bottom: number; o2: number }> {
    const result: Array<{ left: number; top: number; right: number; bottom: number; o2: number }> = [];
    const entities = world.query(['Room', 'Oxygen', 'Position']);
    for (const entity of entities) {
      const pos    = world.getComponent<PositionComponent>(entity, 'Position');
      const room   = world.getComponent<RoomComponent>(entity, 'Room');
      const oxygen = world.getComponent<OxygenComponent>(entity, 'Oxygen');
      if (pos === undefined || room === undefined || oxygen === undefined) continue;
      result.push({
        left:   pos.x,
        top:    pos.y,
        right:  pos.x + room.width  * TILE_SIZE,
        bottom: pos.y + room.height * TILE_SIZE,
        o2:     oxygen.level,
      });
    }
    return result;
  }

  private getO2AtPosition(
    x: number,
    y: number,
    rooms: Array<{ left: number; top: number; right: number; bottom: number; o2: number }>,
  ): number | null {
    for (const room of rooms) {
      if (x >= room.left && x < room.right && y >= room.top && y < room.bottom) {
        return room.o2;
      }
    }
    return null; // not inside any known room
  }
}
