We are replacing our CPU-based planet generator with an offscreen WebGL shader implementation inspired by Deep-Fold's Pixel Planet Generator. This will give us true 3D pixel-art planets instantly.

Please read `docs/sprints/SPRINT_36_WEBGL_PIXEL_PLANETS.md`.

**Execution Rules:**
1. **WebGL Boilerplate:** Rewrite `PlanetGenerator.ts`. Set up standard WebGL boilerplate to draw a fullscreen quad (2 triangles). 
2. **The Fragment Shader:** Write the GLSL shader string. It MUST include:
   - UV mapping to a sphere (discarding pixels outside radius 1.0).
   - A noise function (e.g., pseudo-random hash or simple noise) sampled using the 3D sphere normal `vec3(uv.x, uv.y, z)` to avoid stretching at the poles.
   - A step-based color threshold (if noise < 0.5 use Color1, else use Color2).
   - Dithered shading: Calculate a dot product for light, and apply a dithering pattern (using `gl_FragCoord.xy`) to create banded pixel-art shadows.
3. **Uniforms:** Pass `u_color1`, `u_color2`, `u_color3`, and `u_lightColor` (or similar) into the shader based on the requested `PlanetTheme`.
4. Ensure the method returns the canvas synchronously or asynchronously so `RenderSystem` can draw it.
5. Ensure zero TypeScript errors (`tsc --noEmit`).

**Version Control Instructions:**
Once the WebGL generator is creating gorgeous, dithered pixel-art procedural planets offscreen, please stage and commit all changes. Use the commit message: "style: Sprint 36 complete - WebGL GLSL shader procedural pixel-art planets".

Please begin and let me know when the commit is successful!