'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const LINKS = [
  { n: '01', label: 'The Maison', href: '#maison' },
  { n: '02', label: 'Collection', href: '#collection' },
  { n: '03', label: 'Anatomy', href: '#details' },
  { n: '04', label: 'The Keepsake', href: '#keepsake' },
  { n: '05', label: 'Atelier', href: '#atelier' },
  { n: '06', label: 'Private Viewing', href: '#contact' },
];

export function Monogram({ className }) {
  return (
    <svg className={className} viewBox="0 0 64 64" aria-hidden="true">
      <path d="M22 6 H42 L52 16 V30 L32 58 L12 30 V16 Z" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M12 16 H52 M22 6 L26 16 L32 58 L38 16 L42 6 M26 16 L32 6 L38 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default function Nav({ lenisRef }) {
  const [open, setOpen] = useState(false);
  const menu = useRef();
  const tl = useRef();

  useEffect(() => {
    const ctx = gsap.context(() => {
      tl.current = gsap
        .timeline({ paused: true })
        .set(menu.current, { display: 'grid' })
        .fromTo(menu.current, { clipPath: 'circle(0% at 3% 3%)' }, { clipPath: 'circle(150% at 3% 3%)', duration: 1.1, ease: 'expo.inOut' })
        .from('.menu__link span', { yPercent: 110, duration: 0.9, stagger: 0.06, ease: 'expo.out' }, '-=0.5')
        .from('.menu__aside > *', { autoAlpha: 0, y: 20, stagger: 0.08, duration: 0.6 }, '<0.2');
    });
    return () => ctx.revert();
  }, []);

  useEffect(() => {
    if (!tl.current) return;
    document.body.classList.toggle('menu-open', open);
    if (open) {
      lenisRef.current?.stop();
      tl.current.timeScale(1).play();
    } else {
      lenisRef.current?.start();
      tl.current.timeScale(1.6).reverse();
    }
  }, [open, lenisRef]);

  const go = (e, href) => {
    e.preventDefault();
    setOpen(false);
    setTimeout(() => lenisRef.current?.scrollTo(href, { duration: 2.2 }), 450);
  };

  return (
    <>
      <header className="nav">
        <button className="nav__menu" data-cursor={open ? 'Close' : 'Open'} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          <span className={`burger ${open ? 'is-open' : ''}`}>
            <i />
            <i />
          </span>
          <span>{open ? 'Close' : 'Menu'}</span>
        </button>
        <a href="#top" className="nav__logo" onClick={(e) => go(e, '#top')} aria-label="Verdelle home">
          <Monogram className="nav__mono" />
          <span>VERDELLE</span>
        </a>
        <div className="nav__right">
          <button className="nav__icon" aria-label="Search" data-cursor="Search">
            <svg viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16 L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
          <a href="#contact" className="btn btn--green magnetic" onClick={(e) => go(e, '#contact')}>
            <span>Book a viewing</span>
          </a>
        </div>
      </header>

      <div className="menu" ref={menu}>
        <nav className="menu__links">
          {LINKS.map((l) => (
            <a key={l.n} href={l.href} className="menu__link" onClick={(e) => go(e, l.href)} data-cursor="Go">
              <span>
                <em>{l.n}</em>
                {l.label}
              </span>
            </a>
          ))}
        </nav>
        <aside className="menu__aside">
          <p className="eyebrow">Maison Verdelle</p>
          <p className="serif">
            12 Place Vendôme
            <br />
            75001 Paris
          </p>
          <p>By appointment only — Monday to Saturday, 10h – 19h.</p>
          <p className="menu__mail">atelier@verdelle.example</p>
        </aside>
      </div>
    </>
  );
}
