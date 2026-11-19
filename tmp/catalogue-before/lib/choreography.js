import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { S, KEY, KEY_MOBILE } from './store';

const TAU = Math.PI * 2;
const STAGE_KEYS = ['x', 'y', 'z', 'rx', 'ry', 'rz', 's', 'drape', 'ny', 'nz', 'bust', 'box', 'boxY', 'lid'];
const pick = (o) => STAGE_KEYS.reduce((a, k) => (k in o ? ((a[k] = o[k]), a) : a), {});

/* stage keyframes, each inheriting the previous one */
function frames(K = KEY) {
  const hero = { ...K.hero };
  const m1 = { ...hero, ...K.manifesto, ry: 0.9 };
  const m2 = { ...m1, ry: K.manifesto.ry, y: K.manifesto.y - 0.15 };
  const models = { ...m2, ...K.models };
  const det = { ...models, ...K.details };
  const det2 = { ...det, s: 2.15 };
  const p1 = { ...det2, ...K.pack1 };
  const p2 = { ...p1, ...K.pack2 };
  const p3 = { ...p2, ...K.pack3 };
  const p4 = { ...p3, ...K.pack4 };
  return { hero, m1, m2, models, det, det2, p1, p2, p3, p4 };
}

/*
 * The 3D stage is driven by ONE deterministic function of the (Lenis-smoothed)
 * scroll position: an ordered list of segments, each interpolating between two
 * keyframes.  No competing tweens → the pose is always exactly right, in both
 * directions, at any scroll speed.
 */
function stageTrack(sets) {
  // sets: { desk: frames, mob: frames } — picked per tick by viewport width
  const P = {};
  for (const k in sets) {
    P[k] = {};
    for (const f in sets[k]) P[k][f] = pick(sets[k][f]);
  }
  const seg = (trigger, start, end, from, to, ease = 'power2.inOut', a, b) => ({
    st: ScrollTrigger.create({ trigger, start, end }),
    from,
    to,
    a,
    b,
    ease: gsap.parseEase(ease),
  });
  const segs = [
    seg('.manifesto', 'top bottom', 'top top', 'hero', 'm1'),
    seg('.manifesto', 'top top', 'bottom bottom', 'm1', 'm2', 'none'),
    seg('.models', 'top bottom', 'top top', 'm2', 'models'),
    seg('.details', 'top 45%', 'top top', 'models', 'det'),
    seg('.details', 'top top', 'bottom bottom', 'det', 'det2', 'none'),
    seg('.keepsake', 'top bottom', 'top top', 'det2', 'p1'),
    // sub-ranges of the pinned keepsake section
    seg('.keepsake', 'top top', 'bottom bottom', 'p1', 'p2', 'power2.inOut', 0, 0.33),
    seg('.keepsake', 'top top', 'bottom bottom', 'p2', 'p3', 'power3.inOut', 0.33, 0.66),
    seg('.keepsake', 'top top', 'bottom bottom', 'p3', 'p4', 'power2.inOut', 0.66, 1),
  ];
  const slot = ScrollTrigger.create({ trigger: '.promise', start: 'top bottom', end: 'center center' });

  const out = {};
  const apply = () => {
    const y = window.scrollY;
    const K = window.innerWidth < 900 ? P.mob : P.desk;
    Object.assign(out, K.hero);
    for (const s of segs) {
      let start = s.st.start;
      let end = s.st.end;
      if (s.a !== undefined) {
        const len = end - start;
        end = start + len * s.b;
        start = start + len * s.a;
      }
      const from = K[s.from];
      const to = K[s.to];
      if (y >= end) {
        Object.assign(out, to);
        continue;
      }
      if (y > start) {
        const k = s.ease((y - start) / Math.max(1, end - start));
        for (const key in to) out[key] = from[key] + (to[key] - from[key]) * k;
      }
      break;
    }
    Object.assign(S, out);
    // the bust belongs to the collection section: it scrolls in with the page,
    // and the necklace (flying in alone) lands on it as the section reaches the top
    S.bpose = K.models;
    S.bshift = Math.max(0, segs[2].st.end - y);
    S.slot = gsap.utils.clamp(0, 1, (y - slot.start) / Math.max(1, slot.end - slot.start));
  };
  gsap.ticker.add(apply);
  return () => gsap.ticker.remove(apply);
}

