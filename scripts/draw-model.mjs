/* Paints the original model illustration used in place of the mannequin:
   lower face → neck → shoulders, 2400 × 1600, drawn in the bust's own
   proportions (166.7 px per bust unit, mid-neck at y = 496 px) so every
   procedural necklace sits exactly on her.
     node scripts/draw-model.mjs  →  public/model/illustration.webp        */
import sharp from 'sharp';
import fs from 'node:fs';

const W = 2400, H = 1600, cx = W / 2;
const X = (dx) => (cx + dx).toFixed(1);
// mirror a right-hand path segment list into the left side
const mirror = (pts) => pts.map(([x, y]) => [-x, y]);
const P = (pts) => pts.map(([x, y]) => `${X(x)},${y}`).join(' ');

/* ---- silhouette (right half, top → bottom), in px offsets from centre ---- */
const right = [
  // cheek down to the jaw angle
  ['M', [205, 0]],
  ['C', [212, 110], [206, 220], [180, 278]],
  // behind the jaw the neck takes over (neck half-width ≈ the bust's 0.74–0.93 units)
  ['C', [158, 312], [132, 336], [122, 372]],
  ['C', [124, 420], [127, 470], [131, 520]],
  ['C', [135, 580], [140, 610], [152, 640]],
  // trapezius → shoulder
  ['C', [210, 700], [330, 738], [470, 768]],
  ['C', [560, 784], [636, 812], [668, 885]],
  // arm
  ['C', [692, 960], [704, 1250], [722, 1600]],
];
function silhouette() {
  const seg = (s, flip) => {
    const [cmd, ...pts] = s;
    const p = flip ? mirror(pts) : pts;
    return `${cmd} ${P(p)}`;
  };
  // right side downwards, across the bottom, left side upwards (reversed)
  const r = right.map((s) => seg(s, false)).join(' ');
  const rev = [];
  for (let i = right.length - 1; i > 0; i--) {
    const [, ...cur] = right[i];
    const prevEnd = right[i - 1].slice(-1)[0];
    const c = cur.length === 3 ? [cur[1], cur[0], prevEnd] : [prevEnd];
    rev.push(`C ${P(mirror(c))}`);
  }
  return `${r} L ${X(-722)},1600 ${rev.join(' ')} Z`;
}

const face = `M ${X(-205)},0 C ${X(-212)},110 ${X(-206)},220 ${X(-180)},278
  C ${X(-148)},330 ${X(-90)},372 ${X(0)},384 C ${X(90)},372 ${X(148)},330 ${X(180)},278
  C ${X(206)},220 ${X(212)},110 ${X(205)},0 Z`;

const upperLip = `M ${X(-80)},190 C ${X(-62)},176 ${X(-40)},160 ${X(-22)},158 C ${X(-12)},157 ${X(-5)},163 ${X(0)},167
  C ${X(5)},163 ${X(12)},157 ${X(22)},158 C ${X(40)},160 ${X(62)},176 ${X(80)},190
  C ${X(42)},192 ${X(16)},187 ${X(0)},191 C ${X(-16)},187 ${X(-42)},192 ${X(-80)},190 Z`;
const lowerLip = `M ${X(-80)},190 C ${X(-42)},192 ${X(-16)},187 ${X(0)},191 C ${X(16)},187 ${X(42)},192 ${X(80)},190
  C ${X(62)},216 ${X(32)},233 ${X(0)},234 C ${X(-32)},233 ${X(-62)},216 ${X(-80)},190 Z`;
const lipLine = `M ${X(-80)},190 C ${X(-42)},192 ${X(-16)},187 ${X(0)},191 C ${X(16)},187 ${X(42)},192 ${X(80)},190`;

// off-shoulder silk blouse with a sweetheart neckline and a zari border
const blouseEdge = `M ${X(-760)},1010 C ${X(-620)},1018 ${X(-480)},1110 ${X(-390)},1190
  C ${X(-300)},1262 ${X(-150)},1262 ${X(-60)},1300 C ${X(-30)},1314 ${X(-10)},1335 ${X(0)},1356
  C ${X(10)},1335 ${X(30)},1314 ${X(60)},1300 C ${X(150)},1262 ${X(300)},1262 ${X(390)},1190
  C ${X(480)},1110 ${X(620)},1018 ${X(760)},1010`;
const blouse = `${blouseEdge} L ${X(760)},1600 L ${X(-760)},1600 Z`;

