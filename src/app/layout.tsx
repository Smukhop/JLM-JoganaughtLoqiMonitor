import type { Metadata, Viewport } from 'next';
import { Michroma, Sora, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const display = Michroma({ weight: '400', subsets: ['latin'], variable: '--font-display', display: 'swap' });
const body = Sora({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono', display: 'swap' });

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Loqi Omniverse — Nine Worlds Agentic OS',
    template: '%s · Loqi Omniverse'
  },
  description:
    'Nine autonomous agent worlds under Sol Quasar command. Plan a mission, watch the army execute it in parallel, take the report.',
  openGraph: {
    title: 'Loqi Omniverse — Nine Worlds Agentic OS',
    description: 'Nine autonomous agent worlds under Sol Quasar command.',
    type: 'website'
  },
  robots: { index: true, follow: true },
  manifest: '/site.webmanifest',
  icons: { icon: '/favicon.svg', apple: '/favicon.svg' }
};

export const viewport: Viewport = {
  themeColor: '#05060a',
  colorScheme: 'dark'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
