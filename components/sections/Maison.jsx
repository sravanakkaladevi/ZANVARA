'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MiniView } from '../three/Minis';
import { ImagePiece } from '../three/ImagePiece';

/* ------------------------------------------------------------------
   The maison — a dark, framed "screen" whose tiles re-arrange as you
   scroll: bento → macro → make it yours → hearts adorned → founder.
   Each tile lists its rect per scene: [left, top, width, height, opacity] in %.
------------------------------------------------------------------- */
const img = (code) => `/maison/bhima-${code}.webp`; // 1400 px WebP cut from the Bhima PNGs
const OUT_L = (t, w, h) => [-w - 4, t, w, h, 0];
const OUT_R = (t, w, h) => [104, t, w, h, 0];

const TILES = [
  { id: 'pearl', kind: 'img', src: img('97462'), zoom: 1.05,
    scenes: [[0, 0, 24, 62, 1], OUT_L(0, 24, 62), OUT_L(0, 24, 62), OUT_L(0, 24, 62), OUT_L(0, 24, 62)] },
  { id: 'love', kind: 'card', title: 'We design every piece with love and intention.',
    scenes: [[0, 64.5, 24, 35.5, 1], OUT_L(64.5, 24, 35.5), OUT_L(64.5, 24, 35.5), OUT_L(64.5, 24, 35.5), OUT_L(64.5, 24, 35.5)] },
  { id: 'hero3d', kind: '3d', src: img('96173'),
    scenes: [[25.5, 0, 45, 100, 1], [25.5, 0, 45, 100, 0], [25.5, 0, 45, 100, 0], [25.5, 0, 45, 100, 0], [25.5, 0, 45, 100, 0]] },
  { id: 'ruby', kind: 'img', src: img('97524'), zoom: 1.9, focus: '50% 40%',
    scenes: [[72, 0, 28, 49, 1], OUT_R(0, 28, 49), OUT_R(0, 28, 49), OUT_R(0, 28, 49), OUT_R(0, 28, 49)] },
  { id: 'floral', kind: 'img', src: img('97457'), zoom: 2.2, focus: '50% 55%',
    scenes: [[72, 51, 28, 49, 1], OUT_R(51, 28, 49), OUT_R(51, 28, 49), OUT_R(51, 28, 49), OUT_R(51, 28, 49)] },
  { id: 'macro', kind: 'macro', src: img('97598'), text: 'Only the purest gold, shaped by hand.',
    scenes: [[25.5, 0, 45, 100, 0], [0, 0, 100, 100, 1], [0, 37, 63, 63, 0], [0, 37, 63, 63, 0], [0, 37, 63, 63, 0]] },
  { id: 'favourite', kind: 'card', wide: true, title: 'A favourite for a reason',
    text: 'From the first fitting to the hundredth celebration, our temple pieces are worn and loved across generations.',
    scenes: [[0, -40, 63, 34, 0], [0, -40, 63, 34, 0], [0, 0, 63, 34, 1], [0, -40, 63, 34, 0], [0, -40, 63, 34, 0]] },
  { id: 'yours', kind: 'img', src: img('97519'), zoom: 1.35, focus: '50% 62%', caption: 'Make it yours today.',
    scenes: [[0, 37, 63, 63, 0], [0, 0, 100, 100, 0], [0, 37, 63, 63, 1], OUT_L(37, 63, 63), OUT_L(37, 63, 63)] },
  { id: 'lakshmi', kind: 'img', src: img('97607'), zoom: 1.6, focus: '50% 70%',
    scenes: [OUT_R(0, 35, 100), OUT_R(0, 35, 100), [65, 0, 35, 100, 1], [0, 0, 30, 100, 1], OUT_L(0, 30, 100)] },
  { id: 'hearts', kind: 'stat', title: '30,000+', sub: 'Hearts adorned',
    text: 'Every piece we create becomes part of someone’s story — thank you for letting us be a part of yours.',
    scenes: [[32, 110, 34, 84, 0], [32, 110, 34, 84, 0], [32, 110, 34, 84, 0], [32, 8, 34, 84, 1], [32, 110, 34, 84, 0]] },
  { id: 'emerald', kind: 'img', src: img('97567'), zoom: 1.5, focus: '50% 68%',
    scenes: [OUT_R(0, 32, 100), OUT_R(0, 32, 100), OUT_R(0, 32, 100), [68, 0, 32, 100, 1], OUT_R(0, 32, 100)] },
  { id: 'founder', kind: 'img', src: img('97591'), zoom: 1.7, focus: '50% 72%',
    scenes: [OUT_R(0, 26, 38), OUT_R(0, 26, 38), OUT_R(0, 26, 38), OUT_R(0, 26, 38), [74, 0, 26, 38, 1]] },
  { id: 'wide', kind: 'img', src: img('97524'), zoom: 2.1, focus: '50% 42%',
    scenes: [[0, 108, 100, 56, 0], [0, 108, 100, 56, 0], [0, 108, 100, 56, 0], [0, 108, 100, 56, 0], [0, 44, 100, 56, 1]] },
];

