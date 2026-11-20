import type { Metadata } from 'next';
import './globals.css';
import BrainBackground from '@/components/BrainBackground';
import MusicPlayer from '@/components/MusicPlayer';

export const metadata: Metadata = {
  title: 'KeenChess',
  description: 'Play chess, solve puzzles, and study master games in the position explorer.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Outfit:wght@300;400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BrainBackground />
        {children}
        <MusicPlayer />
      </body>
    </html>
  );
}
