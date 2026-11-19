'use client';
import { useEffect, useRef } from 'react';
import { slotRef } from '@/lib/store';
import { MiniView, PendantPiece } from '../three/Minis';

export default function PromiseSection() {
  const slot = useRef();
  useEffect(() => {
    slotRef.el = slot.current;
    return () => (slotRef.el = null);
  }, []);

  return (
    <section className="promise" id="promise">
      <div className="promise__light" aria-hidden="true" />
      <p className="eyebrow promise__eyebrow">
        <b>(05)</b> The promise
      </p>
      <h2 className="promise__title" aria-label="Turning every day into a promise for the future.">
        <span className="promise__line">
          <span className="grunge">TURNING</span>
          <span className="promise__slot" ref={slot}>
            <small className="promise__label promise__label--l">Hand-signed</small>
            <small className="promise__label promise__label--r">Certified forever</small>
          </span>
          <span className="grunge">EVERY DAY</span>
        </span>
        <span className="promise__line grunge">
          INTO A <em>PROMISE</em> FOR
        </span>
        <span className="promise__line">
          <span className="grunge">THE</span>
          <span className="promise__polaroid">
            <MiniView className="promise__polaroid-view" z={4.6}>
              <PendantPiece metal="#efb59a" gem="#c0123c" emissive="#3f0513" scale={1.5} speed={0.7} />
            </MiniView>
          </span>
          <span className="grunge">FUTURE.</span>
        </span>
      </h2>
      <div className="promise__peek" aria-hidden="true">
        <MiniView className="promise__peek-view" z={4} fov={32}>
          <PendantPiece metal="#e4e8ee" gem="#2342c4" emissive="#06123f" scale={1.55} speed={0.25} />
        </MiniView>
      </div>
    </section>
  );
}