// long hair falling behind the shoulders: a soft outer contour with wavy, uneven tips
function hairSide(sgn) {
  const h = (x, y) => `${X(sgn * x)},${y}`;
  return `M ${h(196, 0)} C ${h(262, 0)} ${h(330, 0)} ${h(372, 0)}
    C ${h(392, 160)} ${h(400, 330)} ${h(424, 470)}
    C ${h(444, 590)} ${h(486, 650)} ${h(500, 720)}
    C ${h(486, 742)} ${h(470, 736)} ${h(456, 752)}
    C ${h(440, 770)} ${h(418, 742)} ${h(400, 760)}
    C ${h(380, 770)} ${h(360, 748)} ${h(340, 752)}
    C ${h(300, 720)} ${h(230, 690)} ${h(170, 650)}
    C ${h(150, 520)} ${h(150, 420)} ${h(178, 300)}
    C ${h(196, 200)} ${h(200, 90)} ${h(196, 0)} Z`;
}
const hair = `${hairSide(-1)} ${hairSide(1)}`;
const strands = [-1, 1].flatMap((sgn) => [0, 1, 2, 3, 4, 5].map((i) => {
  const x0 = 230 + i * 24, x1 = 330 + i * 26;
  return `<path d="M ${X(sgn * x0)},0 C ${X(sgn * (x0 + 30))},260 ${X(sgn * (x1 - 20))},480 ${X(sgn * x1)},${700 + (i % 3) * 18}" />`;
})).join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#ece1d3"/><stop offset="1" stop-color="#d9c7b0"/>
  </linearGradient>
  <linearGradient id="skin" x1="0" y1="0" x2="1" y2="0.25">
    <stop offset="0" stop-color="#d9a585"/><stop offset="0.45" stop-color="#c58f6d"/><stop offset="1" stop-color="#9d6447"/>
  </linearGradient>
  <linearGradient id="faceG" x1="0" y1="0" x2="1" y2="0.4">
    <stop offset="0" stop-color="#dcaa8a"/><stop offset="0.5" stop-color="#cb9573"/><stop offset="1" stop-color="#a86d4f"/>
  </linearGradient>
  <linearGradient id="silk" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#7e1f2e"/><stop offset="0.5" stop-color="#5c1220"/><stop offset="1" stop-color="#3f0a15"/>
  </linearGradient>
  <linearGradient id="lipU" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#9a5049"/><stop offset="1" stop-color="#7c3c37"/>
  </linearGradient>
  <linearGradient id="lipL" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8f4640"/><stop offset="0.55" stop-color="#ad5f55"/><stop offset="1" stop-color="#99534b"/>
  </linearGradient>
  <radialGradient id="vig" cx="0.5" cy="0.45" r="0.75">
    <stop offset="0.55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#3a2618" stop-opacity="0.35"/>
  </radialGradient>
  <linearGradient id="hairG" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#1a0f0a"/><stop offset="0.3" stop-color="#3b2418"/><stop offset="0.42" stop-color="#1c100b"/>
    <stop offset="0.58" stop-color="#1c100b"/><stop offset="0.7" stop-color="#33200f"/><stop offset="1" stop-color="#140b07"/>
  </linearGradient>
  <filter id="b2" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="2"/></filter>
  <filter id="b6" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="b14" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="b28" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="28"/></filter>
  <filter id="b60" filterUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><feGaussianBlur stdDeviation="60"/></filter>
  <clipPath id="body"><path d="${silhouette()}"/></clipPath>
  <clipPath id="faceClip"><path d="${face}"/></clipPath>
  <clipPath id="silkClip"><path d="${blouse}"/></clipPath>
</defs>

<!-- backdrop: warm linen with window light -->
<rect width="${W}" height="${H}" fill="url(#bg)"/>
<g filter="url(#b60)" opacity="0.5">
  <polygon points="1500,0 1760,0 1180,1600 920,1600" fill="#fff8ee"/>
  <polygon points="1880,0 2020,0 1440,1600 1300,1600" fill="#fff8ee"/>
  <polygon points="160,0 420,0 0,900 0,520" fill="#c9b49b"/>
</g>

<!-- hair falling behind the shoulders -->
<path d="${hair}" fill="url(#hairG)" filter="url(#b6)"/>
<g filter="url(#b6)" opacity="0.28" stroke="#7a5640" stroke-width="5" fill="none">${strands}</g>
<g filter="url(#b28)" opacity="0.35">
  <ellipse cx="${X(-330)}" cy="250" rx="34" ry="190" fill="#8a6248"/>
  <ellipse cx="${X(300)}" cy="230" rx="26" ry="170" fill="#5f412f"/>
</g>

