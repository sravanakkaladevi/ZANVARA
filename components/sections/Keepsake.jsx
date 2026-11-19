'use client';

const STEPS = ['Laid in velvet', 'Sealed by hand', 'Yours, forever'];

export default function Keepsake() {
  return (
    <section className="keepsake" id="keepsake">
      <div className="keepsake__sticky">
        <div className="keepsake__light" aria-hidden="true" />
        <div className="keepsake__word grunge" aria-hidden="true">
          KEEPSAKE
        </div>
        <div className="keepsake__copy">
          <p className="eyebrow">
            <b>(03)</b> The keepsake
          </p>
          <h2 className="serif">
            Your bridal heirloom, nestled in <em>midnight velvet</em>, ready for its next celebration.
          </h2>
        </div>
        <ol className="keepsake__steps">
          {STEPS.map((s, i) => (
            <li key={s} className="keepsake__step">
              <span>0{i + 1}</span>
              {s}
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
