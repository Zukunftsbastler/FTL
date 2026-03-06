import { TILE_SIZE } from '../constants';

/**
 * Pixels of canvas padding around the room bounding box.
 * Exported so RenderSystem can position the hull sprite correctly.
 */
export const HULL_PAD = 40;

type RGB = [number, number, number];
type FactionPalette = { hull: RGB; accent: RGB };

const FACTION_PALETTES: Record<string, FactionPalette> = {
  PLAYER: { hull: [0.52, 0.56, 0.60], accent: [0.88, 0.44, 0.10] }, // Kestrel grey/orange
  ENEMY:  { hull: [0.22, 0.27, 0.40], accent: [0.75, 0.15, 0.12] }, // Rebel blue/red
};
const DEFAULT_PALETTE: FactionPalette = {
  hull: [0.45, 0.47, 0.50], accent: [0.60, 0.60, 0.65],
};

// ── Vertex shader — fullscreen quad, no varyings needed ───────────────────────
const VERT_SRC = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

/**
 * Fragment shader — the hull extrusion engine.
 *
 * Algorithm
 *   1. Sample the room-mask texture at the current fragment.
 *      White (1.0) = inside a room → discard (transparent; rooms drawn by RenderSystem).
 *   2. Sample the mask in a wide radius (±28 px).
 *      If no white neighbours → discard (open space, transparent).
 *   3. If a pixel IS in the hull zone:
 *      a. Edge rim: 1-px neighbours are a room → bright inner highlight.
 *      b. Outer fade: pixels farther from rooms (12-28 px) are darkened.
 *      c. Panel lines + block-noise variation give a metallic greeble look.
 *      d. Faction accent colour tints high-value panel blocks.
 */
const FRAG_SRC = `#version 300 es
precision highp float;

out vec4 outColor;

uniform sampler2D u_mask;
uniform vec2      u_resolution;
uniform vec3      u_hullColor;
uniform vec3      u_accentColor;
uniform float     u_seed;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 uv    = gl_FragCoord.xy / u_resolution;

  // Room interior → transparent (RenderSystem renders rooms separately).
  if (texture(u_mask, uv).r > 0.5) discard;

  // ── Hull proximity — outer radius (stride 4 px → ±28 px) ─────────────────
  float hullNear = 0.0;
  for (int dx = -7; dx <= 7; dx++) {
    for (int dy = -7; dy <= 7; dy++) {
      hullNear = max(hullNear,
        texture(u_mask, uv + vec2(float(dx), float(dy)) * texel * 4.0).r);
    }
  }
  if (hullNear < 0.5) discard; // open space — transparent

  // ── Inner radius (stride 4 px → ±12 px) for outer-edge darkening ─────────
  float innerNear = 0.0;
  for (int dx = -3; dx <= 3; dx++) {
    for (int dy = -3; dy <= 3; dy++) {
      innerNear = max(innerNear,
        texture(u_mask, uv + vec2(float(dx), float(dy)) * texel * 4.0).r);
    }
  }
  // outerFactor = 1.0 on the outer hull band (12-28 px from rooms), 0.0 near rooms.
  float outerFactor = 1.0 - innerNear;

  // ── Edge rim — adjacent to room boundary (±1 px) ──────────────────────────
  float edgeNear = 0.0;
  for (int dx = -1; dx <= 1; dx++) {
    for (int dy = -1; dy <= 1; dy++) {
      edgeNear = max(edgeNear,
        texture(u_mask, uv + vec2(float(dx), float(dy)) * texel).r);
    }
  }
  bool isEdge = edgeNear > 0.5;

  // ── Panel greebles ────────────────────────────────────────────────────────
  float panelW  = 18.0;
  vec2  blockId = floor(gl_FragCoord.xy / panelW) + u_seed * 0.009;
  float blockVal = fract(sin(dot(blockId, vec2(127.1, 311.7))) * 43758.5);

  // Seam grooves (dark lines at panel borders).
  float seamX = step(panelW - 1.5, mod(gl_FragCoord.x, panelW));
  float seamY = step(panelW - 1.5, mod(gl_FragCoord.y, panelW));
  float seam  = max(seamX, seamY);

  // ── Color assembly ────────────────────────────────────────────────────────
  // Base: subtle brightness variation across panel blocks.
  vec3 color = mix(u_hullColor, u_hullColor * 1.28, blockVal * 0.38);
  // Seam grooves.
  color = mix(color, u_hullColor * 0.42, seam * 0.85);
  // Faction accent on high-value blocks.
  color = mix(color, u_accentColor, step(0.86, blockVal) * 0.50);
  // Bright inner rim at room boundaries.
  if (isEdge) color = mix(color, vec3(0.70, 0.76, 0.88), 0.62);
  // Outer edge shadow (hull thins toward open space).
  color = mix(color, color * 0.50, outerFactor * 0.60);

  outColor = vec4(color, 1.0);
}`;

// ── Generator class ────────────────────────────────────────────────────────────

/**
 * Generates a WebGL hull sprite that perfectly wraps a ship's room grid.
 *
 * The algorithm:
 *   1. Render a 2D white-on-black room-mask canvas (room footprint).
 *   2. Upload mask as a WebGL2 texture.
 *   3. Run the hull extrusion shader: any pixel within ~28 px of a white room
 *      pixel becomes metallic hull; room interior pixels are transparent.
 *
 * The returned canvas is `(roomBounds.w + 2*HULL_PAD) × (roomBounds.h + 2*HULL_PAD)`.
 * Draw it in screen space at `(minRoomPixX − HULL_PAD, minRoomPixY − HULL_PAD)`.
 *
 * Cached once per ship spawn — never regenerated in the render loop.
 */
