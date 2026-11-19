'use client';

export default function Manifesto() {
  return (
    <section className="manifesto" id="maison">
      <div className="manifesto__sticky">
        <div className="manifesto__copy">
          <p className="eyebrow">
            <b>(01)</b> The Maison
          </p>
          <p className="manifesto__text serif split-words">
            Cut from the earth, set by hand, worn for a lifetime — <em>and then, for the next.</em> Every Verdelle necklace is a single
            emerald, a single family of artisans, and a promise that outlives us all.
          </p>
          <div className="manifesto__chips">
            <span className="pill">Since 1897</span>
            <span className="pill">Place Vendôme</span>
            <span className="pill">12 pieces a year</span>
          </div>
        </div>
        <div className="manifesto__ring" aria-hidden="true">
          <svg viewBox="0 0 200 200">
            <defs>
              <path id="circ" d="M100,100 m-82,0 a82,82 0 1,1 164,0 a82,82 0 1,1 -164,0" />
            </defs>
            <text>
              <textPath href="#circ">MAISON VERDELLE ✦ HAUTE JOAILLERIE ✦ PARIS ✦ EST. 1897 ✦ </textPath>
            </text>
          </svg>
        </div>
      </div>
    </section>
  );
}
