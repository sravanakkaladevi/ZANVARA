'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

export default function Cursor() {
  const dot = useRef();
  const ring = useRef();
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches) return;
    document.documentElement.classList.add('has-cursor');
    const xd = gsap.quickTo(dot.current, 'x', { duration: 0.08 });
    const yd = gsap.quickTo(dot.current, 'y', { duration: 0.08 });
    const xr = gsap.quickTo(ring.current, 'x', { duration: 0.45, ease: 'power3' });
    const yr = gsap.quickTo(ring.current, 'y', { duration: 0.45, ease: 'power3' });
    const move = (e) => {
      document.documentElement.classList.add('cursor-ready');
      xd(e.clientX);
      yd(e.clientY);
      xr(e.clientX);
      yr(e.clientY);
    };
    const over = (e) => {
      const el = e.target.closest('[data-cursor], a, button');
      if (el) {
        ring.current.classList.add('is-hover');
        setLabel(el.getAttribute('data-cursor') || '');
      } else {
        ring.current.classList.remove('is-hover');
        setLabel('');
      }
    };
    // magnetic buttons
    const mags = [];
    document.querySelectorAll('.magnetic').forEach((el) => {
      const mx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      const my = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1,0.4)' });
      const mm = (e) => {
        const r = el.getBoundingClientRect();
        mx((e.clientX - (r.left + r.width / 2)) * 0.35);
        my((e.clientY - (r.top + r.height / 2)) * 0.35);
      };
      const ml = () => {
        mx(0);
        my(0);
      };
      el.addEventListener('pointermove', mm);
      el.addEventListener('pointerleave', ml);
      mags.push(() => {
        el.removeEventListener('pointermove', mm);
        el.removeEventListener('pointerleave', ml);
      });
    });
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerover', over);
    return () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerover', over);
      mags.forEach((f) => f());
    };
  }, []);

  return (
    <>
      <div className="cursor-dot" ref={dot} />
      <div className="cursor-ring" ref={ring}>
        <span>{label}</span>
      </div>
    </>
  );
}
