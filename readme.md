# Cerezo Studio Planner

Experiencia tipo iOS para coordinar proyectos audiovisuales. La app ahora corre sobre **Next.js 14** con **Tailwind CSS**, Zustand y Supabase como backend en tiempo real.

## ✨ Características
- Dashboard de vidrio pulido con modo oscuro inspirado en iOS.
- Vistas Kanban, Tabla, Galería, Calendario y Timeline en vivo.
- CRUD sincronizado con Supabase (soporta RLS y tiempo real).
- Modal avanzado para editar propiedades, equipo y fechas.
- Notificaciones con `react-hot-toast` y componentes accesibles.

## 🚀 Empezar a trabajar
```bash
git clone https://github.com/musso17/proyectos-cerezo.git
cd proyectos-cerezo
npm install

# variables (opcional, ya existen valores por defecto)
cp .env.example .env
npm run dev
```

El servidor queda en `http://localhost:3000`.

## 🔑 Variables de entorno
La versión publicada comparte Supabase entre todos mediante valores por defecto.
Define las tuyas en `.env` si quieres apuntar a otra instancia:

```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## 🧱 Estructura principal
```
src/
  app/
    layout.jsx
    page.jsx
    globals.css
  components/
    Sidebar.jsx
    Navbar.jsx
    ViewRenderer.jsx
    ...
  hooks/useStore.js
  config/supabase.js
```

## 📦 Scripts
- `npm run dev` – Next dev server.
- `npm run build` – Build de producción.
- `npm start` – Servir la build (`next start`).
- `npm run lint` – Reglas de Next + ESLint.

## ☁️ Deploy
Vercel detecta el proyecto como Next.js automáticamente. Asegúrate de definir:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 🖥️ Diseño
Los estilos se basan en Tailwind con componentes “glassmorphism”. Ajusta el look&feel editando `src/app/globals.css` o los componentes individuales.

## ✅ Checklist rápida
- [ ] Configura las columnas de `projects` en Supabase (`id`, `name`, `status`, `startDate`, `deadline`, `description`, etc.).
- [ ] Habilita políticas RLS para el rol `anon` si la app debe ser pública.
- [ ] Ejecuta `npm run build` antes de desplegar.

¡Listo para coordinar el estudio con estilo!
