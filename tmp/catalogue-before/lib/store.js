'use client';
import { useSyncExternalStore } from 'react';

/* ------------------------------------------------------------------
   S  — the choreography state of the main 3D stage.
   GSAP ScrollTrigger timelines write into it, the R3F frame loop reads it.
------------------------------------------------------------------- */
export const KEY = {
  hero: { x: 0, y: 0.62, z: 0, rx: 0.1, ry: 0, rz: 0, s: 1.55, drape: 1, ny: 0, nz: 0, bust: 1, box: 0, boxY: -3, lid: -2.0 },
  manifesto: { x: 2.55, y: 0.25, rx: 0.32, ry: Math.PI * 2 - 0.55, rz: 0.06, s: 0.88 },
  models: { x: -2.7, y: -1.05, z: 0, rx: 0.1, ry: Math.PI * 2, rz: 0, s: 0.6, bust: 1 },
  details: { x: 0, y: 1.25, z: 0, rx: 0.02, ry: Math.PI * 2, s: 2.0 },
  pack1: { x: 0, y: 0.15, z: 0, rx: 0.82, ry: Math.PI * 2, s: 0.6, bust: 0, box: 1, boxY: 0 },
  pack2: { drape: 0.07, ny: -0.17, nz: -0.42, y: 0.3 },
  pack3: { lid: 0 },
  pack4: { rx: 0.36, ry: Math.PI * 2 - 0.45, y: 0.1 },
};

/* phone / portrait overrides (merged over KEY) */
export const KEY_MOBILE = {
  manifesto: { x: 0, y: -0.95 },
  models: { x: 0, y: 0.82 },
  details: { y: 1.75 },
};

export const S = {
  ...KEY.hero,
  iy: 7, // intro drop offset
  ispin: -3.2, // intro spin
  vspin: 0, // variant change spin
  bshift: 0, // px the collection section still sits below the viewport top (the bust rides with it)
  bpose: KEY.models, // where the bust stands inside the collection section
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

/* ------------------------------------------------------------------
   Collection variants
------------------------------------------------------------------- */
export const VARIANTS = [
  {
    id: 'emeraude',
    name: 'Émeraude Halo',
    metalName: '18k Yellow Gold',
    stone: 'Colombian Emerald',
    carat: '4.20 ct',
    price: '€48,500',
    model: 'Model N°04',
    metal: '#f2c877',
    gem: '#0c8f50',
    emissive: '#03371c',
    note: 'A step-cut Muzo emerald held in a halo of twenty-two brilliants.',
  },
  {
    id: 'rosee',
    name: 'Rubis Rosée',
    metalName: '18k Rose Gold',
    stone: 'Burmese Ruby',
    carat: '3.10 ct',
    price: '€39,900',
    model: 'Model N°07',
    metal: '#efb59a',
    gem: '#c0123c',
    emissive: '#3f0513',
    note: 'Pigeon-blood ruby, warmed by rose gold and a crown of diamonds.',
  },
  {
    id: 'nocturne',
    name: 'Nocturne',
    metalName: '18k White Gold',
    stone: 'Ceylon Sapphire',
    carat: '3.85 ct',
    price: '€44,200',
    model: 'Model N°11',
    metal: '#e4e8ee',
    gem: '#2342c4',
    emissive: '#06123f',
    note: 'Midnight-blue sapphire, cool white gold, a constellation around it.',
  },
  {
    id: 'lumiere',
    name: 'Lumière',
    metalName: 'Platinum 950',
    stone: 'D-Flawless Diamond',
    carat: '2.50 ct',
    price: '€61,000',
    model: 'Model N°01',
    metal: '#d6dbe2',
    gem: '#eaf2ff',
    emissive: '#2a3140',
    note: 'An emerald-cut diamond of the rarest colour. Pure, silent light.',
  },
  {
    id: 'soleil',
    name: 'Soleil',
    metalName: '18k Yellow Gold',
    stone: 'Golden Citrine',
    carat: '5.60 ct',
    price: '€32,700',
    model: 'Model N°09',
    metal: '#f5c66a',
    gem: '#f0a521',
    emissive: '#4a2a02',
    note: 'A sun-coloured citrine — the most joyful piece in the maison.',
  },
];

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
