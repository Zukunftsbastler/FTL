/**
 * Generates procedural hexagonal shield textures using a temporary WebGL2 context.
 *
 * Each texture is generated once (512×512) and cached by faction.
 * The shield sprite shows a circular Fresnel edge glow + hex-grid line pattern.
 * Call `pregenerateShields()` once at game init, then fetch via `getShieldTexture()`.
 */

// ── GLSL sources ──────────────────────────────────────────────────────────────

const VERT_SRC = `#version 300 es
in vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }`;

const FRAG_SRC = `#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform vec3 u_color;
out vec4 outColor;

// Returns offset from the nearest hex cell centre.
// Standard 2D hex tiling: two offset grids of parallelograms.
vec2 hexNearest(vec2 p) {
  const vec2 step = vec2(1.0, 1.732);          // (1, sqrt(3))
  vec2 a = mod(p,              step) - step * 0.5;
  vec2 b = mod(p - step * 0.5, step) - step * 0.5;
  return dot(a, a) < dot(b, b) ? a : b;
}

void main() {
  vec2  uv  = gl_FragCoord.xy / u_resolution;
  float d   = length(uv - 0.5) * 2.0;          // 0 = centre, 1 = rim

  if (d > 1.0) discard;                         // circular mask

  // Fresnel: nearly zero at centre, bright at rim.
  float edgeGlow = pow(d, 4.0);

  // Hex grid lines: distance to the nearest hex cell centre in tiled space.
  float hexScale = 6.0;
  vec2  hv       = hexNearest(uv * hexScale);
  float hexDist  = length(hv);
  // Line: bright where hexDist is small (near cell boundary), dark inside.
  float hexLine  = 1.0 - smoothstep(0.38, 0.44, hexDist);

  float alpha = clamp(edgeGlow * 0.85 + hexLine * 0.45, 0.0, 1.0);
  if (alpha < 0.01) discard;

  // HDR colour: allow values >1 for an over-bright additive look.
  vec3 col = u_color * (edgeGlow * 1.5 + hexLine * 0.7);
  outColor  = vec4(clamp(col, 0.0, 2.0), alpha);
}`;

// ── Per-faction color palette ─────────────────────────────────────────────────

interface FactionConfig {
  color: [number, number, number];
}

const CONFIGS: Record<string, FactionConfig> = {
  PLAYER: { color: [0.00, 0.80, 1.00] },  // cyan-blue
  ENEMY:  { color: [1.00, 0.25, 0.00] },  // red-orange
};

// ── Canvas size ───────────────────────────────────────────────────────────────

const TEXTURE_SIZE = 512;

// ── Cache ─────────────────────────────────────────────────────────────────────

const shieldCache = new Map<string, HTMLCanvasElement>();

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Pre-renders shield textures for all known factions.
 * Call once during game initialisation before the first combat frame.
 */
export function pregenerateShields(): void {
  for (const faction of Object.keys(CONFIGS)) {
    if (!shieldCache.has(faction)) {
      const tex = buildShieldTexture(faction);
      if (tex !== null) shieldCache.set(faction, tex);
    }
  }
}

/**
 * Returns the cached shield sprite canvas for the given faction ('PLAYER' or 'ENEMY').
 * Returns `undefined` if `pregenerateShields()` has not been called yet.
 */
export function getShieldTexture(faction: string): HTMLCanvasElement | undefined {
  return shieldCache.get(faction);
}

// ── Internal WebGL pipeline ───────────────────────────────────────────────────

function buildShieldTexture(faction: string): HTMLCanvasElement | null {
  const cfg = CONFIGS[faction];
  if (cfg === undefined) return null;

  // Temporary offscreen WebGL2 canvas — discarded after generation.
  const glCanvas = document.createElement('canvas');
  glCanvas.width  = TEXTURE_SIZE;
  glCanvas.height = TEXTURE_SIZE;

  const gl = glCanvas.getContext('webgl2', {
    antialias:             false,
    alpha:                 true,
    premultipliedAlpha:    false,
    preserveDrawingBuffer: true,   // required for ctx2d.drawImage readback
  }) as WebGL2RenderingContext | null;

  if (gl === null) {
    console.warn('ShieldGenerator: WebGL2 unavailable — using blank fallback.');
    return makeFallback();
  }

  // Compile and link shader program.
  const vert = compileShader(gl, gl.VERTEX_SHADER,   VERT_SRC);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (vert === null || frag === null) return makeFallback();

  const prog = gl.createProgram();
  if (prog === null) return makeFallback();
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('ShieldGenerator link error:', gl.getProgramInfoLog(prog));
    return makeFallback();
  }
  gl.useProgram(prog);

  // Fullscreen quad [-1,1]×[-1,1].
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
  const aPos = gl.getAttribLocation(prog, 'a_pos');
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  // Set uniforms.
  gl.uniform2f(gl.getUniformLocation(prog, 'u_resolution'), TEXTURE_SIZE, TEXTURE_SIZE);
  gl.uniform3fv(gl.getUniformLocation(prog, 'u_color'), cfg.color);

  // Render.
  gl.viewport(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
  gl.clearColor(0, 0, 0, 0);
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  gl.finish();   // ensure rendering is complete before readback

  // Copy to a plain 2D canvas for long-term caching.
  const out    = document.createElement('canvas');
  out.width    = TEXTURE_SIZE;
  out.height   = TEXTURE_SIZE;
  const ctx2d  = out.getContext('2d');
  if (ctx2d !== null) ctx2d.drawImage(glCanvas, 0, 0);

  // Release the temporary WebGL context to free GPU resources.
  const ext = gl.getExtension('WEBGL_lose_context');
  ext?.loseContext();

  return out;
}

function compileShader(gl: WebGL2RenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (shader === null) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error('ShieldGenerator shader compile error:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function makeFallback(): HTMLCanvasElement {
  const c    = document.createElement('canvas');
  c.width    = TEXTURE_SIZE;
  c.height   = TEXTURE_SIZE;
  return c;
}
