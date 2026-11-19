'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MiniView, NecklacePiece } from '../three/Minis';
import { CARD, FLY, VARIANTS, cardPhase, variantStore, useVariantIndex } from '@/lib/store';

const N = VARIANTS.length;
const FLIGHT = 1.9; // seconds — incoming necklace, card → over the head → down onto the neck
const OUT = 1.3; // seconds — outgoing necklace, lifted off and away
const prevRects = new Map(); // card id → rect, captured just before a swap (FLIP)

/** The pieces waiting in the rail: everything after the one on the bust, in order. */
const upcoming = (active) => Array.from({ length: N - 1 }, (_, j) => VARIANTS[(active + 1 + j) % N]);

function select(target) {
  const n = ((target % N) + N) % N;
  if (FLY.active || n === variantStore.index) return;
  const id = VARIANTS[n].id;
  const view = document.querySelector(`.card[data-id="${id}"] .card__view`);
  if (!view) return;

  // remember where every card is, so the rail can slide (FLIP) after re-render
  prevRects.clear();
  document.querySelectorAll('.models .card').forEach((el) => prevRects.set(el.dataset.id, el.getBoundingClientRect()));

  FLY.rect = view.getBoundingClientRect();
  FLY.phase = cardPhase(n);
  FLY.k = 0;
  FLY.out = 0;
  FLY.done = false;
  FLY.active = true;

  gsap
    .timeline({ onComplete: () => (FLY.done = true) })
    .to(FLY, { out: 1, duration: OUT, ease: 'none' }, 0) // shaped per-phase in the stage
    .to(FLY, { k: 1, duration: FLIGHT, ease: 'power2.inOut' }, 0.1);

  // the card the piece left stays behind as an empty frame and slides away
  const card = view.closest('.card');
  const r = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('card--ghost');
  ghost.removeAttribute('data-id');
  Object.assign(ghost.style, { left: r.left + 'px', top: r.top + 'px', width: r.width + 'px', height: r.height + 'px' });
  document.body.appendChild(ghost);
  gsap.to(ghost, { x: -r.width * 0.9, rotate: -7, autoAlpha: 0, duration: 1.1, ease: 'power3.inOut', onComplete: () => ghost.remove() });

  variantStore.set(n); // rail re-renders immediately (FLIP below)

  // copy + pills: out now, back in with the new piece mid-flight
  gsap
    .timeline()
    .to('.models .tag, .models__info', { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in', stagger: 0.03 })
    .add(() => window.dispatchEvent(new Event('verdelle:shown')))
    .fromTo(
      '.models .tag, .models__info',
      { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 },
      FLIGHT * 0.65
    );
}

export default function Models() {
  const active = useVariantIndex();
  // the text/pills follow the piece on the bust, switching mid-flight
  const [shown, setShown] = useState(active);
  useEffect(() => {
    const on = () => setShown(variantStore.index);
    window.addEventListener('verdelle:shown', on);
    return () => window.removeEventListener('verdelle:shown', on);
  }, []);
  const v = VARIANTS[shown];
  const rail = useRef();
  const cards = upcoming(active);

  // FLIP: slide the remaining cards into their new places, deal the returning one in
  useLayoutEffect(() => {
    if (!prevRects.size || !rail.current) return;
    const els = rail.current.querySelectorAll('.card');
    els.forEach((el, i) => {
      const before = prevRects.get(el.dataset.id);
      const now = el.getBoundingClientRect();
      if (before) {
        const delay = 0.08 + i * 0.05;
        gsap.fromTo(el, { x: before.left - now.left }, { x: 0, duration: 1.25, delay, ease: 'power3.inOut' });
        // a little "deal" tilt while it travels
        gsap
          .timeline({ delay })
          .to(el, { rotate: -5, duration: 0.55, ease: 'sine.inOut' })
          .to(el, { rotate: 0, duration: 0.7, ease: 'sine.inOut' });
      } else {
        gsap.fromTo(
          el,
          { x: 140, y: 30, rotate: 8, autoAlpha: 0 },
          { x: 0, y: 0, rotate: 0, autoAlpha: 1, duration: 1.2, delay: 0.55, ease: 'expo.out' }
        );
      }
    });
    prevRects.clear();
  }, [active]);

  return (
    <section className="models" id="collection">
      <div className="models__stage">
        <div className="models__halo" aria-hidden="true" />
        <span className="pill tag tag--1">{v.model}</span>
        <span className="pill tag tag--2">{v.stone}</span>
        <span className="pill tag tag--3">{v.carat}</span>
        <span className="pill tag tag--4">{v.metalName}</span>
      </div>

      <div className="models__panel">
        <p className="eyebrow">
          <b>(02)</b> Our collection
        </p>
        <h2 className="models__title grunge">
          <span>PURE</span>
          <span className="light">BRILLIANCE</span>
        </h2>

        <div className="models__info">
          <div>
            <h3 className="serif">{v.name}</h3>
            <p>{v.note}</p>
          </div>
          <div className="models__price">
            <span>{v.price}</span>
            <small>
              {String(shown + 1).padStart(2, '0')} / {String(N).padStart(2, '0')}
            </small>
          </div>
        </div>

        <div className="models__controls">
          <button className="round-btn" onClick={() => select(active - 1)} aria-label="Previous piece" data-cursor="Prev">
            ←
          </button>
          <button className="round-btn round-btn--fill" onClick={() => select(active + 1)} aria-label="Next piece" data-cursor="Next">
            →
          </button>
          <span className="models__hint">Choose a piece — watch it take its place</span>
        </div>

        <div className="models__rail" ref={rail}>
          <div className="models__track">
            {cards.map((it) => (
              <button key={it.id} data-id={it.id} className="card" onClick={() => select(VARIANTS.indexOf(it))} data-cursor="Wear">
                <MiniView className="card__view" z={CARD.z} fov={CARD.fov} stageLights>
                  <NecklacePiece metal={it.metal} gem={it.gem} emissive={it.emissive} phase={cardPhase(VARIANTS.indexOf(it))} />
                </MiniView>
                <span className="card__name">{it.name}</span>
                <span className="card__meta">
                  {it.metalName} · {it.price}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
