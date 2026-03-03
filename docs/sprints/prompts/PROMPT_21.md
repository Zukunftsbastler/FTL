We are shifting gears. The core game mechanics are complete, and we now need an automated asset generation pipeline to create graphics for the game using a Google API. 

Please read `docs/sprints/SPRINT_21_ASSET_PIPELINE.md`.

**Execution Rules:**
1. **Isolation:** This is a strictly backend/Node.js tooling sprint. Do NOT touch any files in `src/engine/` or `src/game/`. All code for this sprint must live inside `tools/asset-generator/` (except for `package.json` updates).
2. **Dependencies:** You will need to install `dotenv` and `sharp`. Use `npm install -D dotenv sharp @types/sharp`.
3. **Execution Context:** We are using TypeScript. Ensure the `gen-asset` script in `package.json` uses `npx tsx` (or whatever TS runner is currently compatible with our setup) so we can run the `.ts` script directly from the command line.
4. **API Flexibility:** For Task C, I will manually configure the exact Google API / Nano Banana URL later. Just create a `const API_ENDPOINT = "https://placeholder-url.googleapis.com/v1/models/nanobanana:predict";` (or similar) and structure the `fetch` call with standard headers (Authorization: Bearer + KEY, Content-Type: application/json).
5. **Sharp Processing:** In Task D, the image resizing is critical. For the `ship` type, ensure you calculate dimensions that are multiples of 35 (our TILE_SIZE) so they snap cleanly to our game grid.

**Version Control Instructions:**
Once the CLI tool is built, the script parses arguments, the API caller is stubbed out and reading the `.env` file, and `sharp` is configured to process and save images to the correct folders, please stage and commit all changes. Use the commit message: "tooling: Sprint 21 complete - Node.js AI Asset Generation Pipeline with sharp".

Please begin and let me know when the commit is successful!