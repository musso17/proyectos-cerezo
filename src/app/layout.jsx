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
        <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_top_left,#14532d_0%,transparent_55%),radial-gradient(circle_at_bottom_right,#0f172a_0%,transparent_55%)] opacity-70 blur-3xl" />
        <div className="relative flex min-h-screen flex-col">
          <main className="mx-auto w-full max-w-screen-lg px-4 sm:px-6 lg:px-8 flex-1 py-6 sm:py-8 lg:py-10">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
