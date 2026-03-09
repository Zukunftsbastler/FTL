/** One node in the overarching sector-selection DAG. */
export interface SectorNode {
  /** Unique ID within the sector tree. */
  readonly id: number;
  /** Sector depth (1 = start, 8 = boss). */
  readonly level: number;
  /** ID of the SectorTemplate from sectors.json. */
  readonly sectorTemplateId: string;
  /** IDs of reachable nodes in the next level. */
  nextNodeIds: number[];
}
