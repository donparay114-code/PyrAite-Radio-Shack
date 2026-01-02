import type { Metadata } from 'next';
import '@/styles/globals.css';

export const metadata: Metadata = {
  title: 'PYrte Radio Shack - AI Community Radio',
  description: 'Community-driven multi-channel radio platform powered by AI music generation',
  keywords: ['radio', 'music', 'AI', 'Suno', 'community', 'streaming'],
  authors: [{ name: 'PYrte Radio Shack Team' }],
  openGraph: {
    title: 'PYrte Radio Shack',
    description: 'AI-powered community radio with multiple genre channels',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className="min-h-screen bg-background-primary text-text-primary antialiased">
        {children}
      </body>
    </html>
  );
}
