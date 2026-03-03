/** A sector type entry loaded from data/sectors.json. */
export interface SectorTemplate {
  readonly id: string;
  readonly name: string;
  readonly type: 'CIVILIAN' | 'HOSTILE' | 'NEBULA' | 'BOSS';
  /** Probability (0–1) that any intermediate node has an environmental hazard. */
  readonly hazardChance: number;
  readonly storeCount: { readonly min: number; readonly max: number };
  /** Probability (0–1) that jumping to an unvisited node triggers combat. */
  readonly hostileChance: number;
  /** Probability (0–1) that any node is inside a nebula cloud. */
  readonly nebulaChance: number;
  readonly eventPool: readonly string[];
}
