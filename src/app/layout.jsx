import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'Cerezo Studio Planner',
  description: 'Gestión audiovisual con estilo iOS.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-slate-950 text-slate-50`}>
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#38bdf8_0%,transparent_55%),radial-gradient(circle_at_bottom_right,#818cf8_0%,transparent_55%)] opacity-60 blur-3xl" />
        <div className="relative flex min-h-screen flex-col">{children}</div>
      </body>
    </html>
  );
}
