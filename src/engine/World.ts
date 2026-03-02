import type { Component } from './Component';
import type { Entity } from './Entity';
import type { IWorld } from './IWorld';

/** Concrete ECS world. Manages entity lifecycle and component storage. */
export class World implements IWorld {
  private nextEntityId: number = 0;
  /** Outer key: Entity ID. Inner key: component _type string. */
  private readonly store: Map<Entity, Map<string, Component>> = new Map();

  createEntity(): Entity {
    const id = this.nextEntityId++;
    this.store.set(id, new Map());
    return id;
  }

  destroyEntity(entity: Entity): void {
    this.store.delete(entity);
  }

  addComponent(entity: Entity, component: Component): void {
    const row = this.store.get(entity);
    if (row === undefined) {
      throw new Error(`World.addComponent: entity ${entity} does not exist.`);
    }
    row.set(component._type, component);
  }

  removeComponent(entity: Entity, componentType: string): void {
    this.store.get(entity)?.delete(componentType);
  }

  getComponent<T extends Component>(entity: Entity, componentType: string): T | undefined {
    return this.store.get(entity)?.get(componentType) as T | undefined;
  }

  query(componentTypes: string[]): Entity[] {
    const result: Entity[] = [];
    for (const [entity, row] of this.store) {
      if (componentTypes.every((type) => row.has(type))) {
        result.push(entity);
      }
    }
    return result;
  }
}
