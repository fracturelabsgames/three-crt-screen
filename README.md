# three-crt-screen

An old-TV / giant LED billboard look for any image, canvas or video texture in [three.js](https://threejs.org). It is a single `ShaderMaterial`, not a post-processing pass, so it goes on any mesh in your world: billboards on skyscrapers, monitors in a room, an arcade cabinet, a TV in a cutscene.

Scan lines, interlaced fields, de-interlace combing, a bright band rolling down the screen, RGB split, colour bleed, phosphor glow, aperture grille / shadow mask / LED dot masks, static grain and snow bursts, flicker, tearing glitches with displaced macro blocks, vertical roll, dead / flickering / stuck LED modules, tube curvature, vignette, rounded corners and a switch-on / switch-off animation. Every effect is a uniform you can animate.

Built for [Akuma Tenshi](https://fracturelabs.net) by Fracture Labs. MIT licensed.

**See it in action:** [video on X](https://x.com/GameFoundryNet/status/2113627011835215946)

## Quick start

```js
import * as THREE from 'three';
import { createCRTMaterial, updateCRT, setCRT, CRT_PRESETS } from './src/crt-screen.js';

const video = document.createElement('video');
video.src = 'clip.mp4'; video.muted = true; video.loop = true; video.playsInline = true; video.play();
const tex = new THREE.VideoTexture(video); tex.colorSpace = THREE.SRGBColorSpace;

const mat = createCRTMaterial(THREE, { map: tex, ...CRT_PRESETS.billboard });
const screen = new THREE.Mesh(new THREE.PlaneGeometry(16, 9), mat);
scene.add(screen);

renderer.setAnimationLoop(() => {
  updateCRT(mat, performance.now() / 1000);
  renderer.render(scene, camera);
});

// change anything later
setCRT(mat, { glitch: 1.5, deadBlocks: .1 });
```

`createCRTMaterial(THREE, options)` takes any parameter below plus:

| Option | Meaning |
|---|---|
| `map` | The picture: `Texture`, `CanvasTexture` or `VideoTexture`. Set `colorSpace = THREE.SRGBColorSpace` on it. |
| `mapAspect` | Width / height of the source. Read from the image or video once it loads if you leave it out. |
| `quadAspect` | Width / height of the screen mesh, used when the geometry has no `aSize` attribute. |
| `fog` | `true` (default) so distant screens fade into scene fog. |

The picture is fitted to the screen, so one clip can play on screens of different shapes. `fit` picks the mode: 0 cover (fill and crop), 1 contain (show it all, with bars), 2 stretch, 3 fit width. `zoom`, `panX` / `panY` and `flipX` / `flipY` fine-tune the framing, and `barLevel` sets the colour of the bars. For a wide logo on a 16:9 screen, use contain, or give the screen the picture's own proportions.

### Many screens, one draw call

Merge any number of screen quads into one geometry and give each vertex two optional attributes:

- `aSize` (vec2): that screen's width and height, so the picture is fitted per screen.
- `aSeed` (float): that screen's random seed, so screens that share the material still glitch at different times.

## Demo

Open `examples/index.html` through any local web server (for example `npx serve` in the repo folder). Drop an image or video on the page, pick a preset and tweak every parameter live. "screen shape" switches the screen between common aspect ratios or matches it to the loaded picture. "copy settings" puts the current values on the clipboard as JSON, ready to paste into `createCRTMaterial`.

## Presets

| Preset | Look |
|---|---|
| `clean` | A modern, well-tuned screen: faint scan lines, no faults. |
| `crtTV` | A curved home TV: rounded corners, shadow mask, interlace, rolling band. |
| `arcade` | 240p arcade monitor: strong scan lines, aperture grille, phosphor glow. |
| `vhs` | Tape playback: colour bleed, wobble, tracking band, occasional rolls. |
| `billboard` | Giant city LED wall: LED dots, dead modules, combing, the odd glitch. Pair with a high gain so it blooms. |
| `broken` | A dying screen: constant glitches, snow bursts, many dead blocks. |

Use them as a starting point: `createCRTMaterial(THREE, { map, ...CRT_PRESETS.vhs, noise: .2 })`.

## Parameters

All parameters are uniforms on the material (`mat.uniforms.name.value`), also listed in code as `CRT_PARAMS` (name, default, min, max, group, description), handy for building your own UI.

### Picture

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `brightness` | 1 | 0 to 3 | Overall brightness multiplier before the screen effects. |
| `contrast` | 1.08 | 0 to 3 | Contrast around mid grey. |
| `saturation` | 1.12 | 0 to 3 | Colour saturation (0 = black and white). |
| `gamma` | 1 | 0.3 to 3 | Gamma curve applied to the source picture. |
| `gain` | 1 | 0 to 6 | Final emission multiplier (raise it so the screen glows / blooms in a lit scene). |

### Framing (fit, zoom, pan, flip)

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `fit` | 0 | 0 to 3 | How the picture fills the screen: 0 cover (fill, crop the overflow), 1 contain (whole picture, letterbox bars), 2 stretch (fill, distort), 3 width (fit the width, crop or bar top and bottom). |
| `zoom` | 1 | 0.1 to 5 | Scale the picture inside the screen (above 1 crops in, below 1 shrinks with bars). |
| `panX` | 0 | -1 to 1 | Slide the picture sideways (-1 = show its left edge, 1 = its right edge, when there is overflow to pan through). |
| `panY` | 0 | -1 to 1 | Slide the picture up / down (-1 = bottom edge, 1 = top edge). |
| `flipX` | 0 | 0 to 1 | 1 = mirror the picture horizontally. |
| `flipY` | 0 | 0 to 1 | 1 = flip the picture vertically. |
| `barLevel` | 0 | 0 to 1 | Brightness of the letterbox bars (0 = black, a little above 0 = an unlit panel). |

### Tube shape

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `curvature` | 0 | 0 to 1 | Barrel distortion of a curved glass tube. |
| `vignette` | 0.25 | 0 to 1 | Darkening towards the corners. |
| `cornerRadius` | 0.03 | 0 to 0.3 | Rounded black corners of the tube face. |
| `bezel` | 0 | 0 to 0.1 | Black border inset around the picture. |

### Raster, scan lines and phosphor mask

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `pixelate` | 0 | 0 to 1 | Blend towards a blocky low-resolution picture (see resX / resY). |
| `resX` | 160 | 8 to 1920 | Virtual horizontal resolution used by pixelate and the phosphor mask. |
| `resY` | 120 | 8 to 1080 | Virtual vertical resolution (also the number of scan lines). |
| `scanlines` | 0.35 | 0 to 1 | Darkness of the gaps between scan lines. |
| `scanlineScroll` | 0 | -5 to 5 | Scan lines crawl up / down (lines per second). |
| `maskType` | 1 | 0 to 3 | Phosphor mask: 0 none, 1 aperture grille (RGB stripes), 2 shadow mask (triads), 3 LED dots (billboards). |
| `maskStrength` | 0.3 | 0 to 1 | How visible the phosphor / LED mask is. |
| `maskScale` | 1 | 0.25 to 4 | Mask cell size relative to the virtual pixel. |
| `farFade` | 1 | 0 to 1 | Fade scan lines and mask out when they get smaller than a screen pixel (avoids moire at distance). |

### Interlacing

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `interlace` | 0.18 | 0 to 1 | Alternate fields: odd and even lines take turns being dim, flipping at fieldRate. |
| `fieldRate` | 30 | 1 to 120 | Field flips per second. |
| `deinterlace` | 0 | 0 to 1 | Comb artefacts of a bad de-interlacer: alternate lines shifted sideways. |
| `combOffset` | 0.006 | 0 to 0.05 | Sideways shift of the combed lines (fraction of screen width). |

### Signal

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `rgbSplit` | 0.0025 | 0 to 0.03 | Red / blue channel offset (chromatic misconvergence). |
| `rgbJitter` | 0.3 | 0 to 1 | How much the RGB split jitters over time. |
| `bleed` | 0.35 | 0 to 1 | Horizontal colour smear (composite signal / phosphor persistence). |
| `glow` | 0.35 | 0 to 2 | Soft halo of the bright parts (phosphor glow inside the glass). |
| `hWobble` | 0.0012 | 0 to 0.02 | Sine wobble of the lines (unstable horizontal sync). |

### Rolling band

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `band` | 0.18 | 0 to 1 | Strength of the bright horizontal band that rolls down the screen. |
| `bandSpeed` | 0.07 | -1 to 1 | Screens per second the band travels (negative = upwards). |
| `bandWidth` | 0.12 | 0.01 to 1 | Height of the band (fraction of the screen). |
| `bandDistort` | 0.003 | 0 to 0.03 | Sideways kink of the picture inside the band. |

### Noise and flicker

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `noise` | 0.05 | 0 to 1 | Static grain over the picture. |
| `noiseFps` | 24 | 1 to 60 | How often the grain pattern changes. |
| `staticBurst` | 0.03 | 0 to 2 | Bursts of full snow per second (lost signal). |
| `staticLength` | 0.18 | 0.02 to 2 | Length of a snow burst in seconds. |
| `flicker` | 0.04 | 0 to 1 | Brightness flicker amplitude. |
| `flickerSpeed` | 9 | 0 to 60 | Flicker speed. |

### Glitches

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `glitch` | 0.12 | 0 to 3 | Glitch events per second (tearing bands, blocks shifting sideways). |
| `glitchStrength` | 0.04 | 0 to 0.3 | Sideways offset of torn bands. |
| `glitchLength` | 0.22 | 0.02 to 2 | Length of a glitch event in seconds. |
| `glitchBands` | 9 | 1 to 60 | Number of horizontal bands a glitch can tear. |
| `blockGlitch` | 0.4 | 0 to 1 | Chance that a glitch also shows displaced square macro blocks (digital corruption). |
| `vRoll` | 0.01 | 0 to 1 | Vertical roll events per second (picture slips upwards once). |
| `vRollLength` | 0.6 | 0.1 to 3 | Length of a vertical roll in seconds. |

### Broken blocks

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `deadBlocks` | 0.03 | 0 to 1 | Fraction of broken square blocks (dead LED modules). |
| `deadGridX` | 16 | 1 to 128 | Blocks across the screen. |
| `deadGridY` | 10 | 1 to 128 | Blocks down the screen. |
| `deadFlicker` | 0.35 | 0 to 1 | Share of broken blocks that flicker on and off instead of staying dark. |
| `deadStuck` | 0.25 | 0 to 1 | Share of broken blocks stuck on a single colour. |

### Time and power

| Parameter | Default | Range | What it does |
|---|---|---|---|
| `fps` | 0 | 0 to 60 | Quantise the effect clock to this frame rate (0 = smooth). 12 gives a stepped anime feel. |
| `power` | 1 | 0 to 1 | Tube power: animate 0 to 1 for a switch-on (line expands, then the picture), 1 to 0 to switch off. |
| `seed` | 0 | 0 to 1000 | Per-screen random seed so screens next to each other glitch differently. |

## Tips

- **Bloom.** Raise `gain` above 1 so the screen emits light; with an `UnrealBloomPass` the bright parts glow like a real panel.
- **Distance.** `farFade` fades scan lines and the mask out when they get smaller than a screen pixel, which avoids moire on screens far away. Keep it at 1 for screens in the world.
- **Stepped animation.** `fps: 12` steps the effect clock, which suits cel-shaded or anime styles.
- **Switch on / off.** Tween `power` from 0 to 1 (on) or 1 to 0 (off) over about half a second.

## Source media: keep it small

Animated GIF is a poor format for video (256 colours per frame, no inter-frame compression). Convert clips to H.264 MP4 and play them through a `VideoTexture`:

```
ffmpeg -i clip.gif -vf "fps=12,scale=320:-2:flags=lanczos" -c:v libx264 -pix_fmt yuv420p -crf 30 -preset slow -movflags +faststart -an clip.mp4
```

Typical results on 320 px clips: a 28 MB GIF becomes about 570 KB, a 10 MB GIF about 75 KB. The CRT effects hide compression artefacts, so 240 to 480 px wide and CRF 28 to 32 is plenty. Use a JPG of the first frame as a poster while the video loads.

## License

MIT, see `LICENSE`.
