# Procedural Lakshmi temple choker

The detailed model is implemented in `components/three/TempleNecklace.jsx`. It accepts the original `{ mats, chainMat, state, flares = true }` contract. Integration into the active `Necklace.jsx` is pending a choice between the attached fixed-path requirements and the multi-style, multi-length catalogue that another session added during this work.

The model includes 15 alternating peacock and Lakshmi medallion segments, a carved arched Lakshmi pendant with pillars and peacock shoulders, a smaller lotus drop, ruby/emerald cabochons with gold bezels, 961 border granules, and 95 individually instanced ghungroo drops. The back uses two twisted silk tubes and 12 gold sleeves. All sculpture, surfaces and sparkle textures are procedural.

`assets.js` caches the extruded reliefs and reusable geometry. `templeRig.js` retains the original fitting path: X radius 1.36, Z radius 1.0 and back height `2.25 * drape`. The pendant remains attached at `(0, -0.015, 1.1)` and is about 1.42 units tall including its fringe. Tangent frames account for the bust's 0.27 Z scale. Drape changes update existing instance matrices and cord vertex buffers; idle frames only animate drop matrices and sparkles.

Metal uses `mats.gold`, principal cabochons use `mats.gem`, and white accents use `mats.diamond`. The secondary kemp material follows changes to the main stone color. The gold material supports procedural hammered roughness/bump and vertex-color patina while retaining the shared material and finish helpers from the concurrent catalogue work.

## Verification

- `node --test tests/temple-rig.test.mjs`: seven passing checks for the original path dimensions, finite cached geometry, orthogonal frames, unchanged idle layout, deterministic bead motion, bust clearance and fit within the existing 3.7-unit case.
- Headless Chrome rendered the isolated model with no application or shader errors. Front, dori, flat-box and recolored views were inspected.
- Measured **35 draw calls per necklace per frame**, including three sparkle sprites and the physical gemstone transmission pass. The model uses 18 mesh batches and 1,276 mesh instances; all repeated decorative parts use instancing. Geometry totals 289,360 triangles before the additional transmission pass. These measurements cover the isolated model; the full catalogue and flight need verification after the integration choice.

Screenshots and the detailed browser report are in `tmp/temple-qa/`: `temple-front.png`, `temple-dori.png`, `temple-box.png`, `temple-variant.png` and `model-results.json`.
