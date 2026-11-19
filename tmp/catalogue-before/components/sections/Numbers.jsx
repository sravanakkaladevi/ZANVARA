'use client';

const STATS = [
  { v: 312, suf: 'h', label: 'Hours of handwork in a single necklace' },
  { v: 4.2, dec: 2, suf: 'ct', label: 'Of Muzo emerald at its heart' },
  { v: 22, label: 'Brilliants, set one by one' },
  { v: 12, label: 'Pieces made each year — never more' },
];

const QUOTES = [
  '“The most beautiful green I have ever seen.” — Vogue Paris',
  '“Jewellery that feels like inheritance.” — The Gentlewoman',
  '“Verdelle makes time visible.” — Le Figaro',
  '“A quiet masterpiece.” — Harper’s Bazaar',
];

export default function Numbers() {
  return (
    <section className="numbers">
      <div className="numbers__grid">
        {STATS.map((s) => (
          <div className="stat" key={s.label}>
            <div className="stat__v">
              <span className="count" data-to={s.v} data-dec={s.dec || 0}>
                0
              </span>
              {s.suf && <sup>{s.suf}</sup>}
            </div>
            <p>{s.label}</p>
          </div>
        ))}
      </div>
      <div className="marquee" aria-hidden="true">
        <div className="marquee__inner">
          {[0, 1].map((k) => (
            <div className="marquee__set" key={k}>
              {QUOTES.map((q) => (
                <span key={q + k}>
                  {q}
                  <i>✦</i>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
