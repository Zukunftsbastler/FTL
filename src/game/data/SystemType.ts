/** All ship system types. Rooms may house at most one system. Sub-systems (PILOTING, SENSORS, DOORS) do not consume reactor power. */
export type SystemType =
  | 'SHIELDS'
  | 'ENGINES'
  | 'WEAPONS'
  | 'OXYGEN'
  | 'MEDBAY'
  | 'PILOTING'
  | 'SENSORS'
  | 'DOORS'
  | 'CLOAKING'
  | 'TELEPORTER'
  | 'DRONE_CONTROL'
  | 'HACKING';
