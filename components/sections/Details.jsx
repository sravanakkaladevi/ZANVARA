'use client';
import { useEffect, useState } from 'react';

/* label position (x,y in % of viewport) → elbow → anchor on the pendant */
export const CALLOUTS = [
  { label: 'Ruby & emerald kemp', sub: 'Rich colour in domed cabochons', at: [14, 31], elbow: [32, 31], to: [47, 45] },
  { label: 'A rhythm of motifs', sub: 'Peacocks, flowers and mangoes', at: [77, 17], elbow: [62, 17], to: [50.4, 24] },
  { label: 'Raised gold relief', sub: 'Sculpted layers and granule borders', at: [85, 41], elbow: [70, 41], to: [58.6, 37] },
  { label: 'Warm 22k gold', sub: 'Antique patina or a polished finish', at: [11, 59], elbow: [30, 59], to: [43.6, 57] },
  { label: 'A living fringe', sub: 'Pearl bunches and golden ghungroo', at: [18, 84], elbow: [36, 84], to: [49.6, 80] },
  { label: 'The centrepiece', sub: 'An expression of each tradition', at: [80, 78], elbow: [66, 78], to: [57.4, 64] },
];

export default function Details() {
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    on();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  const px = ([x, y]) => `${(x / 100) * vp.w},${(y / 100) * vp.h}`;

  return (
    <section className="details" id="details">
      <div className="details__sticky">
        <div className="details__fabric" aria-hidden="true" />
        <svg className="details__lines" viewBox={`0 0 ${vp.w} ${vp.h}`} aria-hidden="true">
          {CALLOUTS.map((c, i) => (
            <polyline key={i} className="details__line" points={`${px(c.at)} ${px(c.elbow)} ${px(c.to)}`} pathLength="1" />
          ))}
        </svg>
        {CALLOUTS.map((c, i) => (
          <span key={i} className="details__dot" style={{ left: `${c.to[0]}%`, top: `${c.to[1]}%` }} />
        ))}
        <div className="details__labels">
          {CALLOUTS.map((c, i) => (
            <div key={i} className="callout" style={{ left: `${c.at[0]}%`, top: `${c.at[1]}%` }}>
              <b>{c.label}</b>
              <small>{c.sub}</small>
            </div>
          ))}
        </div>
        <div className="details__caption">
          <p className="eyebrow">
            <b>(02)</b> Anatomy of an heirloom
          </p>
          <h2 className="serif">
            Every detail, <em>a story.</em>
          </h2>
        </div>
        <div className="details__progress">
          <span />
        </div>
      </div>
    </section>
  );
}