<!-- skin -->
<g clip-path="url(#body)">
  <rect width="${W}" height="${H}" fill="url(#skin)"/>
  <!-- light from the upper left: shoulder highlight, right side falls into shade -->
  <ellipse cx="${X(-470)}" cy="860" rx="230" ry="170" fill="#f0c4a3" opacity="0.45" filter="url(#b60)"/>
  <ellipse cx="${X(520)}" cy="900" rx="240" ry="260" fill="#6e3f2b" opacity="0.35" filter="url(#b60)"/>
  <ellipse cx="${X(-120)}" cy="1080" rx="320" ry="200" fill="#e7b493" opacity="0.35" filter="url(#b60)"/>
  <!-- neck as a cylinder: darker edges, a soft lit front -->
  <ellipse cx="${X(-128)}" cy="500" rx="36" ry="190" fill="#7e4a33" opacity="0.4" filter="url(#b28)"/>
  <ellipse cx="${X(128)}" cy="500" rx="44" ry="200" fill="#64371f" opacity="0.5" filter="url(#b28)"/>
  <ellipse cx="${X(-28)}" cy="520" rx="48" ry="130" fill="#e6b391" opacity="0.32" filter="url(#b28)"/>
  <!-- shadow under the jaw -->
  <path d="M ${X(-175)},320 C ${X(-110)},400 ${X(-60)},420 ${X(0)},426 C ${X(60)},420 ${X(110)},400 ${X(175)},320" stroke="#5c3322" stroke-width="64" fill="none" opacity="0.55" filter="url(#b28)"/>
  <!-- sternocleidomastoid ridges -->
  <path d="M ${X(-114)},380 C ${X(-96)},480 ${X(-70)},590 ${X(-38)},668" stroke="#e2ae8c" stroke-width="20" fill="none" opacity="0.42" filter="url(#b14)"/>
  <path d="M ${X(-82)},400 C ${X(-66)},490 ${X(-46)},580 ${X(-18)},660" stroke="#8a5238" stroke-width="14" fill="none" opacity="0.28" filter="url(#b14)"/>
  <path d="M ${X(110)},380 C ${X(92)},480 ${X(68)},590 ${X(38)},668" stroke="#c48d6c" stroke-width="20" fill="none" opacity="0.38" filter="url(#b14)"/>
  <!-- suprasternal notch + collarbones -->
  <ellipse cx="${X(0)}" cy="676" rx="40" ry="22" fill="#6a3a27" opacity="0.45" filter="url(#b14)"/>
  <path d="M ${X(-42)},690 C ${X(-170)},698 ${X(-330)},716 ${X(-470)},770" stroke="#f2c6a5" stroke-width="18" fill="none" opacity="0.6" filter="url(#b6)"/>
  <path d="M ${X(-42)},716 C ${X(-170)},728 ${X(-330)},746 ${X(-470)},800" stroke="#7a4630" stroke-width="26" fill="none" opacity="0.35" filter="url(#b14)"/>
  <path d="M ${X(42)},690 C ${X(170)},698 ${X(330)},716 ${X(470)},770" stroke="#d9a483" stroke-width="18" fill="none" opacity="0.5" filter="url(#b6)"/>
  <path d="M ${X(42)},716 C ${X(170)},728 ${X(330)},746 ${X(470)},800" stroke="#5f331f" stroke-width="26" fill="none" opacity="0.38" filter="url(#b14)"/>
  <!-- chest falls gently into shade towards the neckline -->
  <ellipse cx="${X(0)}" cy="1420" rx="700" ry="260" fill="#7a4631" opacity="0.28" filter="url(#b60)"/>
  <path d="M ${X(0)},1230 L ${X(0)},1360" stroke="#5a301f" stroke-width="20" opacity="0.4" filter="url(#b14)"/>
  <!-- hair casts a soft shadow onto the shoulders -->
  <ellipse cx="${X(-330)}" cy="770" rx="150" ry="40" fill="#4a2818" opacity="0.35" filter="url(#b28)"/>
  <ellipse cx="${X(330)}" cy="770" rx="150" ry="40" fill="#4a2818" opacity="0.4" filter="url(#b28)"/>
  <!-- silk blouse, cut to her shoulders and arms -->
  <g clip-path="url(#silkClip)">
    <rect width="${W}" height="${H}" fill="url(#silk)"/>
    <path d="M ${X(-560)},1150 C ${X(-420)},1300 ${X(-260)},1420 ${X(-120)},1600" stroke="#b5465a" stroke-width="40" fill="none" opacity="0.35" filter="url(#b28)"/>
    <path d="M ${X(380)},1240 C ${X(300)},1380 ${X(240)},1480 ${X(200)},1600" stroke="#9a3346" stroke-width="30" fill="none" opacity="0.3" filter="url(#b28)"/>
    <path d="M ${X(-660)},1060 C ${X(-640)},1250 ${X(-600)},1420 ${X(-560)},1600" stroke="#a03a4e" stroke-width="26" fill="none" opacity="0.35" filter="url(#b14)"/>
    <rect x="${X(-60)}" y="1300" width="120" height="300" fill="#22050b" opacity="0.5" filter="url(#b28)"/>
  </g>
  <path d="${blouseEdge}" stroke="#2b0910" stroke-width="30" fill="none" opacity="0.5" filter="url(#b6)" transform="translate(0,14)"/>
  <path d="${blouseEdge}" stroke="#c99a4a" stroke-width="14" fill="none"/>
  <path d="${blouseEdge}" stroke="#f3d48e" stroke-width="3" fill="none" opacity="0.8" transform="translate(0,-4)"/>
  <path d="${blouseEdge}" stroke="#7a5320" stroke-width="2" fill="none" opacity="0.7" transform="translate(0,9)"/>