/* phones: a two-column bento instead of three (overrides per tile, per scene) */
const MOBILE = {
  pearl: { 0: [0, 0, 48, 38, 1] },
  love: { 0: [52, 0, 48, 38, 1] },
  hero3d: { all: [0, 40, 100, 60, 0], 0: [0, 40, 100, 60, 1] },
  ruby: { 0: OUT_R(0, 48, 38) },
  floral: { 0: OUT_R(40, 48, 60) },
  macro: { 0: [0, 40, 100, 60, 0], 2: [0, 37, 100, 63, 0], 3: [0, 37, 100, 63, 0], 4: [0, 37, 100, 63, 0] },
  favourite: { all: [0, -40, 100, 34, 0], 2: [0, 0, 100, 34, 1] },
  yours: { 0: [0, 37, 100, 63, 0], 2: [0, 37, 100, 63, 1], 3: OUT_L(37, 100, 63), 4: OUT_L(37, 100, 63) },
  lakshmi: { 0: OUT_R(0, 48, 55), 1: OUT_R(0, 48, 55), 2: OUT_R(0, 48, 55), 3: [0, 0, 48, 55, 1], 4: OUT_L(0, 48, 55) },
  hearts: { all: [0, 110, 100, 43, 0], 3: [0, 57, 100, 43, 1] },
  emerald: { all: OUT_R(0, 48, 55), 3: [52, 0, 48, 55, 1] },
  founder: { all: OUT_R(0, 40, 30) },
  wide: { all: [0, 108, 100, 52, 0], 4: [0, 48, 100, 52, 1] },
};
const sceneOf = (t, s, mobile) => (mobile && MOBILE[t.id] ? MOBILE[t.id][s] || MOBILE[t.id].all || t.scenes[s] : t.scenes[s]);

const QUOTE ='Every piece we craft carries a piece of our family’s heart — made not just to adorn, but to celebrate the one who wears it.';
const HOLD = 0.7; // scroll "rest" on each scene
const MOVE = 1; // scroll spent moving between scenes

function Arrow() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7l10 10M17 9v8H9" /></svg>
  );
}

function Tile({ t, show3d }) {
  return (
    <div className={`mtile mtile--${t.kind}${t.wide ? ' mtile--wide' : ''}`} data-tile={t.id}>
      {t.kind === 'img' && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.src} alt="" decoding="async" style={{ transform: `scale(${t.zoom || 1})`, transformOrigin: t.focus || '50% 50%' }} />
          {t.caption && <p className="mtile__caption serif">{t.caption}</p>}
        </>
      )}
      {t.kind === '3d' && (
        <MiniView className="mtile__view" z={4.2} visible={show3d}>
          <ImagePiece src={t.src} height={2.05} depth={0.28} detail={0.22} tilt={0.9} shadow={0.6} />
        </MiniView>
      )}
      {t.kind === 'macro' && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={t.src} alt="" decoding="async" className="mtile__macro" />
          <p className="mtile__typed" aria-label={t.text}>
            {t.text.split(' ').map((word, w) => (
              <em key={w}>{[...word].map((ch, i) => <span key={i}>{ch}</span>)}{' '}</em>
            ))}
          </p>
        </>
      )}
      {t.kind === 'card' && (
        <>
          <p className="mtile__title">{t.title}</p>
          {t.text && <p className="mtile__text">{t.text}</p>}
          <span className="mtile__go"><Arrow /></span>
        </>
      )}
      {t.kind === 'stat' && (
        <>
          <p className="mtile__stat">{t.title}<small>{t.sub}</small></p>
          <p className="mtile__text">{t.text}</p>
          <span className="mtile__go"><Arrow /></span>
        </>
      )}
    </div>
  );
}

