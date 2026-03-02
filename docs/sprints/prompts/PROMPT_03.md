Excellent work on Sprint 2. The foundation is perfectly stable. We are now moving to Sprint 3. 

Please read `docs/sprints/SPRINT_03_SHIP_GRID_AND_DATA.md`.

In this sprint, we are implementing the core Data-Driven design of the project. We will read a ship's blueprint from JSON and use a Factory pattern to generate ECS Entities for the ship and its rooms.

**Execution Rules:**
1. Reference `docs/api/DATA_SCHEMA.md` to ensure your `data/ships.json` file strictly matches the interface we defined.
2. In the `ShipFactory`, define a constant `TILE_SIZE` (e.g., 35 pixels). The JSON defines rooms in grid coordinates (e.g., x: 2, y: 0, width: 2, height: 2). You must translate these grid coordinates into pixel coordinates for the `PositionComponent`.
3. Work step-by-step through Tasks A to E.
4. Ensure your code is strictly typed. Run `tsc --noEmit` before finishing.

**Version Control Instructions:**
Once the ship renders correctly on the screen with distinct rooms and system labels, and there are zero TS errors, please stage and commit all changes. Use the commit message: "feat: Sprint 3 complete - Data-Driven Ship Spawning and Room Rendering".

Please begin and let me know when the commit is successful!