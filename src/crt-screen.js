// three-crt-screen: an old-TV / giant LED billboard look for any texture (image, canvas or video) in three.js.
// One ShaderMaterial, no post-processing pass, so it works on a mesh in the world (billboards, monitors, arcade cabinets).
// Usage:
//   import * as THREE from 'three';
//   import { createCRTMaterial, updateCRT, CRT_PRESETS } from './crt-screen.js';
//   const mat = createCRTMaterial(THREE, { map: videoTexture, ...CRT_PRESETS.billboard });
//   mesh.material = mat;          // in the render loop: updateCRT(mat, clock.getElapsedTime())
// Every parameter below is a uniform; change it any time with setCRT(mat, { name: value }).
// Optional geometry attributes (handy when many screens are merged into one mesh sharing one material):
//   aSize (vec2) = width, height of each screen in world units, so the picture is fitted per screen
//   aSeed (float) = per-screen random seed, so merged screens glitch independently

// [name, default, min, max, group, description]
export const CRT_PARAMS = [
  // picture
  ['brightness', 1.0, 0, 3, 'picture', 'Overall brightness multiplier before the screen effects.'],
  ['contrast', 1.08, 0, 3, 'picture', 'Contrast around mid grey.'],
  ['saturation', 1.12, 0, 3, 'picture', 'Colour saturation (0 = black and white).'],
  ['gamma', 1.0, .3, 3, 'picture', 'Gamma curve applied to the source picture.'],
  ['gain', 1.0, 0, 6, 'picture', 'Final emission multiplier (raise it so the screen glows / blooms in a lit scene).'],
  // framing: how the picture sits on the screen
  ['fit', 0, 0, 3, 'framing', 'How the picture fills the screen: 0 cover (fill, crop the overflow), 1 contain (whole picture, letterbox bars), 2 stretch (fill, distort), 3 width (fit the width, crop or bar top and bottom).'],
  ['zoom', 1, .1, 5, 'framing', 'Scale the picture inside the screen (above 1 crops in, below 1 shrinks with bars).'],
  ['panX', 0, -1, 1, 'framing', 'Slide the picture sideways (-1 = show its left edge, 1 = its right edge, when there is overflow to pan through).'],
  ['panY', 0, -1, 1, 'framing', 'Slide the picture up / down (-1 = bottom edge, 1 = top edge).'],
  ['flipX', 0, 0, 1, 'framing', '1 = mirror the picture horizontally.'],
  ['flipY', 0, 0, 1, 'framing', '1 = flip the picture vertically.'],
  ['barLevel', 0, 0, 1, 'framing', 'Brightness of the letterbox bars (0 = black, a little above 0 = an unlit panel).'],
  // geometry of the tube
  ['curvature', 0.0, 0, 1, 'tube', 'Barrel distortion of a curved glass tube.'],
  ['vignette', 0.25, 0, 1, 'tube', 'Darkening towards the corners.'],
  ['cornerRadius', 0.03, 0, .3, 'tube', 'Rounded black corners of the tube face.'],
  ['bezel', 0.0, 0, .1, 'tube', 'Black border inset around the picture.'],
  // raster
  ['pixelate', 0.0, 0, 1, 'raster', 'Blend towards a blocky low-resolution picture (see resX / resY).'],
  ['resX', 160, 8, 1920, 'raster', 'Virtual horizontal resolution used by pixelate and the phosphor mask.'],
  ['resY', 120, 8, 1080, 'raster', 'Virtual vertical resolution (also the number of scan lines).'],
  ['scanlines', 0.35, 0, 1, 'raster', 'Darkness of the gaps between scan lines.'],
  ['scanlineScroll', 0.0, -5, 5, 'raster', 'Scan lines crawl up / down (lines per second).'],
  ['maskType', 1, 0, 3, 'raster', 'Phosphor mask: 0 none, 1 aperture grille (RGB stripes), 2 shadow mask (triads), 3 LED dots (billboards).'],
  ['maskStrength', 0.3, 0, 1, 'raster', 'How visible the phosphor / LED mask is.'],
  ['maskScale', 1.0, .25, 4, 'raster', 'Mask cell size relative to the virtual pixel.'],
  ['farFade', 1.0, 0, 1, 'raster', 'Fade scan lines and mask out when they get smaller than a screen pixel (avoids moire at distance).'],
  // interlace
  ['interlace', 0.18, 0, 1, 'interlace', 'Alternate fields: odd and even lines take turns being dim, flipping at fieldRate.'],
  ['fieldRate', 30, 1, 120, 'interlace', 'Field flips per second.'],
  ['deinterlace', 0.0, 0, 1, 'interlace', 'Comb artefacts of a bad de-interlacer: alternate lines shifted sideways.'],
  ['combOffset', 0.006, 0, .05, 'interlace', 'Sideways shift of the combed lines (fraction of screen width).'],
  // signal
  ['rgbSplit', 0.0025, 0, .03, 'signal', 'Red / blue channel offset (chromatic misconvergence).'],
  ['rgbJitter', 0.3, 0, 1, 'signal', 'How much the RGB split jitters over time.'],
  ['bleed', 0.35, 0, 1, 'signal', 'Horizontal colour smear (composite signal / phosphor persistence).'],
  ['glow', 0.35, 0, 2, 'signal', 'Soft halo of the bright parts (phosphor glow inside the glass).'],
  ['hWobble', 0.0012, 0, .02, 'signal', 'Sine wobble of the lines (unstable horizontal sync).'],
  // rolling band
  ['band', 0.18, 0, 1, 'band', 'Strength of the bright horizontal band that rolls down the screen.'],
  ['bandSpeed', 0.07, -1, 1, 'band', 'Screens per second the band travels (negative = upwards).'],
  ['bandWidth', 0.12, .01, 1, 'band', 'Height of the band (fraction of the screen).'],
  ['bandDistort', 0.003, 0, .03, 'band', 'Sideways kink of the picture inside the band.'],
  // noise and flicker
  ['noise', 0.05, 0, 1, 'noise', 'Static grain over the picture.'],
  ['noiseFps', 24, 1, 60, 'noise', 'How often the grain pattern changes.'],
  ['staticBurst', 0.03, 0, 2, 'noise', 'Bursts of full snow per second (lost signal).'],
  ['staticLength', 0.18, .02, 2, 'noise', 'Length of a snow burst in seconds.'],
  ['flicker', 0.04, 0, 1, 'noise', 'Brightness flicker amplitude.'],
  ['flickerSpeed', 9, 0, 60, 'noise', 'Flicker speed.'],
  // glitches
  ['glitch', 0.12, 0, 3, 'glitch', 'Glitch events per second (tearing bands, blocks shifting sideways).'],
  ['glitchStrength', 0.04, 0, .3, 'glitch', 'Sideways offset of torn bands.'],
  ['glitchLength', 0.22, .02, 2, 'glitch', 'Length of a glitch event in seconds.'],
  ['glitchBands', 9, 1, 60, 'glitch', 'Number of horizontal bands a glitch can tear.'],
  ['blockGlitch', 0.4, 0, 1, 'glitch', 'Chance that a glitch also shows displaced square macro blocks (digital corruption).'],
  ['vRoll', 0.01, 0, 1, 'glitch', 'Vertical roll events per second (picture slips upwards once).'],
  ['vRollLength', 0.6, .1, 3, 'glitch', 'Length of a vertical roll in seconds.'],
  // broken panels
  ['deadBlocks', 0.03, 0, 1, 'dead', 'Fraction of broken square blocks (dead LED modules).'],
  ['deadGridX', 16, 1, 128, 'dead', 'Blocks across the screen.'],
  ['deadGridY', 10, 1, 128, 'dead', 'Blocks down the screen.'],
  ['deadFlicker', 0.35, 0, 1, 'dead', 'Share of broken blocks that flicker on and off instead of staying dark.'],
  ['deadStuck', 0.25, 0, 1, 'dead', 'Share of broken blocks stuck on a single colour.'],
  // time
  ['fps', 0, 0, 60, 'time', 'Quantise the effect clock to this frame rate (0 = smooth). 12 gives a stepped anime feel.'],
  ['power', 1, 0, 1, 'time', 'Tube power: animate 0 to 1 for a switch-on (line expands, then the picture), 1 to 0 to switch off.'],
  ['seed', 0, 0, 1000, 'time', 'Per-screen random seed so screens next to each other glitch differently.'],
];

