import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://mars-explorer-3d.raskkolnikovv.chatgpt.site'),
  title: 'Mars Explorer — Real terrain, one planet',
  description: 'Descend from a 3D Mars globe into a real 360° Perseverance rover panorama.',
  openGraph: {
    title: 'Mars Explorer',
    description: 'Real terrain · real rover view. Descend from orbit into a Perseverance panorama.',
    images: [{ url: '/og.png', width: 1728, height: 910, alt: 'Mars Explorer — Real terrain, one planet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mars Explorer',
    description: 'Real terrain · real rover view. Descend from orbit into a Perseverance panorama.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
