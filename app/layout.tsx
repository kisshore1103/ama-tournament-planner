import type { Metadata, Viewport } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'AMA Tatami Planner',
  description: 'Your club. Every student. The next Tatami.',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: 'AMA Planner', statusBarStyle: 'default' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#102e2b' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <a className="skip-link" href="#main">
          Skip to schedule
        </a>
        {children}
      </body>
    </html>
  );
}