export const CRT_DEFAULTS = Object.fromEntries(CRT_PARAMS.map(p => [p[0], p[1]]));

export const CRT_PRESETS = {
  clean: { scanlines: .12, maskStrength: .1, interlace: 0, band: .05, noise: .01, staticBurst: 0, flicker: .01, glitch: 0, vRoll: 0, deadBlocks: 0, rgbSplit: .001, curvature: 0 },
  crtTV: { curvature: .35, vignette: .45, cornerRadius: .08, scanlines: .5, maskType: 2, maskStrength: .4, interlace: .25, band: .22, noise: .08, flicker: .06, glitch: .05, deadBlocks: 0, rgbSplit: .003 },
  arcade: { curvature: .25, vignette: .35, scanlines: .55, maskType: 1, maskStrength: .45, resY: 240, resX: 320, interlace: 0, band: .1, noise: .03, glitch: 0, deadBlocks: 0, glow: .6 },
  vhs: { scanlines: .25, maskType: 0, bleed: .8, rgbSplit: .006, rgbJitter: .8, hWobble: .004, band: .35, bandSpeed: -.12, bandDistort: .012, noise: .12, glitch: .3, vRoll: .03, deadBlocks: 0, saturation: .85 },
  billboard: { curvature: 0, vignette: .12, cornerRadius: 0, maskType: 3, maskStrength: .35, resX: 192, resY: 108, scanlines: .2, interlace: .15, deinterlace: .25, band: .2, noise: .04, staticBurst: .02, flicker: .05, glitch: .1, deadBlocks: .04, gain: 1.6, fps: 0 },
  broken: { scanlines: .45, interlace: .35, deinterlace: .7, band: .4, bandDistort: .02, noise: .25, staticBurst: .25, staticLength: .4, flicker: .2, glitch: 1.2, glitchStrength: .12, blockGlitch: .8, vRoll: .1, deadBlocks: .18, deadFlicker: .6, rgbSplit: .01 },
};

