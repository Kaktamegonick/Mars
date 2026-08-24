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
  title: 'Mars Explorer — Real terrain, one planet',
  description: 'Explore Mars in 3D using NASA and USGS terrain data.',
  openGraph: {
    title: 'Mars Explorer',
    description: 'Real terrain · One planet. Explore Mars in 3D.',
    images: [{ url: '/og.png', width: 1728, height: 910, alt: 'Mars Explorer — Real terrain, one planet' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Mars Explorer',
    description: 'Real terrain · One planet. Explore Mars in 3D.',
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
