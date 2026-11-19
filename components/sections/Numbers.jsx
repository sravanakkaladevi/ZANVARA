'use client';

const STATS = [
  { v: 4, label: 'Indian jewellery traditions to discover' },
  { v: 4, label: 'Lengths, from choker to opera' },
  { v: 16, label: 'Expressions in the bridal collection' },
  { v: 22, suf: 'k', label: 'Gold, with antique and polished finishes' },
];

const QUOTES = [
  'Temple · Sculpted stories in gold',
  'Kundan & Jadau · Light held close',
  'Guttapusalu · The poetry of pearls',
  'Mango Mala · A rhythm of abundance',
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
