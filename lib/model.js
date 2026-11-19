/* ------------------------------------------------------------------
   The model who replaces the velvet bust.

   Sources are tried in order: a real photograph, if you add one at
   public/model/model.jpg, otherwise the original painted illustration
   (scripts/draw-model.mjs → public/model/illustration.webp).

   Anchors are image fractions: u = 0 left → 1 right, v = 0 top → 1 bottom.
     neckL / neckR – left and right edge of the neck, at mid-neck height
     drop          – where a pendant should rest
     pos           – object-position used when the image fills the story frame
     bust          – fine-tuning of the image behind the collection necklaces
------------------------------------------------------------------- */
export const MODELS = [
  {
    src: '/model/model.jpg',
    neckL: [0.445, 0.31],
    neckR: [0.555, 0.31],
    drop: [0.5, 0.66],
    pos: [0.5, 0.3],
    bust: { dx: 0, dy: 0, scale: 1 },
  },
  {
    // painted to the bust's own proportions: 166 px per bust unit, mid-neck at 496 px
    src: '/model/illustration.webp',
    neckL: [1070.5 / 2400, 496 / 1600],
    neckR: [1329.5 / 2400, 496 / 1600],
    drop: [0.5, 1085 / 1600],
    pos: [0.5, 0.15],
    bust: { dx: 0, dy: 0, scale: 1 },
  },
];

/* the bust's own neck, in its local units (see BUST_CONTROL_POINTS) */
export const BUST_NECK = { halfWidth: 0.78, y: 2.6 };

let pending = null;
/** Resolves to the first model image that loads: { ...config, image } — or null. */
export function loadModel() {
  if (typeof window === 'undefined') return Promise.resolve(null);
  if (!pending) {
    pending = (async () => {
      for (const config of MODELS) {
        const image = await new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => resolve(img);
          img.onerror = () => resolve(null);
          img.src = config.src;
        });
        if (image) return { ...config, image };
      }
      return null;
    })();
  }
  return pending;
}
