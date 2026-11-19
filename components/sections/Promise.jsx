'use client';
import { useEffect, useRef } from 'react';
import { CARD, variant, slotRef } from '@/lib/store';
import { MiniView, NecklacePiece } from '../three/Minis';

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
        <b>(04)</b> The promise
      </p>
      <h2 className="promise__title" aria-label="Turning your day into an heirloom for the future.">
        <span className="promise__line">
          <span className="grunge">TURNING</span>
          <span className="promise__slot" ref={slot}>
            <small className="promise__label promise__label--l">Hand-signed</small>
            <small className="promise__label promise__label--r">Certified forever</small>
          </span>
          <span className="grunge">YOUR DAY</span>
        </span>
        <span className="promise__line grunge">
          INTO AN <em>HEIRLOOM</em> FOR
        </span>
        <span className="promise__line">
          <span className="grunge">THE</span>
          <span className="promise__polaroid">
            <MiniView className="promise__polaroid-view" z={CARD.z} fov={CARD.fov} stageLights>
              <NecklacePiece piece={variant('guttapusalu-princess')} />
            </MiniView>
          </span>
          <span className="grunge">FUTURE.</span>
        </span>
      </h2>
      <div className="promise__peek" aria-hidden="true">
        <MiniView className="promise__peek-view" z={CARD.z} fov={CARD.fov} stageLights>
          <NecklacePiece piece={variant('haram-princess')} />
        </MiniView>
      </div>
    </section>
  );
}