</g>

<!-- lower face -->
<g clip-path="url(#faceClip)">
  <rect width="${W}" height="420" fill="url(#faceG)"/>
  <ellipse cx="${X(-125)}" cy="200" rx="105" ry="170" fill="#ebbb9b" opacity="0.45" filter="url(#b28)"/>
  <ellipse cx="${X(155)}" cy="210" rx="85" ry="180" fill="#7b4631" opacity="0.42" filter="url(#b28)"/>
  <!-- base of the nose, cropped by the frame -->
  <ellipse cx="${X(0)}" cy="10" rx="70" ry="36" fill="#d9a585" opacity="0.6" filter="url(#b14)"/>
  <ellipse cx="${X(-34)}" cy="40" rx="20" ry="9" fill="#5e3222" opacity="0.55" filter="url(#b6)"/>
  <ellipse cx="${X(34)}" cy="40" rx="20" ry="9" fill="#5e3222" opacity="0.6" filter="url(#b6)"/>
  <ellipse cx="${X(4)}" cy="62" rx="64" ry="14" fill="#6d3d2a" opacity="0.45" filter="url(#b14)"/>
  <ellipse cx="${X(-6)}" cy="6" rx="26" ry="14" fill="#f2c8a8" opacity="0.5" filter="url(#b6)"/>
  <!-- philtrum -->
  <ellipse cx="${X(-16)}" cy="118" rx="9" ry="30" fill="#8e5640" opacity="0.35" filter="url(#b6)"/>
  <ellipse cx="${X(16)}" cy="118" rx="9" ry="30" fill="#8e5640" opacity="0.38" filter="url(#b6)"/>
  <ellipse cx="${X(0)}" cy="120" rx="9" ry="26" fill="#e8b897" opacity="0.4" filter="url(#b6)"/>
  <!-- mouth corners, under the lower lip, the lit chin -->
  <ellipse cx="${X(-86)}" cy="192" rx="12" ry="8" fill="#6a3826" opacity="0.4" filter="url(#b6)"/>
  <ellipse cx="${X(86)}" cy="192" rx="12" ry="8" fill="#6a3826" opacity="0.45" filter="url(#b6)"/>
  <ellipse cx="${X(0)}" cy="262" rx="64" ry="16" fill="#6f3d2a" opacity="0.4" filter="url(#b14)"/>
  <ellipse cx="${X(-10)}" cy="322" rx="80" ry="44" fill="#edbe9e" opacity="0.42" filter="url(#b14)"/>
  <!-- the jaw edge catches a little light -->
  <path d="M ${X(-180)},278 C ${X(-148)},330 ${X(-90)},372 ${X(0)},384" stroke="#f0c09f" stroke-width="8" fill="none" opacity="0.4" filter="url(#b6)"/>
  <path d="M ${X(180)},278 C ${X(148)},330 ${X(90)},372 ${X(0)},384" stroke="#5b311f" stroke-width="10" fill="none" opacity="0.35" filter="url(#b6)"/>
</g>

<!-- lips -->
<g filter="url(#b2)">
  <path d="${upperLip}" fill="url(#lipU)"/>
  <path d="${lowerLip}" fill="url(#lipL)"/>
</g>
<path d="${lipLine}" stroke="#4f2421" stroke-width="3.5" fill="none" filter="url(#b2)"/>
<ellipse cx="${X(6)}" cy="210" rx="30" ry="7" fill="#fff" opacity="0.22" filter="url(#b6)"/>
<ellipse cx="${X(-30)}" cy="168" rx="14" ry="4" fill="#fff" opacity="0.12" filter="url(#b2)"/>


<rect width="${W}" height="${H}" fill="url(#vig)"/>
</svg>`;

fs.mkdirSync('public/model', { recursive: true });
await sharp(Buffer.from(svg)).blur(0.5).webp({ quality: 88 }).toFile('public/model/illustration.webp');
if (process.argv.includes('--png')) await sharp(Buffer.from(svg)).png().toFile(process.argv[process.argv.indexOf('--png') + 1]);
console.log('public/model/illustration.webp');