const CRT_VS = /* glsl */`
attribute vec2 aSize; attribute float aSeed;
uniform float uQuadAspect;
varying vec2 vUv; varying float vQuadAspect; varying vec3 vWorld; varying float vSeedA;
#include <common>
#include <fog_pars_vertex>
void main() {
  vUv = uv; vSeedA = aSeed; vQuadAspect = aSize.y > 0. ? aSize.x / aSize.y : uQuadAspect;
  vec4 wp = modelMatrix * vec4(position, 1.); vWorld = wp.xyz;
  vec4 mvPosition = viewMatrix * wp;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}`;

const CRT_FS = /* glsl */`
uniform sampler2D uMap; uniform float uMapAspect, uTime;
uniform float brightness, contrast, saturation, gamma, gain, fit, zoom, panX, panY, flipX, flipY, barLevel;
uniform float curvature, vignette, cornerRadius, bezel;
uniform float pixelate, resX, resY, scanlines, scanlineScroll, maskType, maskStrength, maskScale, farFade;
uniform float interlace, fieldRate, deinterlace, combOffset;
uniform float rgbSplit, rgbJitter, bleed, glow, hWobble;
uniform float band, bandSpeed, bandWidth, bandDistort;
uniform float noise, noiseFps, staticBurst, staticLength, flicker, flickerSpeed;
uniform float glitch, glitchStrength, glitchLength, glitchBands, blockGlitch, vRoll, vRollLength;
uniform float deadBlocks, deadGridX, deadGridY, deadFlicker, deadStuck;
uniform float fps, power, seed;
float gSeed;
varying vec2 vUv; varying float vQuadAspect; varying vec3 vWorld; varying float vSeedA;
#include <common>
#include <fog_pars_fragment>
float h11(float p) { p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
// random event: returns 0..1 progress while an event of length len is running (rate events per second), else -1
float event(float t, float rate, float len, float salt) {
  if (rate <= 0.) return -1.;
  float slot = max(len * 1.5, 1. / rate), k = floor(t / slot), u = (t - k * slot);
  if (h11(k * 7.13 + salt + gSeed * 3.7) > min(1., rate * slot)) return -1.;
  float st = h11(k * 3.31 + salt * 1.7 + gSeed) * (slot - len);
  return (u >= st && u < st + len) ? (u - st) / len : -1.;
}
// screen uv -> picture uv. s = visible fraction of the picture along x / y (1 = exactly fits; < 1 = cropped; > 1 = bars)
vec2 fitUV(vec2 uv) {
  float qa = vQuadAspect, ma = uMapAspect; vec2 s;
  if (fit < .5) s = qa > ma ? vec2(1., ma / qa) : vec2(qa / ma, 1.);
  else if (fit < 1.5) s = qa > ma ? vec2(qa / ma, 1.) : vec2(1., ma / qa);
  else if (fit < 2.5) s = vec2(1.);
  else s = vec2(1., ma / qa);
  s /= max(zoom, .01);
  // pan through the overflow (only where the picture is bigger than the screen)
  vec2 slack = max(1. - s, 0.) * .5;
  vec2 m = (uv - .5) * s + .5 + vec2(panX, panY) * slack;
  if (flipX > .5) m.x = 1. - m.x;
  if (flipY > .5) m.y = 1. - m.y;
  return m;
}
vec3 tap(vec2 uv) { vec2 m = fitUV(uv); if (m.x < 0. || m.x > 1. || m.y < 0. || m.y > 1.) return vec3(barLevel * barLevel); return texture2D(uMap, m).rgb; }
void main() {
  gSeed = seed + vSeedA;
  float t = fps > 0. ? floor(uTime * fps) / fps : uTime;
  vec2 uv = vUv;
  // tube curvature
  vec2 cc = uv * 2. - 1.; cc *= 1. + curvature * .25 * vec2(cc.y * cc.y, cc.x * cc.x); uv = cc * .5 + .5;
  vec2 q = abs(uv - .5) * 2.;
  if (q.x > 1. || q.y > 1.) { gl_FragColor = vec4(0., 0., 0., 1.); return; }
  // power: the picture collapses to a bright line and dot when switched off
  float pw = clamp(power, 0., 1.), py = smoothstep(.0, .6, pw), px = smoothstep(.0, .25, pw);
  uv.y = (uv.y - .5) / max(py, .002) + .5;
  // vertical roll
  float vr = event(t, vRoll, vRollLength, 11.); if (vr >= 0.) uv.y = fract(uv.y + smoothstep(0., 1., vr));
  // rolling band position
  float bp = fract(t * bandSpeed + gSeed * .37); float bd = abs(fract(uv.y - (1. - bp)) - .5); float inBand = smoothstep(bandWidth * .5, 0., abs(.5 - bd));
  uv.x += inBand * bandDistort * sin(uv.y * 60. + t * 10.);
  // horizontal sync wobble
  uv.x += sin(uv.y * 90. + t * 7.) * hWobble;
  // glitch: tearing bands and displaced macro blocks
  float ge = event(t, glitch, glitchLength, 23.); float gOn = ge >= 0. ? 1. : 0.;
  if (ge >= 0.) {
    float b = floor(uv.y * glitchBands), gk = floor(t * 24.);
    float r = h21(vec2(b, gk + gSeed));
    if (r < .45) uv.x += (h21(vec2(b + 3., gk)) - .5) * 2. * glitchStrength;
    if (h11(floor(t / max(glitchLength, .02)) + gSeed) < blockGlitch) {
      vec2 bc = floor(uv * vec2(deadGridX, deadGridY) * .5); float br = h21(bc + gk * .13 + gSeed);
      if (br < .18) uv += (vec2(h21(bc + 1.7), h21(bc + 9.2)) - .5) * .12;
    }
  }
  // interlace / deinterlace
  float line = floor((uv.y + t * scanlineScroll / resY) * resY), field = mod(floor(t * fieldRate), 2.), odd = mod(line, 2.);
  float comb = deinterlace * (odd == field ? 1. : -1.) * combOffset * (.5 + .5 * sin(t * 3.1 + gSeed));
  uv.x += comb;
  // pixelate to the virtual resolution
  vec2 res = vec2(resX, resY);
  vec2 uvp = (floor(uv * res) + .5) / res; uv = mix(uv, uvp, pixelate);
  // sample with RGB split + horizontal bleed
  float js = rgbSplit * (1. + rgbJitter * (h11(floor(t * 20.) + gSeed) - .5) * 2. + gOn * 3.);
  vec3 col;
  col.r = tap(uv + vec2(js, 0.)).r; col.g = tap(uv).g; col.b = tap(uv - vec2(js, 0.)).b;
  if (bleed > 0.) { vec3 s = tap(uv - vec2(1.5 / resX, 0.)) * .5 + tap(uv - vec2(3. / resX, 0.)) * .3 + tap(uv - vec2(5. / resX, 0.)) * .2; col = mix(col, max(col, s * .95), bleed * .6); }
  if (glow > 0.) { vec3 g = vec3(0.); for (int i = 0; i < 8; i++) { float a = float(i) * .785; g += tap(uv + vec2(cos(a) * 6. / resX, sin(a) * 6. / resY)); } g /= 8.; col += g * g * glow; }
  // grade
  col = pow(max(col, 0.), vec3(1. / max(gamma, .01)));
  col = (col - .5) * contrast + .5; float l = dot(col, vec3(.299, .587, .114)); col = mix(vec3(l), col, saturation); col = max(col * brightness, 0.);
  // scan lines, interlace fields and the phosphor / LED mask, faded where they get smaller than a screen pixel
  float lpx = fwidth(vUv.y * resY); float far = mix(0., smoothstep(.35, .9, lpx), farFade);
  float sl = .5 + .5 * cos(((vUv.y + t * scanlineScroll / resY) * resY) * 6.2831853);
  col *= 1. - scanlines * (1. - sl) * (1. - far);
  col *= 1. - interlace * (odd == field ? 1. : 0.) * (1. - far);
  if (maskType > .5 && maskStrength > 0.) {
    vec2 mp = vUv * res * 3. / maskScale; vec3 m = vec3(1.);
    if (maskType < 1.5) { float k = mod(floor(mp.x), 3.); m = vec3(k < .5 ? 1. : .25, k > .5 && k < 1.5 ? 1. : .25, k > 1.5 ? 1. : .25); }
    else if (maskType < 2.5) { float k = mod(floor(mp.x + floor(mp.y / 3.) * 1.5), 3.); m = vec3(k < .5 ? 1. : .3, k > .5 && k < 1.5 ? 1. : .3, k > 1.5 ? 1. : .3); }
    else { vec2 f = fract(vUv * res / maskScale) - .5; float d = length(f); float dot1 = 1. - smoothstep(.32, .46, d); m = vec3(mix(.15, 1.45, dot1)); }
    float avg = maskType > 2.5 ? .6 : .5;
    col *= mix(vec3(1.), m / (maskType > 2.5 ? 1. : avg * 1.5), maskStrength * (1. - far));
  }
  // rolling bright band
  col *= 1. + band * inBand;
  // dead / flickering / stuck LED blocks
  if (deadBlocks > 0.) {
    vec2 dc = floor(vUv * vec2(deadGridX, deadGridY)); float dr = h21(dc + gSeed * 1.37);
    if (dr < deadBlocks) {
      float kind = h21(dc + 41.3 + gSeed);
      if (kind < deadStuck) col = vec3(h21(dc + 2.), h21(dc + 5.), h21(dc + 8.)) * vec3(1., .2, .9) * .8;
      else if (kind < deadStuck + deadFlicker) col *= step(.5, h11(floor(t * (6. + 20. * h21(dc + 3.))) + dr * 50.));
      else col *= .02;
    }
  }
  // static grain and snow bursts
  float nk = floor(t * noiseFps); float n = h21(floor(vUv * vec2(resX, resY) * 2.) + nk * 1.31 + gSeed);
  col *= 1. + (n - .5) * noise * 2.; col += (n - .5) * noise * .1;   // grain scales with the picture so blacks stay black-ish (the maths runs in linear light)
  float sb = event(t, staticBurst, staticLength, 37.); if (sb >= 0.) { float s = sin(sb * 3.14159); col = mix(col, vec3(n * n * .8 + .02), s * .9); }
  // flicker
  col *= 1. - flicker * (.5 + .5 * sin(t * flickerSpeed * 6.28 + gSeed)) * (.6 + .4 * h11(floor(t * 30.)));
  // vignette, rounded corners, bezel
  vec2 vq = vUv - .5; col *= 1. - vignette * dot(vq, vq) * 2.5;
  vec2 cq = max(q - (1. - cornerRadius * 2.), 0.); if (length(cq) > cornerRadius * 2. && cornerRadius > 0.) col = vec3(0.);
  if (q.x > 1. - bezel * 2. || q.y > 1. - bezel * 2.) col = vec3(0.);
  // power line / dot
  if (pw < .999) { float lineY = 1. - smoothstep(0., .02 + py * .5, abs(vUv.y - .5)); col = mix(vec3(1.2) * lineY * smoothstep(0., 1., abs(.5 - vUv.x) < px * .5 ? 1. : 0.), col, py); }
  gl_FragColor = vec4(col * gain, 1.);
  #include <colorspace_fragment>
  #include <fog_fragment>
}`;

