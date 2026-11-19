'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function Preloader({ onDone }) {
  const root = useRef();
  const [n, setN] = useState(0);

  useEffect(() => {
    const o = { v: 0 };
    const tl = gsap.timeline();
    tl.to(o, { v: 100, duration: 2.4, ease: 'power2.inOut', onUpdate: () => setN(Math.round(o.v)) })
      .to('.pre__gem', { rotate: 180, scale: 0.6, duration: 0.6, ease: 'power3.in' }, '-=0.3')
      .to('.pre__line', { scaleX: 0, transformOrigin: 'right', duration: 0.5, ease: 'power3.in' }, '<')
      .to('.pre__inner', { yPercent: -30, autoAlpha: 0, duration: 0.6, ease: 'power3.in' }, '<0.1')
      .add(() => onDone?.())
      .to(root.current, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '<')
      .set(root.current, { display: 'none' });
    return () => tl.kill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pre" ref={root}>
      <div className="pre__inner">
        <svg className="pre__gem" viewBox="0 0 100 100" aria-hidden="true">
          <path d="M30 8 H70 L92 30 V70 L70 92 H30 L8 70 V30 Z" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path d="M38 22 H62 L78 38 V62 L62 78 H38 L22 62 V38 Z" fill="none" stroke="currentColor" strokeWidth="1" />
          <path d="M30 8 L38 22 M70 8 L62 22 M92 30 L78 38 M92 70 L78 62 M70 92 L62 78 M30 92 L38 78 M8 70 L22 62 M8 30 L22 38" stroke="currentColor" strokeWidth="1" />
        </svg>
        <div className="pre__brand">Zanvara Atelier</div>
        <div className="pre__count">
          <span>{String(n).padStart(3, '0')}</span>
        </div>
        <div className="pre__line" style={{ transform: `scaleX(${n / 100})` }} />
        <div className="pre__meta">
          <span>Indian bridal heirlooms</span>
          <span>Four living traditions</span>
        </div>
      </div>
    </div>
  );
}
