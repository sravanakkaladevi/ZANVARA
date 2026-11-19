'use client';
import { useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------
   S  — the choreography state of the main 3D stage.
   GSAP ScrollTrigger timelines write into it, the R3F frame loop reads it.
------------------------------------------------------------------- */
export const KEY = {
  hero: { x: 0, y: 0.05, z: 0, rx: 0.1, ry: 0, rz: 0, s: 1.15, drape: 1, ny: 0, nz: 0, bust: 1, box: 0, boxY: -3, lid: -2.0, heroFit: 0, detailFit: 0 },
  models: { x: -2.7, y: -0.35, z: 0, rx: 0.1, ry: Math.PI * 2, rz: 0, s: 0.6, bust: 1 },
  details: { x: 0, y: 0.2, z: 0, rx: 0.02, ry: Math.PI * 2, s: 2.0, detailFit: 1 },
  pack1: { x: 0, y: 0.15, z: 0, rx: 0.82, ry: Math.PI * 2, s: 0.6, bust: 0, box: 1, boxY: 0, detailFit: 0 },
  pack2: { drape: 0, ny: -0.55, nz: 0, y: 0.3 },
  pack3: { lid: 0 },
  pack4: { rx: 0.36, ry: Math.PI * 2 - 0.45, y: 0.1 },
};

/* phone / portrait overrides (merged over KEY) */
export const KEY_MOBILE = {
  models: { x: 0, y: 0.82 },
  details: { y: 1.75 },
};

export const S = {
  ...KEY.hero,
  ...KEY.models, // the site opens on the collection: bust + necklace start there
  iy: 7, // intro drop offset
  ispin: -3.2, // intro spin
  vspin: 0, // variant change spin
  slot: 0, // final section hand-off 0..1
};

export const pointer = { x: 0, y: 0 };
export const slotRef = { el: null };

/* Collection swap: the chosen necklace flies out of its card onto the bust
   while the current one slides off to the left (driven by GSAP in Models.jsx). */
export const FLY = {
  active: false, // a swap is running
  k: 0, // incoming flight progress 0..1
  out: 0, // outgoing slide progress 0..1
  rect: null, // screen rect of the card the piece leaves from
  phase: 0, // sway phase of that card's necklace (so the flight starts on the exact pose)
  done: false, // set when finished → stage commits the new variant
};

/* How a necklace is presented inside a collection card.  The stage reads the
   same numbers so the flying piece starts pixel-for-pixel where the card had it.
   (camera matches the main stage camera distance → same perspective) */
export const CARD = { z: 10, fov: 15, rx: 0.22, scale: 0.55, cy: 0.41 };
export const cardSway = (t, phase) => Math.sin(t * 0.6 + phase) * 0.42;
export const cardPhase = (i) => i * 1.9;

// Shared by the card camera and the flight's starting transform.
const CARD_FRAMES = {
  choker: { scale: 0.92, cy: 1.36 },
  collar: { scale: 0.75, cy: 1.02 },
  princess: { scale: 0.44, cy: 0.59 },
  opera: { scale: 0.34, cy: -0.12 },
};
export const cardFrame = (length = 'choker') => ({ ...CARD, ...(CARD_FRAMES[length] || CARD_FRAMES.choker) });

export const STYLE_LABELS = {
  temple: 'Temple', kundan: 'Kundan & Jadau', guttapusalu: 'Guttapusalu', haram: 'Haram & Mango Mala',
};
export const LENGTH_LABELS = { choker: 'Choker', collar: 'Collar', princess: 'Princess', opera: 'Opera' };
export const LENGTH_INCHES = { choker: '14–16 in', collar: '16–17 in', princess: '17–19 in', opera: '28–30 in' };
export const flightLift = (length) => ({ choker: 6.3, collar: 7.0, princess: 7.8, opera: 9.5 }[length] || 7.8);
export const stageFrame = (length) => ({
  choker: { heroScale: 1.3, centerY: 1.35, pendantY: 0.96 },
  collar: { heroScale: 1.1, centerY: 1.03, pendantY: 0.32 },
  princess: { heroScale: 0.85, centerY: 0.60, pendantY: -0.56 },
  opera: { heroScale: 0.65, centerY: -0.22, pendantY: -2.30 },
}[length] || { heroScale: 1, centerY: 0.6, pendantY: -0.56 });

/* ------------------------------------------------------------------
   Collection variants
------------------------------------------------------------------- */
const TRADITIONS = {
  temple: {
    metal: '#d6a044', gem: '#9e0f22', gem2: '#0b6b3a', emissive: '#31040b', finish: 'antique',
    metalName: 'Antique 22k gold', stone: 'Ruby & emerald kemp', carat: 'Kemp cabochons',
    note: 'Lakshmi beneath a carved arch, peacock reliefs and a fringe of golden ghungroo.',
  },
  kundan: {
    metal: '#edc46d', gem: '#17633d', gem2: '#ad2538', emissive: '#052014', finish: 'polished',
    metalName: 'Polished 22k gold', stone: 'Polki, emerald & pearl', carat: 'Uncut polki',
    note: 'Foil-set polki, fine Meenakari rims and emerald drops finished with luminous pearls.',
  },
  guttapusalu: {
    metal: '#e4b55f', gem: '#9e0f22', gem2: '#0b6b3a', emissive: '#31040b', finish: 'polished',
    metalName: '22k gold & pearls', stone: 'Natural pearls & ruby kemp', carat: 'Pearl clusters',
    note: 'Floral goldwork and a ruby heart, with little bunches of pearls at every turn.',
  },
  haram: {
    metal: '#d6a14e', gem: '#9e0f22', gem2: '#0b6b3a', emissive: '#31040b', finish: 'antique',
    metalName: 'Antique 22k gold', stone: 'Ruby, emerald & pearl', carat: 'Carved mango motifs',
    note: 'A rhythm of carved mango motifs, kemp settings and a generous paisley pendant.',
  },
};
const CATALOGUE = [
  ['temple', 'choker', 'Lakshmi', '₹3,85,000'],
  ['kundan', 'collar', 'Chandrika', '₹5,40,000'],
  ['guttapusalu', 'princess', 'Muktavali', '₹4,65,000'],
  ['kundan', 'princess', 'Noor', '₹6,10,000'],
  ['guttapusalu', 'choker', 'Mallika', '₹3,45,000'],
  ['haram', 'princess', 'Amra', '₹5,85,000'],
  ['temple', 'opera', 'Devika', '₹7,25,000'],
  ['kundan', 'choker', 'Mehr', '₹4,90,000'],
  ['kundan', 'opera', 'Zehra', '₹8,40,000'],
  ['guttapusalu', 'collar', 'Tarini', '₹4,05,000'],
  ['guttapusalu', 'opera', 'Ratnavali', '₹6,95,000'],
  ['haram', 'collar', 'Vana', '₹4,55,000'],
];
export const VARIANTS = CATALOGUE.map(([style, length, name, price], i) => ({
  ...TRADITIONS[style], id: `${style}-${length}`, name, style, length, price,
  model: `Heirloom N°${String(i + 1).padStart(2, '0')}`,
}));

/** Look a piece up by its id (`style-length`) instead of its position in the catalogue. */
export const variant = (id) => VARIANTS.find((v) => v.id === id) || VARIANTS[0];

const listeners = new Set();
export const variantStore = {
  index: 0,
  set(i) {
    const n = (i + VARIANTS.length) % VARIANTS.length;
    if (n === this.index) return;
    this.index = n;
    listeners.forEach((l) => l());
  },
  subscribe(l) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export function useVariantIndex() {
  return useSyncExternalStore(
    (l) => variantStore.subscribe(l),
    () => variantStore.index,
    () => 0
  );
}
