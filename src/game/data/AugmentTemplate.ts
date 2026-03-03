/** An augmentation entry loaded from data/augments.json. */
export interface AugmentTemplate {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly effectType: string;
  /** Numeric magnitude for augments that scale (e.g. 0.1 = 10% boost). */
  readonly value?: number;
  readonly stackable: boolean;
}
