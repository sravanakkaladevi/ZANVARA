# Zanvara Atelier — Indian Bridal Heirlooms

A scroll-driven procedural 3D jewellery experience: Temple, Kundan & Jadau,
Guttapusalu and Haram, each in choker, collar, princess and opera lengths.

Next.js 16 · React 19 · Three.js / React Three Fiber / drei · GSAP · Lenis.

```sh
npm install
npm run dev
npm run build
npm start
node scripts/verify-jewellery.mjs
```

All necklaces are built from geometry. The collection uses no necklace images,
downloaded models or GLB files. Existing standalone image assets are not needed by
the collection or atelier previews.

`public/collection/` contains sixteen transparent 2048 × 2048 PNG catalogue renders
exported from the full-detail procedural geometry.

It also contains sixteen original Bhima product-photo cutouts named
`bhima-<product-code>.png`. These are transparent 2048 × 2048 PNGs, centred at
approximately 85% frame fill, prepared from the 3000 × 3000 source photos using
mechanical background removal. No AI reconstruction, reshaping or colour grading
was used. The existing 3D components and procedural images are unchanged; the
new photos are ready for image-component integration.

Open [the source comparison](docs/collection/review.html) to inspect each cutout
beside its original, or view [the contact sheet](docs/collection/contact-sheet.jpg).
[The asset manifest](public/collection/bhima-assets.json) provides runtime `src`
paths, product URLs, original-image URLs, source checksums and export checks.
Product-code filenames identify the actual photos, without assigning them to the
fictional style/length variants. Original downloads are in
`docs/collection/originals/`.

To reproduce the cutouts, using the project's installed Sharp dependency:

```sh
node scripts/prepare-collection.mjs
```

- `lib/store.js`: 16 pieces, filters' labels, shared card frames, flight lifts and scroll poses.
- `components/three/jewelleryGeometry.js`: four sets of motif, pendant and fringe builders.
- `components/three/necklacePaths.js`: fitting derived from the visible bust profile, plus flat case layouts.
- `components/three/necklaceRig.js`: instanced assemblies, cached static matrices and moving drop clusters.
- `components/three/Stage.jsx`: resident/flyer hand-off and length-dependent framing.
- `components/sections/Models.jsx`: accessible style/length filters and the animated collection rail.

See [implementation and verification](docs/jewellery-system.md) for render counts,
checks, performance measurements and the complete list of files changed.

## Model photo

The opening story ("From stone to signature") and the collection bust use one
front-facing model photograph at `public/model/model.jpg`. Until it exists the
story ends on the pendant alone and the collection shows the velvet bust.

Once it is in place, set its anchors in `lib/model.js` (image fractions, measured
from the top-left): `neckL` / `neckR` are the two edges of the neck at mid-neck
height, `drop` is where a pendant should rest. `bust.dx`, `bust.dy` and
`bust.scale` nudge the photo behind the collection necklaces.

## Sections

Story (Atelier-Élan style, `components/sections/Story.jsx` + `three/StoryScene.jsx`)
→ Collection → Anatomy → Keepsake → Promise → Maison (MIRA-style framed bento,
`components/sections/Maison.jsx`, WebP tiles in `public/maison/`) → Atelier →
Numbers → Footer. Redesign styles live in `app/redesign.css`.
