'use client';
import { CARD, variant } from '@/lib/store';
import { MiniView, NecklacePiece } from '../three/Minis';

const PANELS = [
  { n: '01', title: 'Temple', place: 'The art of relief', text: 'Lakshmi beneath an arch, carved peacocks and tiny golden bells. Antique surfaces hold shadows while their raised edges catch the light.', piece: variant('temple-choker') },
  { n: '02', title: 'Kundan & Jadau', place: 'Light in a gold setting', text: 'Flat, irregular polki stones rest in raised gold foil settings. Emerald drops and fine Meenakari edges complete the composition.', piece: variant('kundan-collar') },
  { n: '03', title: 'Guttapusalu', place: 'The poetry of pearls', text: 'Small bunches of white pearls gather below every floral motif. A ruby kemp centre anchors a generous fringe.', piece: variant('guttapusalu-princess') },
  { n: '04', title: 'Mango Mala', place: 'A symbol of abundance', text: 'Carved mango motifs repeat along a long haram. Ruby and emerald settings lead the eye to a sculptural paisley pendant.', piece: variant('haram-princess') },
  { n: '05', title: 'Your silhouette', place: 'Made for your celebration', text: 'High at the neck or falling in a long, graceful line. Explore each tradition as a choker, collar, princess or opera necklace.', piece: variant('temple-opera') },
];

export default function Atelier() {
  return (
    <section className="atelier" id="atelier">
      <div className="atelier__sticky">
        <header className="atelier__head">
          <p className="eyebrow"><b>(05)</b> The atelier</p>
          <h2 className="serif">Many traditions, <em>one celebration.</em></h2>
        </header>
        <div className="atelier__track">
          {PANELS.map((p) => (
            <article className="panel" key={p.n}>
              <div className="panel__num">{p.n}</div>
              <MiniView className="panel__view" z={CARD.z} fov={CARD.fov} stageLights>
                <NecklacePiece piece={p.piece} phase={Number(p.n)} />
              </MiniView>
              <div className="panel__body">
                <span className="panel__place">{p.place}</span>
                <h3 className="serif">{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </article>
          ))}
          <article className="panel panel--end"><p className="serif">From a living tradition<br /><em>to your family story.</em></p></article>
        </div>
        <div className="atelier__bar"><span /></div>
      </div>
    </section>
  );
}