export default function Maison() {
  const section = useRef();
  const [show3d, setShow3d] = useState(true);

  useEffect(() => {
    const mm = gsap.matchMedia(section);
    mm.add({ mobile: '(max-width: 700px)', desktop: '(min-width: 701px)' }, ({ conditions }) => {
      const mobile = conditions.mobile;
      const rect = ([l, t, w, h, o]) => ({ left: `${l}%`, top: `${t}%`, width: `${w}%`, height: `${h}%`, autoAlpha: o });
      TILES.forEach((t) => gsap.set(`[data-tile="${t.id}"]`, rect(sceneOf(t, 0, mobile))));
      gsap.set('.maison__quote span', { opacity: 0.18 });
      gsap.set('.maison__quote', { autoAlpha: 0, y: 30 });

      const tl = gsap.timeline({ defaults: { ease: 'power3.inOut' } });
      const sceneCount = TILES[0].scenes.length;
      for (let s = 1; s < sceneCount; s++) {
        const at = HOLD + (s - 1) * (MOVE + HOLD);
        TILES.forEach((t) => {
          const [a, b] = [sceneOf(t, s - 1, mobile), sceneOf(t, s, mobile)];
          if (a.join() !== b.join()) tl.to(`[data-tile="${t.id}"]`, { ...rect(b), duration: MOVE }, at);
        });
        if (s === 1) tl.to('.mtile__typed span', { opacity: 1, duration: 0.02, stagger: 0.022, ease: 'none' }, at + MOVE * 0.6);
        if (s === 2) tl.to('.mtile__typed', { autoAlpha: 0, duration: 0.3 }, at);
        if (s === 4) {
          tl.to('.maison__quote', { autoAlpha: 1, y: 0, duration: 0.5 }, at + 0.3)
            .to('.maison__quote span', { opacity: 1, duration: 0.05, stagger: 0.03, ease: 'none' }, at + 0.5);
        }
      }
      tl.set({}, {}, HOLD + (sceneCount - 1) * (MOVE + HOLD));
      // the macro shot drifts slowly while it is on screen
      tl.fromTo('.mtile__macro', { scale: 2.4, xPercent: 6 }, { scale: 2.0, xPercent: -6, duration: MOVE * 2 + HOLD, ease: 'none' }, HOLD);

      const total = tl.duration();
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: 'bottom bottom',
        scrub: 0.8,
        animation: tl,
        onUpdate: (st) => setShow3d(st.progress * total < HOLD + MOVE * 0.5),
      });
      gsap.from('.maison__frame', {
        scale: 0.92, borderRadius: 48, autoAlpha: 0.4, ease: 'none',
        scrollTrigger: { trigger: section.current, start: 'top bottom', end: 'top top', scrub: true },
      });
    });
    return () => mm.revert();
  }, []);

  return (
    <section className="maison" id="maison" ref={section} aria-label="The maison">
      <div className="maison__sticky">
        <div className="maison__frame">
          <header className="maison__bar">
            <span className="maison__pill serif">Zanvara</span>
            <div className="maison__actions">
              <button className="maison__round" aria-label="Search">
                <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6" /><path d="M16 16l4 4" /></svg>
              </button>
              <button className="maison__round" aria-label="Bag">
                <svg viewBox="0 0 24 24"><path d="M6 8h12l-1 12H7L6 8Z" /><path d="M9 8a3 3 0 0 1 6 0" /></svg>
              </button>
              <a className="maison__contact" href="#contact">
                <i><svg viewBox="0 0 24 24"><path d="M4 7h16v10H4z" /><path d="m4 7 8 6 8-6" /></svg></i>
                Contact
              </a>
            </div>
          </header>

          <div className="maison__stage">
            {TILES.map((t) => <Tile key={t.id} t={t} show3d={show3d} />)}
            <blockquote className="maison__quote">
              <p>{QUOTE.split(' ').map((w, i) => <span key={i}>{w} </span>)}</p>
              <footer className="serif">Sravan Kumar, Master Jeweller &amp; Founder</footer>
            </blockquote>
          </div>

          <footer className="maison__foot">
            <span className="maison__word serif">Zanvara</span>
            <p>Zanvara Atelier brings you bridal heirlooms that blend living tradition with meaningful detail — made to shine on your day, and every day after.</p>
            <a className="maison__explore" href="#atelier">
              <span>Explore more</span>
              <i><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></i>
            </a>
          </footer>
        </div>
      </div>
    </section>
  );
}
