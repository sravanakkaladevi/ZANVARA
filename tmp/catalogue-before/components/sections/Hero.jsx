'use client';
import { useEffect } from 'react';
import gsap from 'gsap';
import { MiniView, EmeraldGem, Diamond } from '../three/Minis';
import { S } from '@/lib/store';

export default function Hero() {
  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.set('.hero__line > span', { yPercent: 105 });
      gsap.set(['.hero .pill', '.hero__words span', '.hero__scroll'], { autoAlpha: 0, y: 24 });
      gsap.set('.hero .polaroid', { autoAlpha: 0, y: 140, rotate: (i) => (i ? 24 : -24) });
    });
    const play = () => {
      const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
      tl.to(S, { iy: 0, duration: 2.4, ease: 'expo.out' }, 0.15)
        .to(S, { ispin: 0, duration: 2.8, ease: 'power4.out' }, 0.15)
        .to('.hero__line > span', { yPercent: 0, duration: 1.6, stagger: 0.12 }, 0.1)
        .to('.hero .polaroid', { autoAlpha: 1, y: 0, rotate: (i) => (i ? 7 : -9), duration: 1.6, stagger: 0.12 }, 0.7)
        .to(['.hero .pill', '.hero__words span', '.hero__scroll'], { autoAlpha: 1, y: 0, duration: 1.2, stagger: 0.06 }, 0.9);
    };
    window.addEventListener('verdelle:intro', play, { once: true });
    return () => {
      window.removeEventListener('verdelle:intro', play);
      ctx.revert();
    };
  }, []);

  return (
    <section className="hero" id="hero">
      <div className="hero__bg" aria-hidden="true" />
      <span className="pill hero__pill hero__pill--l">Exclusive craftsmanship</span>
      <span className="pill hero__pill hero__pill--r">Collection N°04</span>

      <h1 className="hero__title grunge" aria-label="Émeraude Éternelle">
        <span className="hero__line hero__line--1">
          <span>ÉMERAUDE</span>
        </span>
        <span className="hero__line hero__line--2">
          <span>ÉTERNELLE</span>
        </span>
      </h1>

      <figure className="polaroid hero__polaroid hero__polaroid--l" data-cursor="Emerald">
        <MiniView className="polaroid__view" z={4.2}>
          <EmeraldGem scale={2.9} />
        </MiniView>
        <figcaption>
          <b>Hand-cut emerald</b>
          <span>Muzo, Colombia — 4.20 ct</span>
        </figcaption>
      </figure>

      <figure className="polaroid hero__polaroid hero__polaroid--r" data-cursor="Diamond">
        <MiniView className="polaroid__view" z={4}>
          <Diamond scale={1.05} />
        </MiniView>
        <figcaption>
          <b>Halo of light</b>
          <span>22 brilliant-cut diamonds</span>
        </figcaption>
      </figure>

      <div className="hero__words">
        <span>Elegant.</span>
        <span>Precious.</span>
        <span className="hero__scroll">
          <i />
          Scroll to discover
        </span>
        <span>Eternal.</span>
      </div>
    </section>
  );
}
