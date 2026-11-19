'use client';
import { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';

const QUICK = [
  { label: 'Collection', href: '#collection' },
  { label: 'Craft', href: '#story' },
  { label: 'Stories', href: '#maison' },
  { label: 'Atelier', href: '#atelier' },
];

const LINKS = [
  { n: '00', label: 'Stone to signature', href: '#story' },
  { n: '01', label: 'Collection', href: '#collection' },
  { n: '02', label: 'Anatomy', href: '#details' },
  { n: '03', label: 'The Keepsake', href: '#keepsake' },
  { n: '04', label: 'Atelier', href: '#atelier' },
  { n: '05', label: 'Private Viewing', href: '#contact' },
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
        <div className="nav__left">
          <button className="nav__menu" data-cursor={open ? 'Close' : 'Open'} onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
            <span className={`burger ${open ? 'is-open' : ''}`}>
              <i />
              <i />
            </span>
          </button>
          <nav className="nav__links" aria-label="Sections">
            {QUICK.map((l) => (
              <a key={l.href} href={l.href} onClick={(e) => go(e, l.href)}>{l.label}</a>
            ))}
          </nav>
        </div>
        <a href="#top" className="nav__logo" onClick={(e) => go(e, '#top')} aria-label="Zanvara Atelier home">
          <span>ZANVARA</span>
        </a>
        <div className="nav__right">
          <label className="nav__search">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
              <path d="M16 16 L21 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
            <input type="search" placeholder="Search" aria-label="Search the collection" />
          </label>
          <button className="nav__icon nav__bag" aria-label="Bag, 0 items" data-cursor="Bag">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6 8h12l-1 12H7L6 8Z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
              <path d="M9 8a3 3 0 0 1 6 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
            </svg>
            <b>0</b>
          </button>
          <a href="#contact" className="btn btn--green magnetic nav__book" onClick={(e) => go(e, '#contact')}>
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
          <p className="eyebrow">Zanvara Atelier · Bridal heirlooms</p>
          <p className="serif">
            Temple · Kundan & Jadau
            <br />
            Guttapusalu · Mango Mala
          </p>
          <p>Four living traditions, chosen for your celebration.</p>
          <p className="menu__mail">atelier@zanvara.com</p>
        </aside>
      </div>
    </>
  );
}
