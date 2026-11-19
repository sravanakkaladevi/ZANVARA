'use client';
import { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { View } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';

import { FrameClear } from './three/env';
import { Stage } from './three/Stage';
import { pointer } from '@/lib/store';
import { setupChoreography } from '@/lib/choreography';

import Preloader from './sections/Preloader';
import Nav from './sections/Nav';
import Cursor from './sections/Cursor';
import Story from './sections/Story';
import Models from './sections/Models';
import Details from './sections/Details';
import Keepsake from './sections/Keepsake';
import PromiseSection from './sections/Promise';
import Maison from './sections/Maison';
import Atelier from './sections/Atelier';
import Numbers from './sections/Numbers';
import Footer from './sections/Footer';

gsap.registerPlugin(ScrollTrigger);

// Preserve smooth movement on integrated GPUs without changing the jewellery.
// The lower bound still uses antialiasing; only framebuffer resolution changes.
function FrameBudget() {
  const setDpr = useThree((state) => state.setDpr);
  const budget = useRef({ started: 0, start: 0, frames: 0 });
  useFrame(({ gl }) => {
    const b = budget.current;
    const now = performance.now();
    if (!b.started) b.started = now;
    if (now - b.started < 3500 || document.hidden) { b.start = now; b.frames = 0; return; }
    b.frames++;
    const elapsed = (now - b.start) / 1000;
    if (elapsed < 1.5) return;
    const fps = b.frames / elapsed;
    const current = gl.getPixelRatio();
    // never render below native resolution — fine jewellery turns to mush under 1×
    if (fps < 50 && current > 1) setDpr(Math.max(1, current * Math.sqrt(Math.max(0.5, fps / 60))));
    b.start = now; b.frames = 0;
  });
  return null;
}

export default function Experience() {
  const [loaded, setLoaded] = useState(false);
  const lenisRef = useRef(null);

  // smooth scroll
  useEffect(() => {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9 });
    lenisRef.current = lenis;
    window.__lenis = lenis;
    lenis.stop();
    lenis.on('scroll', ScrollTrigger.update);
    const tick = (time) => lenis.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);

    const onMove = (e) => {
      pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener('pointermove', onMove);
    return () => {
      gsap.ticker.remove(tick);
      lenis.destroy();
      window.removeEventListener('pointermove', onMove);
    };
  }, []);

  // scroll choreography of the 3D stage + DOM
  useEffect(() => {
    const ctx = gsap.context(() => setupChoreography());
    const refresh = () => ScrollTrigger.refresh();
    document.fonts?.ready.then(refresh);
    window.addEventListener('load', refresh);
    return () => {
      ctx.revert();
      window.removeEventListener('load', refresh);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    lenisRef.current?.start();
    window.dispatchEvent(new Event('verdelle:intro'));
    ScrollTrigger.refresh();
  }, [loaded]);

  return (
    <>
      <svg className="defs" aria-hidden="true">
        <filter id="grunge" x="0" y="0" width="100%" height="100%">
          {/* fine grit, modulated by large blotches → patchy, printed-ink wear */}
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4" result="fine" />
          <feColorMatrix in="fine" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="fineO" />
          <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="3" seed="9" result="coarse" />
          <feColorMatrix in="coarse" type="matrix" values="1 0 0 0 0  1 0 0 0 0  1 0 0 0 0  0 0 0 0 1" result="coarseO" />
          <feComposite in="fineO" in2="coarseO" operator="arithmetic" k1="0" k2="0.5" k3="0.8" k4="-0.15" result="mix" />
          <feColorMatrix in="mix" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  -16 0 0 0 10.3" result="mask" />
          <feComposite in="SourceGraphic" in2="mask" operator="in" />
        </filter>
      </svg>

      <Preloader onDone={() => setLoaded(true)} />
      <Cursor />
      <Nav lenisRef={lenisRef} />

      <main id="top">
        <Story />
        <Models />
        <Details />
        <Keepsake />
        <PromiseSection />
        <Maison />
        <Atelier />
        <Numbers />
        <Footer />
      </main>

      {/* full-screen tracking element for the persistent stage */}
      <View className="stage-view" index={1}>
        <Stage />
      </View>

      <div className="gl">
        <Canvas
          eventSource={typeof document !== 'undefined' ? document.body : undefined}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = THREE.ACESFilmicToneMapping;
            gl.toneMappingExposure = 1.12;
            // Tiny cabochons retain their optics with a smaller transmission buffer.
            gl.transmissionResolutionScale = 0.5;
            gl.setClearColor(0x000000, 0);
          }}
        >
          <FrameBudget />
          <FrameClear />
          <View.Port />
        </Canvas>
      </div>

      <div className="grain" aria-hidden="true" />
    </>
  );
}
