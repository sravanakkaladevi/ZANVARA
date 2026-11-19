import { Anton, Instrument_Serif, Manrope } from 'next/font/google';
import './globals.css';
import './redesign.css';

const display = Anton({ weight: '400', subsets: ['latin'], variable: '--f-display', display: 'swap' });
const serif = Instrument_Serif({ weight: '400', style: ['normal', 'italic'], subsets: ['latin'], variable: '--f-serif', display: 'swap' });
const sans = Manrope({ subsets: ['latin'], variable: '--f-sans', display: 'swap' });

export const metadata = {
  title: 'Zanvara Atelier — Indian Bridal Heirlooms',
  description: 'Four Indian jewellery traditions, four lengths. Explore Temple, Kundan, Guttapusalu and Haram necklaces in procedural 3D.',
};

export const viewport = { themeColor: '#15110e' };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${serif.variable} ${sans.variable}`}>
      <body>{children}</body>
    </html>
  );
}
