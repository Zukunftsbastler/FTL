import type { Component } from '../../engine/Component';

/** Flag component that tracks whether an entity is currently selected by the player. */
export interface SelectableComponent extends Component {
  readonly _type: 'Selectable';
  isSelected: boolean;
}
