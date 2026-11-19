'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MiniView } from '../three/Minis';
import { StoryScene, STORY } from '../three/StoryScene';
import { loadModel } from '@/lib/model';

/* The opening: a stone becomes a signature, told in four chapters. */
const STEPS = [
  { title: 'Cut to be seen.', crumb: 'The stone', at: 0.16, note: 'Muzo emerald · oval brilliant · 4.20 ct' },
  { title: 'Set in gold.', crumb: 'The setting', at: 0.56, note: 'Four claws of 22k gold, shaped by hand' },
  { title: 'Made to wear.', crumb: 'On you', at: 0.84, note: 'Fine cable chain · 17 in' },
  { title: 'From stone to signature.', crumb: 'Your heirloom', at: 1, note: 'Signed, numbered, registered to your family' },
];
const stepAt = (p) => (p < 0.36 ? 0 : p < 0.74 ? 1 : p < 0.9 ? 2 : 3);

export default function Story() {
  const section = useRef();
  const frame = useRef();
  const photo = useRef();
  const [step, setStep] = useState(0);
  const [model, setModel] = useState(null);
  const hasPhoto = !!model;

  useEffect(() => {
    let alive = true;
    loadModel().then((m) => { if (alive && m) { STORY.model = m; setModel(m); } });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    STORY.frame = frame.current;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: section.current,
        start: 'top top',
        end: 'bottom bottom',
        onUpdate: (st) => {
          STORY.p = st.progress;
          setStep(stepAt(st.progress));
        },
      });
      // the photograph: fades in for "Made to wear", then settles into a framed print
      gsap.timeline({ scrollTrigger: { trigger: section.current, start: 'top top', end: 'bottom bottom', scrub: true } })
        .fromTo('.story__photo', { autoAlpha: 0, scale: 1.08 }, { autoAlpha: 1, scale: 1, duration: 0.12, ease: 'power2.out' }, 0.74)
        .fromTo('.story__photo', { top: '9%', bottom: '6%', left: '3%', right: '3%' },
          { top: '13%', bottom: '19%', left: '22%', right: '22%', duration: 0.1, ease: 'power2.inOut' }, 0.88)
        .set({}, {}, 1);
      gsap.from('.story__chrome > *', { autoAlpha: 0, y: 24, stagger: 0.08, duration: 1.2, ease: 'expo.out', paused: true, id: 'story-intro' });
    }, section);
    const intro = () => gsap.getById('story-intro')?.play();
    window.addEventListener('verdelle:intro', intro, { once: true });
    return () => {
      ctx.revert();
      window.removeEventListener('verdelle:intro', intro);
      STORY.frame = null;
      STORY.photo = null;
      STORY.model = null;
    };
  }, []);

  const go = (i) => {
    const el = section.current;
    if (!el) return;
    const s = Math.max(0, Math.min(STEPS.length - 1, i));
    const top = el.offsetTop + (el.offsetHeight - window.innerHeight) * STEPS[s].at;
    window.__lenis ? window.__lenis.scrollTo(top, { duration: 1.6 }) : window.scrollTo({ top, behavior: 'smooth' });
  };

  return (
    <section className={`story ${hasPhoto ? 'has-photo' : ''}`} ref={section} id="story" aria-label="From stone to signature">
      <div className="story__sticky" ref={frame}>
        <figure className="story__photo" aria-hidden={!hasPhoto}>
          {model && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              ref={(el) => { photo.current = el; STORY.photo = el; }}
              src={model.src}
              alt="Model wearing the Zanvara emerald pendant"
              style={{ objectPosition: `${model.pos[0] * 100}% ${model.pos[1] * 100}%` }}
            />
          )}
        </figure>

        <MiniView className="story__view" z={10} fov={30} stageLights>
          <StoryScene />
        </MiniView>
      </div>

      {/* a second sticky layer, lifted above the WebGL canvas for the type and controls */}
      <div className="story__sticky story__sticky--chrome">
        <div className="story__chrome">
          <p className="story__crumbs">
            <span>Home</span><i>›</i><span>Atelier</span><i>›</i><b>{STEPS[step].crumb}</b>
          </p>
          <h1 className="story__titles" aria-live="polite">
            {STEPS.map((s, i) => (
              <span key={s.title} className={`story__title ${i === step ? 'is-on' : ''} ${i === 3 ? 'story__title--end' : ''}`} aria-hidden={i !== step}>
                {s.title}
              </span>
            ))}
          </h1>
          <p className="story__note"><b>N°{String(step + 1).padStart(2, '0')}</b>{STEPS[step].note}</p>
          <button className="story__arrow story__arrow--prev" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Previous chapter" data-cursor="Prev">
            <svg viewBox="0 0 24 24"><path d="M15 5 8 12l7 7" /></svg>
          </button>
          <button className="story__arrow story__arrow--next" onClick={() => go(step + 1)} disabled={step === STEPS.length - 1} aria-label="Next chapter" data-cursor="Next">
            <svg viewBox="0 0 24 24"><path d="m9 5 7 7-7 7" /></svg>
          </button>
          <div className="story__dots" role="tablist" aria-label="Chapters">
            {STEPS.map((s, i) => (
              <button key={s.title} role="tab" aria-selected={i === step} aria-label={s.title} className={i === step ? 'is-on' : ''} onClick={() => go(i)} />
            ))}
          </div>
          <span className="story__scroll">Scroll</span>
        </div>
      </div>
    </section>
  );
}
