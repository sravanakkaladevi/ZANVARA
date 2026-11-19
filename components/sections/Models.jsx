'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { MiniView, NecklacePiece } from '../three/Minis';
import { CARD, FLY, VARIANTS, STYLE_LABELS, LENGTH_LABELS, LENGTH_INCHES, cardPhase, variantStore, useVariantIndex } from '@/lib/store';

const FLIGHT = 2.35;
const OUT = 1.45;
const prevRects = new Map();
let flightTimeline, copyTimeline;

function rememberCards() {
  prevRects.clear();
  document.querySelectorAll('.models .card').forEach((el) => prevRects.set(el.dataset.id, el.getBoundingClientRect()));
}

// Keep both neighbours mounted, while rendering at most four card necklaces.
function upcoming(active, filtered) {
  const at = filtered.findIndex((v) => VARIANTS.indexOf(v) === active);
  const waiting = at < 0 ? filtered : Array.from({ length: filtered.length - 1 }, (_, j) => filtered[(at + j + 1) % filtered.length]);
  return waiting.length <= 4 ? waiting : [...waiting.slice(0, 3), waiting[waiting.length - 1]];
}

function select(n) {
  if (FLY.active || n === variantStore.index) return;
  const view = document.querySelector(`.card[data-id="${VARIANTS[n].id}"] .card__view`);
  if (!view) return;
  rememberCards();
  Object.assign(FLY, { rect: view.getBoundingClientRect(), phase: cardPhase(n), k: 0, out: 0, done: false, active: true });
  window.dispatchEvent(new Event('verdelle:flight'));
  flightTimeline = gsap.timeline({ onComplete: () => { FLY.done = true; } })
    .to(FLY, { out: 1, duration: OUT, ease: 'none' }, 0)
    .to(FLY, { k: 1, duration: FLIGHT, ease: 'power2.inOut' }, 0.1);

  const card = view.closest('.card'), r = card.getBoundingClientRect();
  const ghost = card.cloneNode(true);
  ghost.classList.add('card--ghost'); ghost.removeAttribute('data-id');
  ghost.setAttribute('aria-hidden', 'true'); ghost.tabIndex = -1;
  Object.assign(ghost.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
  document.body.appendChild(ghost);
  gsap.to(ghost, { x: -r.width * 0.9, rotate: -7, autoAlpha: 0, duration: 1.1, ease: 'power3.inOut', onComplete: () => ghost.remove() });
  variantStore.set(n);
  copyTimeline = gsap.timeline()
    .to('.models .tag, .models__info', { autoAlpha: 0, y: -10, duration: 0.3, ease: 'power2.in', stagger: 0.03 })
    .add(() => window.dispatchEvent(new Event('verdelle:shown')))
    .fromTo('.models .tag, .models__info', { autoAlpha: 0, y: 12 },
      { autoAlpha: 1, y: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, FLIGHT * 0.65);
}

function FilterRow({ label, value, options, onChange, busy }) {
  return (
    <div className="models__filter-row" role="group" aria-label={`Filter by ${label.toLowerCase()}`}>
      <span className="models__filter-label">{label}</span>
      <div className="models__chips">
        {[['all', 'All'], ...Object.entries(options)].map(([id, name]) => (
          <button key={id} className={`pill ${value === id ? 'is-selected' : ''}`} aria-pressed={value === id}
            disabled={busy} onClick={() => onChange(id)}>{name}</button>
        ))}
      </div>
    </div>
  );
}

export default function Models() {
  const active = useVariantIndex();
  const [shown, setShown] = useState(active);
  const [style, setStyle] = useState('all');
  const [length, setLength] = useState('all');
  const [busy, setBusy] = useState(false);
  const rail = useRef();
  useEffect(() => {
    const onShown = () => setShown(variantStore.index);
    const onFlight = () => setBusy(true);
    const onLanded = () => { setBusy(false); setShown(variantStore.index); };
    window.addEventListener('verdelle:shown', onShown);
    window.addEventListener('verdelle:flight', onFlight);
    window.addEventListener('verdelle:landed', onLanded);
    return () => {
      window.removeEventListener('verdelle:shown', onShown);
      window.removeEventListener('verdelle:flight', onFlight);
      window.removeEventListener('verdelle:landed', onLanded);
      flightTimeline?.kill(); copyTimeline?.kill();
      document.querySelectorAll('.card--ghost').forEach((el) => el.remove());
      Object.assign(FLY, { active: false, done: false, k: 0, out: 0 });
    };
  }, []);
  const v = VARIANTS[shown];
  const filtered = VARIANTS.filter((p) => (style === 'all' || p.style === style) && (length === 'all' || p.length === length));
  const cards = upcoming(active, filtered);
  const cycle = (direction) => {
    if (!filtered.length) return;
    const at = filtered.findIndex((p) => VARIANTS.indexOf(p) === active);
    const i = at < 0 ? direction > 0 ? 0 : filtered.length - 1 : (at + direction + filtered.length) % filtered.length;
    select(VARIANTS.indexOf(filtered[i]));
  };
  const filter = (setter) => (value) => { rememberCards(); setter(value); };

  useLayoutEffect(() => {
    if (!prevRects.size || !rail.current) return;
    const animations = [];
    rail.current.querySelectorAll('.card').forEach((el, i) => {
      const before = prevRects.get(el.dataset.id), now = el.getBoundingClientRect();
      if (before) {
        animations.push(gsap.fromTo(el, { x: before.left - now.left, y: before.top - now.top },
          { x: 0, y: 0, duration: 1.15, delay: 0.06 + i * 0.04, ease: 'power3.inOut', overwrite: true }));
        animations.push(gsap.timeline({ delay: 0.06 + i * 0.04 }).to(el, { rotate: -4, duration: 0.5 }).to(el, { rotate: 0, duration: 0.65 }));
      } else {
        animations.push(gsap.fromTo(el, { x: 100, y: 20, rotate: 7, autoAlpha: 0 },
          { x: 0, y: 0, rotate: 0, autoAlpha: 1, duration: 1, delay: 0.12 + i * 0.04, ease: 'expo.out' }));
      }
    });
    prevRects.clear();
    return () => animations.forEach((a) => a.kill());
  }, [active, style, length]);

  const onlyWorn = filtered.length === 1 && VARIANTS.indexOf(filtered[0]) === active;
  return (
    <section className="models" id="collection">
      <div className="models__stage">
        <div className="models__halo" aria-hidden="true" />
        <span className="pill tag tag--1">{STYLE_LABELS[v.style]} · {LENGTH_LABELS[v.length]}</span>
        <span className="pill tag tag--2">{v.stone}</span>
        <span className="pill tag tag--3">{LENGTH_INCHES[v.length]}</span>
        <span className="pill tag tag--4">{v.metalName}</span>
      </div>
      <div className="models__panel">
        <p className="eyebrow"><b>(01)</b> The bridal collection</p>
        <h2 className="models__title grunge"><span>LIVING</span><span className="light">TRADITIONS</span></h2>
        <div className="models__info" aria-live="polite" aria-atomic="true">
          <div>
            <h3 className="serif">{v.name}</h3>
            <span className="models__piece-kind">{STYLE_LABELS[v.style]} · {LENGTH_LABELS[v.length]} · {LENGTH_INCHES[v.length]}</span>
            <p>{v.note}</p>
          </div>
          <div className="models__price"><span>{v.price}</span><small>{v.model}</small></div>
        </div>
        <div className="models__filters">
          <FilterRow label="Style" value={style} options={STYLE_LABELS} onChange={filter(setStyle)} busy={busy} />
          <FilterRow label="Length" value={length} options={LENGTH_LABELS} onChange={filter(setLength)} busy={busy} />
        </div>
        <div className="models__controls">
          <button className="round-btn" onClick={() => cycle(-1)} disabled={busy || onlyWorn || !filtered.length} aria-label="Previous piece" data-cursor="Prev">←</button>
          <button className="round-btn round-btn--fill" onClick={() => cycle(1)} disabled={busy || onlyWorn || !filtered.length} aria-label="Next piece" data-cursor="Next">→</button>
          <span className="models__hint" role="status">{filtered.length} {filtered.length === 1 ? 'piece' : 'pieces'} · {busy ? 'Taking its place…' : 'Choose your heirloom'}</span>
        </div>
        <div className="models__rail" ref={rail} aria-label="Matching necklaces" aria-busy={busy}>
          <div className="models__track">
            {cards.map((it) => (
              <button key={it.id} data-id={it.id} className="card" disabled={busy} onClick={() => select(VARIANTS.indexOf(it))} data-cursor="Wear" aria-label={`Wear ${it.name}, ${STYLE_LABELS[it.style]}, ${LENGTH_LABELS[it.length]}`}>
                <MiniView className="card__view" z={CARD.z} fov={CARD.fov} stageLights>
                  <NecklacePiece piece={it} phase={cardPhase(VARIANTS.indexOf(it))} />
                </MiniView>
                <span className="card__name">{it.name}</span>
                <span className="card__meta">{STYLE_LABELS[it.style]} · {LENGTH_LABELS[it.length]}</span>
                <span className="card__meta">{LENGTH_INCHES[it.length]} · {it.price}</span>
              </button>
            ))}
            {!cards.length && <p className="models__empty" role="status">{onlyWorn ? 'Your chosen heirloom is on the bust.' : 'No pieces match. Choose another style or length.'}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