export function setupChoreography() {
  if (typeof window !== 'undefined') {
    window.__S = S;
    window.__ST = ScrollTrigger;
    window.__gsap = gsap;
  }
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const merge = (a, b) => Object.fromEntries(Object.keys(a).map((k) => [k, { ...a[k], ...(b[k] || {}) }]));

  /* ---------------- 3D stage path ---------------- */
  const stopStage = stageTrack({ desk: frames(KEY), mob: frames(merge(KEY, KEY_MOBILE)) });

  /* ---------------- hero ---------------- */
  const heroOut = gsap.timeline({ scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  heroOut
    .to('.hero__line--1', { xPercent: -22, ease: 'none' }, 0)
    .to('.hero__line--2', { xPercent: 22, ease: 'none' }, 0)
    .to('.hero__title', { autoAlpha: 0.15, ease: 'none' }, 0)
    .to('.hero__polaroid--l', { yPercent: -120, rotate: -22, ease: 'none' }, 0)
    .to('.hero__polaroid--r', { yPercent: -160, rotate: 20, ease: 'none' }, 0)
    .to(['.hero__pill', '.hero__words'], { autoAlpha: 0, y: -60, ease: 'none' }, 0);

  /* ---------------- manifesto ---------------- */
  const split = SplitText.create('.split-words', { type: 'words', wordsClass: 'w' });
  gsap.fromTo(
    split.words,
    { opacity: 0.1, filter: 'blur(6px)' },
    {
      opacity: 1,
      filter: 'blur(0px)',
      stagger: 0.08,
      ease: 'none',
      scrollTrigger: { trigger: '.manifesto', start: 'top 35%', end: 'bottom 85%', scrub: true },
    }
  );
  gsap.from('.manifesto__chips .pill', {
    y: 30,
    autoAlpha: 0,
    stagger: 0.1,
    scrollTrigger: { trigger: '.manifesto', start: 'center 40%', toggleActions: 'play none none reverse' },
  });
  gsap.to('.manifesto__ring svg', { rotate: 360, ease: 'none', scrollTrigger: { trigger: '.manifesto', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------------- models ---------------- */
  const mtl = gsap.timeline({ scrollTrigger: { trigger: '.models', start: 'top 55%', toggleActions: 'play none none reverse' } });
  mtl
    .fromTo('.models__title span', { yPercent: 100, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.1, duration: 1.1, ease: 'expo.out' })
    .fromTo('.models .eyebrow, .models__controls', { y: 30, autoAlpha: 0 }, { y: 0, autoAlpha: 1, stagger: 0.08, duration: 0.9, ease: 'expo.out' }, 0.15)
    .fromTo('.models__rail', { x: 160, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 1.4, ease: 'expo.out' }, 0.25);

  /* ---------------- details ---------------- */
  ['.details', '.atelier', '.footer'].forEach((trigger) =>
    ScrollTrigger.create({ trigger, start: 'top 45px', end: 'bottom 45px', toggleClass: { targets: 'body', className: 'is-dark' } })
  );
  const dtl = gsap.timeline({ scrollTrigger: { trigger: '.details', start: 'top top', end: 'bottom bottom', scrub: 0.6 } });
  dtl
    .from('.details__fabric', { autoAlpha: 0, duration: 0.3 }, 0)
    .fromTo('.details__line', { strokeDashoffset: 1 }, { strokeDashoffset: 0, stagger: 0.12, duration: 0.35, ease: 'power2.out' }, 0.05)
    .from('.details__dot', { scale: 0, autoAlpha: 0, stagger: 0.12, duration: 0.2 }, 0.05)
    .from('.callout', { autoAlpha: 0, y: 14, filter: 'blur(8px)', stagger: 0.12, duration: 0.3 }, 0.2)
    .from('.details__caption > *', { autoAlpha: 0, y: 30, stagger: 0.1, duration: 0.3 }, 0.1)
    .fromTo('.details__progress span', { scaleX: 0 }, { scaleX: 1, duration: 1.2, ease: 'none' }, 0)
    .to(['.callout', '.details__line', '.details__dot', '.details__caption'], { autoAlpha: 0, duration: 0.2 }, 1.05);

  /* ---------------- keepsake ---------------- */
  const steps = gsap.utils.toArray('.keepsake__step');
  gsap.timeline({ scrollTrigger: { trigger: '.keepsake', start: 'top top', end: 'bottom bottom', scrub: true } }).fromTo(
    '.keepsake__word',
    { xPercent: 12 },
    { xPercent: -30, ease: 'none' }
  );
  ScrollTrigger.create({
    trigger: '.keepsake',
    start: 'top top',
    end: 'bottom bottom',
    onUpdate: (st) => {
      const i = Math.min(steps.length - 1, Math.floor(st.progress * steps.length));
      steps.forEach((el, k) => el.classList.toggle('is-on', k <= i));
    },
  });
  gsap.from('.keepsake__copy > *', { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.keepsake', start: 'top 40%', toggleActions: 'play none none reverse' } });

  /* ---------------- promise ---------------- */
  const ptl = gsap.timeline({ scrollTrigger: { trigger: '.promise', start: 'top 65%', toggleActions: 'play none none reverse' } });
  ptl
    .from('.promise__line', { yPercent: 60, autoAlpha: 0, stagger: 0.12, duration: 1.2, ease: 'expo.out' })
    .from('.promise__polaroid', { scale: 0, rotate: -40, duration: 1, ease: 'back.out(1.6)' }, 0.5)
    .from('.promise__label', { autoAlpha: 0, y: 10, stagger: 0.1, duration: 0.6 }, 0.8)
    .from('.promise__peek', { xPercent: 40, yPercent: 30, autoAlpha: 0, rotate: 20, duration: 1.4, ease: 'expo.out' }, 0.6);

  /* ---------------- atelier (horizontal) ---------------- */
  const track = document.querySelector('.atelier__track');
  if (track) {
    gsap.to(track, {
      x: () => -(track.scrollWidth - window.innerWidth),
      ease: 'none',
      scrollTrigger: { trigger: '.atelier', start: 'top top', end: 'bottom bottom', scrub: 0.8, invalidateOnRefresh: true },
    });
    gsap.fromTo('.atelier__bar span', { scaleX: 0 }, { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.atelier', start: 'top top', end: 'bottom bottom', scrub: true } });
    gsap.from('.atelier__head > *', { y: 40, autoAlpha: 0, stagger: 0.1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.atelier', start: 'top 60%', toggleActions: 'play none none reverse' } });
  }

  /* ---------------- numbers ---------------- */
  gsap.utils.toArray('.count').forEach((el) => {
    const to = parseFloat(el.dataset.to);
    const dec = parseInt(el.dataset.dec || '0', 10);
    const o = { v: 0 };
    gsap.to(o, {
      v: to,
      duration: 2.2,
      ease: 'power3.out',
      onUpdate: () => (el.textContent = o.v.toFixed(dec)),
      scrollTrigger: { trigger: el, start: 'top 85%', toggleActions: 'play none none reverse' },
    });
  });
  gsap.from('.stat', { y: 60, autoAlpha: 0, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.numbers', start: 'top 75%', toggleActions: 'play none none reverse' } });

  /* ---------------- footer ---------------- */
  gsap.from('.footer__brand', { yPercent: 60, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } });
  gsap.from('.footer__cta > *', { y: 50, autoAlpha: 0, stagger: 0.1, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.footer', start: 'top 70%', toggleActions: 'play none none reverse' } });

  return () => stopStage();
}
