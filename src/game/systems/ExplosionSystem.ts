import { Time } from '../../engine/Time';
import { getExplosionMaxAge, EXPLOSION_FRAME_COUNT, EXPLOSION_GRID_COLS } from '../vfx/ExplosionGenerator';
import type { IWorld } from '../../engine/IWorld';
import type { ExplosionComponent } from '../components/ExplosionComponent';
import type { PositionComponent } from '../components/PositionComponent';

/**
 * Advances every active explosion entity's age counter.
 * Destroys entities whose age has exceeded their maxAge.
 * Also provides `spawnExplosion` so systems can create explosions without
 * importing the entire ECS world machinery themselves.
 */
export class ExplosionSystem {
  update(world: IWorld): void {
    const dt = Time.deltaTime;
    const toDestroy: number[] = [];

    for (const entity of world.query(['Explosion', 'Position'])) {
      const explosion = world.getComponent<ExplosionComponent>(entity, 'Explosion');
      if (explosion === undefined) continue;
      explosion.age += dt;
      if (explosion.age >= explosion.maxAge) {
        toDestroy.push(entity);
      }
    }

    for (const entity of toDestroy) {
      world.destroyEntity(entity);
    }
  }

  /**
   * Creates a new explosion entity at the given pixel position.
   *
   * @param world      The ECS world.
   * @param x          Impact X coordinate (pixel centre).
   * @param y          Impact Y coordinate (pixel centre).
   * @param weaponType Weapon visual type — 'LASER', 'MISSILE', 'ION', or 'BEAM'.
   * @param damage     Hull damage of the weapon; scales the physical display size.
   */
  spawnExplosion(
    world: IWorld,
    x: number,
    y: number,
    weaponType: string,
    damage: number,
  ): void {
    const entity = world.createEntity();

    const posComp: PositionComponent = {
      _type: 'Position',
      x,
      y,
    };

    const explosionComp: ExplosionComponent = {
      _type:      'Explosion',
      age:        0,
      maxAge:     getExplosionMaxAge(weaponType),
      type:       weaponType,
      size:       Math.max(48, damage * 44),
      frameCount: EXPLOSION_FRAME_COUNT,
      columns:    EXPLOSION_GRID_COLS,
    };

    world.addComponent(entity, posComp);
    world.addComponent(entity, explosionComp);
  }
}
