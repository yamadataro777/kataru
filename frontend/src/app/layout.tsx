import type { Metadata } from 'next';
import './globals.css';
import ScanLines from '@/components/ui/ScanLines';

export const metadata: Metadata = {
  title: 'KATARU — 声で考えを整理するAIツール',
  description:
    '話すだけで、考えが整理される。声で考えを整理するAIツール。',
  openGraph: {
    title: 'KATARU — 声で考えを整理するAIツール',
    description:
      '話すだけで、考えが整理される。声で考えを整理するAIツール。',
    siteName: 'Kataru',
    locale: 'ja_JP',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'KATARU — 声で考えを整理するAIツール',
    description:
      '話すだけで、考えが整理される。声で考えを整理するAIツール。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        style={{ fontFamily: "'Menlo', 'Courier New', monospace" }}
        className="antialiased"
      >
        <div className="relative w-full max-w-[390px] min-h-dvh mx-auto bg-bg-primary overflow-hidden">
          {children}
        </div>
        <ScanLines />
      </body>
    </html>
  );
}
