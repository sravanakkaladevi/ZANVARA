# Procedural bridal collection

The collection contains all 16 pairings of four styles and four lengths. Each style
owns its motif, pendant and drop builders. Repeated plates, bezels, stones, granules,
pearls, bells, chain links and cord sections are instanced. No necklace image
textures, GLB models, lights or dependencies were added.

## Editing and API

`VARIANTS` in `lib/store.js` supplies the palette, style, length, name and display
metadata. `Necklace({ mats, chainMat, state, flares = true, piece })` retains its
existing entry point. `state.drape`, `ny`, `nz` and `upright` retain their meanings.
The Stage keeps separate incoming and resident descriptors; it changes the
resident geometry and palette synchronously at the flight hand-off.

`cardFrame(length)` is shared by cards and the flight. A temporary perspective
shear maps the source card's projection exactly into the Stage viewport, then
relaxes before landing. Outgoing pieces rise clear of the neck before moving
sideways. Incoming pieces finish with a vertical descent. Lift heights depend on
length.

The visible bust and fitting code share `bustProfile()` and `BUST_TRANSFORM` in
`assets.js`. Paths interpolate that tessellated profile. Full relief/fringe bounds
are fitted along surface normals. The nominal path clearance is 0.045 units; the
rendered geometry checks find minimum physical clearances of approximately
0.035–0.039 units. Opera pieces fold into a figure-eight with a raised crossover.
The case has a recessed velvet bed, providing room below the closed lid.

Sixteen catalogue stills are saved in `public/collection/<style>-<length>.png`.
They are native renders of the full-detail procedural models at 2048 × 2048,
with transparent backgrounds and no bust, text or props. Their PNG dimensions
and alpha channels are checked in `tmp/catalogue-qa/exports.json`.

## Rendering budget

Counts are measured with `WebGLRenderer.info`, rendering an isolated opera piece
with the studio environment and lighting. They include gemstone transmission
passes. Shorter lengths use the same batches with fewer instances.

| Style | Instanced batches | Card / flyer draw calls | Resident, including glints |
| --- | ---: | ---: | ---: |
| Temple | 10 | 18 | 19 |
| Kundan & Jadau | 10 | 18 | 19 |
| Guttapusalu | 8 | 14 | 15 |
| Haram & Mango Mala | 10 | 18 | 19 |

The rail mounts at most four pieces, including both navigation neighbours.
Cards are sized to show three previews on a typical laptop and two on a phone,
keeping the next neighbour available outside the visible rail.
Intersection observers hide offscreen miniatures. Static matrices only rebuild
when the piece or drape changes; dangling clusters alone animate each frame.
The concealed resident is hidden when the case closes. Conservative instance
bounds cull necklaces outside the camera. The transmission buffer renders at
half resolution; bevelled outlines and principal gemstones retain their detail.
Small previews use cached geometry with fewer subdivisions, retaining every
motif, stone and fringe cluster. Their poses use the full-detail fitting envelope.
The flyer switches to full detail above the viewport, before its descent. The
framebuffer also adapts down to DPR 0.6 if measured throughput falls below 57 fps,
preserving the geometry and materials while reducing pixel cost on slower GPUs.

## Checks

Run `node scripts/verify-jewellery.mjs` to check every combination against the
actual rendered instance vertices. It covers metadata, complete pairing coverage,
bust penetration, fringe sway, vertical lift samples, card framing across its
maximum sway, flat case bounds, the velvet floor and the closed lid.

`npm run build` passes. Development Chrome checks cover incoming flights for all
four lengths, previous/next navigation, all 16 filter pairings, navigation within
filtered results, all four flat layouts, case closing, desktop and mobile layouts.
No browser errors were observed. R3F still emits Three.js's upstream `Clock`
deprecation warning.

Development-only `window.__jewellery` exposes geometry reports, GPU draw counts,
flight clearance, take-off projection error and current resident/flyer descriptors.
It is excluded from production. Browser captures and raw measurements are in
`tmp/catalogue-qa/`; these are local QA artifacts.

Performance was measured in a 1440 × 1000 viewport in headless Chrome using Intel
Iris Xe / D3D11. The latest complete development run, with preview tessellation
and adaptive DPR at 0.6, measured 16.9 ms median (about 59 fps) and 33.5 ms at the
95th percentile. Take-off mismatch was below 0.02 pixels in all four flights.
The earlier implementation measured 33.4 ms median and 51 ms at the 95th
percentile. Occasional refreshes are still missed; sustained 60 fps on every
laptop is not a guarantee. The resolution reduction affects the WebGL canvas;
HTML text and controls retain the display's full resolution.

`tmp/catalogue-qa/results.json` contains the latest complete browser run.
`performance.json` and `production-performance.json` contain separate timing runs.
The production run measured 17.1 ms median after adaptation to DPR 0.6, with
33.4–33.5 ms at the 95th percentile. During initial adaptation, it measured
32.9 ms at DPR 0.7. These timings predate the final wall-clock sampling adjustment.

## Files changed for this implementation

```text
README.md
app/globals.css
app/layout.jsx
lib/store.js
lib/choreography.js
components/Experience.jsx
components/sections/Atelier.jsx
components/sections/Details.jsx
components/sections/Footer.jsx
components/sections/Hero.jsx
components/sections/Keepsake.jsx
components/sections/Manifesto.jsx
components/sections/Models.jsx
components/sections/Nav.jsx
components/sections/Numbers.jsx
components/sections/Preloader.jsx
components/sections/Promise.jsx
components/three/assets.js
components/three/Display.jsx
components/three/env.jsx
components/three/Minis.jsx
components/three/Necklace.jsx
components/three/Stage.jsx
components/three/jewelleryGeometry.js
components/three/necklacePaths.js
components/three/necklaceRig.js
components/three/necklaceChecks.js
components/three/jewelleryDiagnostics.js
scripts/verify-jewellery.mjs
docs/jewellery-system.md
public/collection/temple-choker.png
public/collection/temple-collar.png
public/collection/temple-princess.png
public/collection/temple-opera.png
public/collection/kundan-choker.png
public/collection/kundan-collar.png
public/collection/kundan-princess.png
public/collection/kundan-opera.png
public/collection/guttapusalu-choker.png
public/collection/guttapusalu-collar.png
public/collection/guttapusalu-princess.png
public/collection/guttapusalu-opera.png
public/collection/haram-choker.png
public/collection/haram-collar.png
public/collection/haram-princess.png
public/collection/haram-opera.png
```

Unrelated Temple-specific files that were independently being edited in this
workspace are outside this change list. Existing attachments and generated
image assets were preserved.
