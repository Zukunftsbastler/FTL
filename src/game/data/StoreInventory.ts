import type { SystemType } from './SystemType';

/** Category of a generated store item. */
export type StoreItemCategory = 'RESOURCE' | 'WEAPON' | 'SYSTEM';

/** A single purchasable item inside a store inventory. */
export interface StoreItem {
  /** Unique ID within this store inventory. */
  id:       string;
  /** Human-readable display name. */
  label:    string;
  /** Scrap cost. */
  price:    number;
  /** Set to true once the player buys it — renders as "SOLD OUT". */
  sold:     boolean;
  category: StoreItemCategory;

  // RESOURCE fields
  resourceType?:   'fuel' | 'missiles' | 'droneParts' | 'hull';
  resourceAmount?: number;

  // WEAPON fields
  weaponId?: string;

  // SYSTEM fields
  systemType?: SystemType;
}

/** The full inventory of a generated store node. Persists until the player leaves. */
export interface StoreInventory {
  items: StoreItem[];
}
