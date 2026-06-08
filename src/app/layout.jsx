import './globals.css';
import { Inter } from 'next/font/google';
import ThemeManager from '../components/ThemeManager';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const metadata = {
  title: 'Cerezo Studio Planner',
  applicationName: 'Cerezo',
  description: 'Planificador de producción audiovisual de Cerezo',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    title: 'Cerezo',
    statusBarStyle: 'black-translucent',
  },
  formatDetection: { telephone: false },
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  // Soporte genérico (Android/Chrome) además del apple-mobile-web-app-capable.
  other: {
    'mobile-web-app-capable': 'yes',
  },
};

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  // Necesario para que el contenido use toda la pantalla y funcionen los safe-area insets.
  viewportFit: 'cover',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-background text-primary antialiased transition-colors duration-300`}>
        <ThemeManager>
          {/* safe-area-inset-top: con la barra de estado translúcida (standalone),
              evita que el header quede debajo del notch / barra de estado. */}
          <div className="relative flex min-h-screen flex-col pt-[env(safe-area-inset-top)]">{children}</div>
        </ThemeManager>
      </body>
    </html>
  );
}
