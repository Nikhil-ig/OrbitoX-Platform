import localFont from 'next/font/local';

export const fontInter = localFont({
  src: [
    {
      path: '../../public/fonts/inter-latin-400.woff2',
      weight: '400',
      style: 'normal',
    },
    {
      path: '../../public/fonts/inter-latin-600.woff2',
      weight: '600',
      style: 'normal',
    },
  ],
  variable: '--font-sans',
  display: 'swap',
});

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

