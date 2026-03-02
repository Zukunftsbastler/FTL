import type { Component } from './Component';
import type { Entity } from './Entity';

/** Central ECS registry. Systems receive a World instance in their update() method. */
export interface IWorld {
  /** Creates and registers a new unique Entity ID. */
  createEntity(): Entity;

  /** Destroys an entity and removes all of its associated components. */
  destroyEntity(entity: Entity): void;

  /** Attaches a component to an entity. Overwrites any existing component of the same type. */
  addComponent(entity: Entity, component: Component): void;

  /** Removes the component of the given type from an entity. No-op if not present. */
  removeComponent(entity: Entity, componentType: string): void;

  /** Returns the component of the given type, or undefined if not found. */
  getComponent<T extends Component>(entity: Entity, componentType: string): T | undefined;

  /** Returns every entity that currently owns ALL of the specified component types. */
  query(componentTypes: string[]): Entity[];
}
