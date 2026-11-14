import localFont from 'next/font/local';

export const fontPlusJakartaSans = localFont({
  src: [
    {
      path: '../../public/fonts/plus-jakarta-sans-latin.woff2',
      weight: '300 800',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

export const fontInter = fontPlusJakartaSans;

export const fontNotoDevanagari = localFont({
  src: [
    {
      path: '../../public/fonts/noto-sans-devanagari.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-hindi',
  display: 'swap',
});

export const fontJetBrainsMono = localFont({
  src: [
    {
      path: '../../public/fonts/jetbrains-mono-latin-400.woff2',
      weight: '400',
      style: 'normal',
    },
  ],
  variable: '--font-mono',
  display: 'swap',
});

