'use client';
import { useState } from 'react';
import { Monogram } from './Nav';

export default function Footer() {
  const [sent, setSent] = useState(false);
  return (
    <footer className="footer" id="contact">
      <div className="footer__cta">
        <p className="eyebrow">
          <b>(07)</b> By appointment
        </p>
        <h2 className="serif">
          Try it on, <em>in private.</em>
        </h2>
        <a href="#contact" className="btn-big magnetic" data-cursor="Book" onClick={(e) => e.preventDefault()}>
          <span>Book a viewing</span>
          <i>→</i>
        </a>
      </div>

      <div className="footer__grid">
        <div>
          <p className="eyebrow">Salon</p>
          <p>
            12 Place Vendôme
            <br />
            75001 Paris, France
          </p>
        </div>
        <div>
          <p className="eyebrow">Follow</p>
          <p>
            <a href="#contact">Instagram</a>
            <br />
            <a href="#contact">Pinterest</a>
            <br />
            <a href="#contact">Journal</a>
          </p>
        </div>
        <form
          className="footer__news"
          onSubmit={(e) => {
            e.preventDefault();
            setSent(true);
          }}
        >
          <p className="eyebrow">Letters from the atelier</p>
          {sent ? (
            <p className="serif">Merci — the next letter is yours.</p>
          ) : (
            <div className="field">
              <input type="email" required placeholder="Your email" aria-label="Email" />
              <button type="submit" aria-label="Subscribe">
                →
              </button>
            </div>
          )}
        </form>
      </div>

      <div className="footer__brand grunge" aria-hidden="true">
        VERDELLE
      </div>
      <div className="footer__bottom">
        <Monogram className="footer__mono" />
        <span>© 2026 Maison Verdelle — Concept experience</span>
        <a href="#top" onClick={(e) => (e.preventDefault(), window.__lenis?.scrollTo(0, { duration: 2.5 }))}>
          Back to top ↑
        </a>
      </div>
    </footer>
  );
}
