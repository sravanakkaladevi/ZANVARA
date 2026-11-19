'use client';
import { MiniView, RawCrystal, EmeraldGem, Diamond, ChainCoil, PendantPiece } from '../three/Minis';
import { ImagePiece } from '../three/ImagePiece';

/* Each panel shows a generated product photo (transparent PNG in /public/atelier)
   lifted into 3D by <ImagePiece>. Until the PNG exists the procedural model is shown. */
const PANELS = [
  { n: '01', title: 'The Earth', place: 'Muzo, Colombia', text: 'Our emeralds are traced to a single mine in the Boyacá mountains, chosen crystal by crystal for their velvet green.', img: '/atelier/01-earth.png', depth: 0.45, fallback: <RawCrystal />, z: 4.2 },
  { n: '02', title: 'The Cut', place: 'Antwerp', text: 'Fifty-eight steps cut over nine days. The stone decides the shape — we only follow its light.', img: '/atelier/02-cut.png', depth: 0.35, fallback: <EmeraldGem scale={2.9} />, z: 4.2 },
  { n: '03', title: 'The Setting', place: 'Place Vendôme', text: 'Twenty-two brilliants are seated one by one beneath the loupe, each prong shaped by hand.', img: '/atelier/03-setting.png', depth: 0.3, fallback: <Diamond scale={0.82} />, z: 4 },
  { n: '04', title: 'The Chain', place: 'Our Paris atelier', text: 'Four hundred links soldered and polished so the necklace falls like silk against the skin.', img: '/atelier/04-chain.png', depth: 0.25, fallback: <ChainCoil />, z: 4.4 },
  { n: '05', title: 'The Heirloom', place: 'Yours', text: 'Signed, numbered and registered to your family. Serviced by the maison for as long as it is worn.', img: '/atelier/05-heirloom.png', depth: 0.3, fallback: <PendantPiece scale={1.7} speed={0.5} />, z: 5 },
];

export default function Atelier() {
  return (
    <section className="atelier" id="atelier">
      <div className="atelier__sticky">
        <header className="atelier__head">
          <p className="eyebrow">
            <b>(06)</b> The atelier
          </p>
          <h2 className="serif">
            Five hands, <em>one heirloom.</em>
          </h2>
        </header>
        <div className="atelier__track">
          {PANELS.map((p) => (
            <article className="panel" key={p.n}>
              <div className="panel__num">{p.n}</div>
              <MiniView className="panel__view" z={p.z}>
                <ImagePiece src={p.img} depth={p.depth} height={0.46 * p.z} fallback={p.fallback} />
              </MiniView>
              <div className="panel__body">
                <span className="panel__place">{p.place}</span>
                <h3 className="serif">{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </article>
          ))}
          <article className="panel panel--end">
            <p className="serif">
              From a mountain in Colombia
              <br />
              <em>to the hollow of your throat.</em>
            </p>
          </article>
        </div>
        <div className="atelier__bar">
          <span />
        </div>
      </div>
    </section>
  );
}
