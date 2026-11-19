import { Anton, Instrument_Serif, Manrope } from 'next/font/google';
import './globals.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--f-display', display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--f-serif', display: 'swap' });
const sans = Manrope({ subsets: ['latin'], variable: '--f-sans', display: 'swap' });

export const metadata = {
  title: 'Verdelle — Émeraude Éternelle',
  description: 'Maison Verdelle · Haute joaillerie. The Émeraude Éternelle necklace, in 3D.',
};

export const viewport = { themeColor: '#0d3b26' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