export class ShipGenerator {
  /**
   * @param rooms   Grid-coordinate room data (from ShipTemplate.rooms).
   * @param faction Faction string used to select the colour palette.
   * @param startX  Ship pixel origin X (passed from ShipFactory.spawnShip).
   * @param startY  Ship pixel origin Y.
   */
  static generateShipSprite(
    rooms:   Array<{ x: number; y: number; width: number; height: number }>,
    faction: string,
    startX:  number,
    startY:  number,
  ): HTMLCanvasElement {
    // ── Bounding box in pixel space ───────────────────────────────────────────
    let minPX = Infinity, minPY = Infinity, maxPX = -Infinity, maxPY = -Infinity;
    for (const r of rooms) {
      const px = startX + r.x * TILE_SIZE;
      const py = startY + r.y * TILE_SIZE;
      minPX = Math.min(minPX, px);
      minPY = Math.min(minPY, py);
      maxPX = Math.max(maxPX, px + r.width  * TILE_SIZE);
      maxPY = Math.max(maxPY, py + r.height * TILE_SIZE);
    }
    const canvasW = Math.ceil(maxPX - minPX) + 2 * HULL_PAD;
    const canvasH = Math.ceil(maxPY - minPY) + 2 * HULL_PAD;

    // ── Room mask: white rectangles on black background ───────────────────────
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width  = canvasW;
    maskCanvas.height = canvasH;
    const mCtx = maskCanvas.getContext('2d');
    if (mCtx !== null) {
      mCtx.fillStyle = '#000000';
      mCtx.fillRect(0, 0, canvasW, canvasH);
      mCtx.fillStyle = '#ffffff';
      for (const r of rooms) {
        const lx = startX + r.x * TILE_SIZE - minPX + HULL_PAD;
        const ly = startY + r.y * TILE_SIZE - minPY + HULL_PAD;
        mCtx.fillRect(lx, ly, r.width * TILE_SIZE, r.height * TILE_SIZE);
      }
    }

    // ── WebGL2 output canvas ─────────────────────────────────────────────────
    const outputCanvas = document.createElement('canvas');
    outputCanvas.width  = canvasW;
    outputCanvas.height = canvasH;

    const gl = outputCanvas.getContext('webgl2', { preserveDrawingBuffer: true });
    if (gl === null) {
      return ShipGenerator.cpuFallback(outputCanvas, canvasW, canvasH, faction);
    }

    // Compile shaders
    const vert = ShipGenerator.compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
    const frag = ShipGenerator.compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
    if (vert === null || frag === null) return outputCanvas;

    // Link program
    const program = gl.createProgram();
    if (program === null) {
      gl.deleteShader(vert); gl.deleteShader(frag);
      return outputCanvas;
    }
    gl.attachShader(program, vert);
    gl.attachShader(program, frag);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('[ShipGenerator] link error:', gl.getProgramInfoLog(program));
      gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return outputCanvas;
    }
    gl.useProgram(program);

    // Fullscreen quad (TRIANGLE_STRIP)
    const buf = gl.createBuffer();
    if (buf === null) {
      gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return outputCanvas;
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'a_pos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Upload mask texture — flip Y so canvas top matches WebGL top
    const tex = gl.createTexture();
    if (tex === null) {
      gl.deleteBuffer(buf); gl.deleteShader(vert); gl.deleteShader(frag); gl.deleteProgram(program);
      return outputCanvas;
    }
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, maskCanvas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    // Uniforms
    const prog = program; // typed const — captures WebGLProgram for closures
    const setV3 = (name: string, v: RGB): void => {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform3fv(loc, v);
    };

    const resLoc  = gl.getUniformLocation(prog, 'u_resolution');
    if (resLoc  !== null) gl.uniform2fv(resLoc, [canvasW, canvasH]);
    const maskLoc = gl.getUniformLocation(prog, 'u_mask');
    if (maskLoc !== null) gl.uniform1i(maskLoc, 0);
    const seedLoc = gl.getUniformLocation(prog, 'u_seed');
    if (seedLoc !== null) gl.uniform1f(seedLoc, Math.floor(Math.random() * 99991));

    const palette = FACTION_PALETTES[faction] ?? DEFAULT_PALETTE;
    setV3('u_hullColor',   palette.hull);
    setV3('u_accentColor', palette.accent);

    // Render
    gl.viewport(0, 0, canvasW, canvasH);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.finish();

    // Clean up GPU objects (framebuffer preserved via preserveDrawingBuffer)
    gl.deleteTexture(tex);
    gl.deleteBuffer(buf);
    gl.deleteShader(vert);
    gl.deleteShader(frag);
    gl.deleteProgram(program);

    return outputCanvas;
  }

  // ── Private helpers ────────────────────────────────────────────────────────

  private static compileShader(
    gl:   WebGL2RenderingContext,
    type: number,
    src:  string,
  ): WebGLShader | null {
    const shader = gl.createShader(type);
    if (shader === null) return null;
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[ShipGenerator] shader compile error:', gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  }

  /** Fallback for environments without WebGL2: solid hull-coloured rectangle. */
  private static cpuFallback(
    canvas:  HTMLCanvasElement,
    w:       number,
    h:       number,
    faction: string,
  ): HTMLCanvasElement {
    const ctx = canvas.getContext('2d');
    if (ctx === null) return canvas;
    const [rv, gv, bv] = (FACTION_PALETTES[faction] ?? DEFAULT_PALETTE).hull;
    ctx.fillStyle = `rgb(${Math.round(rv*255)},${Math.round(gv*255)},${Math.round(bv*255)})`;
    ctx.fillRect(0, 0, w, h);
    return canvas;
  }
}