// opts: any CRT_PARAMS name, plus map (texture), mapAspect (width / height of the source; read from the image if omitted),
// quadAspect (screen width / height when the geometry has no aSize attribute), fog (default true).
export function createCRTMaterial(THREE, opts = {}) {
  const u = { uMap: { value: opts.map || null }, uMapAspect: { value: opts.mapAspect || 1 }, uQuadAspect: { value: opts.quadAspect || 1 }, uTime: { value: 0 } };
  for (const [k, d] of CRT_PARAMS) u[k] = { value: opts[k] != null ? opts[k] : d };
  const fog = opts.fog !== false;
  const mat = new THREE.ShaderMaterial({ uniforms: fog ? THREE.UniformsUtils.merge([THREE.UniformsLib.fog, u]) : u, vertexShader: CRT_VS, fragmentShader: CRT_FS, fog });
  if (fog) mat.uniforms.uMap.value = opts.map || null;
  mat.customProgramCacheKey = () => 'crt-screen-1';
  mat.userData.crt = true;
  if (opts.map && !opts.mapAspect) watchAspect(mat, opts.map);
  return mat;
}
// read the real aspect of an image / video texture once it has loaded
function watchAspect(mat, tex) {
  const set = () => { const i = tex.image; if (!i) return false; const w = i.videoWidth || i.naturalWidth || i.width, h = i.videoHeight || i.naturalHeight || i.height; if (w && h) { mat.uniforms.uMapAspect.value = w / h; return true; } return false; };
  if (set()) return; const im = tex.image;
  if (im && im.addEventListener) { im.addEventListener('loadedmetadata', set); im.addEventListener('load', set); }
  else { let n = 0; const iv = setInterval(() => { if (set() || ++n > 100) clearInterval(iv); }, 100); }
}
export function setCRT(mat, params) { for (const k in params) { if (mat.uniforms[k]) mat.uniforms[k].value = params[k]; else if (k === 'map') { mat.uniforms.uMap.value = params.map; watchAspect(mat, params.map); } } return mat; }
export function updateCRT(mat, time) { mat.uniforms.uTime.value = time; }
