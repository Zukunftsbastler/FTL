# SPRINT 21: Automated AI Asset Pipeline (Tooling)

## 1. Sprint Objective
**To the AI Assistant:** This sprint does NOT involve the ECS or the core game loop. The goal is to build a standalone Node.js Command Line Interface (CLI) tool inside the repository. This tool will take a text prompt, call an external image generation API (specifically using a Google API key, targeting the "Nano Banana 2" model or a generic REST endpoint), process the returned image using `sharp` (resizing, formatting), and automatically save it as a game-ready `.png` directly into our `assets/` folder.

## 2. Tasks

### A. Environment & Dependencies Setup
* Create a new directory at the root level: `tools/asset-generator/`.
* Install necessary dev dependencies: `npm install -D dotenv sharp` (and `@types/sharp` if needed). Note: Node 18+ has native `fetch`, so no need for `node-fetch`.
* Create a `.env` file at the root of the project (ensure `.env` is already in `.gitignore`!) and if it doesn't already exist, add a placeholder: `GOOGLE_API_KEY=your_key_here`.
* Add a new script to `package.json`: `"gen-asset": "npx tsx tools/asset-generator/index.ts"` (or use `ts-node` depending on our current Vite/TS setup).

### B. The CLI Interface (`tools/asset-generator/index.ts`)
* Write a script that parses command-line arguments using `process.argv`.
* Expected arguments:
  * `--prompt "your image description"` (Required)
  * `--type ship|weapon|crew|bg` (Required. Determines the target folder and post-processing rules)
  * `--out filename` (Optional. If not provided, generate a timestamped or slugified name).
* Example usage: `npm run gen-asset -- --prompt "top down sci-fi red pirate interceptor, flat shading" --type ship --out pirate_interceptor`

### C. The API Client (`tools/asset-generator/api.ts`)
* Create a module to handle the HTTP request.
* Read the `GOOGLE_API_KEY` from `process.env`. Throw an error if it's missing.
* Write a function `generateImage(prompt: string): Promise<Buffer>`
* **Implementation:** Set up a clean `fetch` request. Since the exact endpoint URL for "Nano Banana 2" might need configuration by the user, create a constant `API_ENDPOINT` at the top of the file and leave a clear comment so the user can paste the correct URL later. The function must return the binary image data (Buffer).

### D. Image Post-Processing Pipeline (`tools/asset-generator/processor.ts`)
Use `sharp` to process the `Buffer` returned by the API before saving it.
* Create a function `processAndSaveImage(imageBuffer: Buffer, type: string, filename: string)`
* **Type-based rules:**
  * `ship`: Ensure the image is a PNG. Resize the image so its dimensions are multiples of our `TILE_SIZE` (35px) (e.g., 140x140 or 105x175). Apply `sharp().trim()` to remove excess empty borders before resizing if possible. Save to `public/assets/ships/`.
  * `crew`: Resize to a very small size (e.g., 35x35) using nearest-neighbor scaling (`kernel: sharp.kernel.nearest`) to retain a blocky/pixelated look. Save to `public/assets/crew/`.
  * `weapon`: Resize to fit a typical weapon bounding box (e.g., 70x35). Save to `public/assets/weapons/`.
  * `bg`: Do not resize, just format to PNG. Save to `public/assets/backgrounds/`.
* Make sure the destination directories exist (use `fs.mkdirSync` with `recursive: true`).

## 3. Success Criteria
* Running `npm run gen-asset -- --prompt "test" --type ship` executes successfully (or fails gracefully with a clear message if the API endpoint/key is invalid, without crashing the whole Node process with a cryptic stack trace).
* The tool correctly reads the `.env` file.
* `sharp` successfully intercepts image buffers and saves them as `.png` files in the correct subdirectories inside `public/assets/` based on the `--type` flag.
* The game's build process (`npm run build`) is completely unaffected by this new tooling directory.