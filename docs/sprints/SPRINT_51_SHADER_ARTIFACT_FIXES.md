# SPRINT 51: Shader Artifact Fixes & Aspect Ratio

## 1. Sprint Objective
**To the AI Assistant:** The user reported that the `BackgroundGenerator.ts` shader produces repeating 10x10 square artifacts and no fluid spirals. This is caused by the `hash(vec3 p)` function; the specific decimal multipliers (`127.1`, etc.) collapse into integers every 10 pixels, causing `fract` to return 0 and creating a repeating tile effect. We need to replace the hash function with a robust alternative. Additionally, the galaxy currently stretches elliptically on widescreen resolutions; we must correct the aspect ratio.

## 2. Tasks

### A. Replace the Hash Function (`BackgroundGenerator.ts`)
* **The Fix:** In the `FRAG_SRC` string, replace the entire `hash(vec3 p)` function with the more stable Dave Hoskins Hash13 implementation.
* **Code to use:**
  ```glsl
  float hash(vec3 p) {
    vec3 p3  = fract(p * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
  }
  ```
###  B. Correct the Galaxy Aspect Ratio (BackgroundGenerator.ts)

The Problem: v_uv is an NDC space [-1, 1]. On a 16:9 screen, length(v_uv) creates a horizontally stretched ellipse.
The Fix: In the STANDARD: seeded spiral galaxy block inside FRAG_SRC, multiply p.x by the aspect ratio before calculating length/angle.
Code adjustment:

OpenGL Shading Language
vec2 p = v_uv;
p.x *= u_resolution.x / u_resolution.y; // Aspect ratio correction
float dist = length(p);
float angle = atan(p.y, p.x);
## 3. Success Criteria
The stars generate organically without forming repeating 10x10 grids.
The spiral galaxy renders as a perfect circle/spiral, regardless of the browser window's dimensions.
No TypeScript errors.