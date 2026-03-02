/** Base interface for all components. Components must be pure data — no logic or methods. */
export interface Component {
  /** Unique type identifier matching the class name (e.g. 'Health', 'Position'). */
  readonly _type: string;
}
