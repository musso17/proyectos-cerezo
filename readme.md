
# Gestor de Proyectos Audiovisuales

Una aplicación web moderna construida con React, Vite y Tailwind CSS para gestionar proyectos audiovisuales.

## Características

- **Vistas Múltiples:** Tabla, Kanban y Galería.
- **Búsqueda y Filtros:** Búsqueda en tiempo real y filtros por estado, cliente y tipo.
- **Gestión CRUD:** Funcionalidad completa para Crear, Leer, Actualizar y Eliminar proyectos.
- **Diseño Moderno:** Interfaz de usuario elegante y responsiva con Tailwind CSS.
- **Despliegue Sencillo:** Configurado para un despliegue estático (Vercel / Netlify).

## Instalación y Uso

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/proyecto-audiovisual.git
    cd proyecto-audiovisual
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Iniciar el servidor de desarrollo:**
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173`.

## Despliegue

El proyecto puede desplegarse sin backend en plataformas estáticas. Recomendado: Vercel o Netlify.

### Variables de entorno

Crea `.env` con:

```
VITE_N8N_BASE_URL=https://tu-instancia-n8n.webhook/proyecto
```

### Vercel

1. Conecta el repositorio en Vercel.
2. Agrega `VITE_N8N_BASE_URL` en **Project Settings → Environment Variables**.
3. Configura la build (vercel.json ya define):
   - Build command: `npm run build`
   - Output directory: `dist`
4. Despliega y usa la URL HTTPS generada.

### Netlify

Usa el mismo comando `npm run build` y directorio `dist`. El archivo `netlify.toml` ya incluye estos valores.
# cerezo

## 📌 Descripción General

Este proyecto es una aplicación web construida para gestionar de manera eficiente los proyectos audiovisuales de la productora **Cerezo**. Está diseñada para brindar visibilidad, orden y colaboración entre productores, camarógrafos, editores y clientes, todo en una interfaz simple, funcional y rápida.

---

## 🚀 Objetivo

Sustituir herramientas dispersas como Excel, WhatsApp y notas personales, unificando la información de proyectos en una sola plataforma accesible desde cualquier navegador.

---

## 💻 Stack Tecnológico

- **Frontend:** React 18 + Vite
- **Estilos:** Tailwind CSS
- **Iconografía:** Lucide React
- **Persistencia:** API REST n8n + Google Sheets
- **Despliegue recomendado:** Vercel o Netlify

---

## 🧠 Funcionalidades Clave

- Vistas Tabla, Kanban, Galería, Calendario y Timeline.
- CRUD completo contra API n8n (Google Sheets).
- Polling cada 10 s para refrescar automáticamente.
- Validaciones y confirmación antes de eliminar.
- Toasts y alerts informando éxito o errores.
- Búsqueda global con debounce integrada en la barra superior.
- Diseño responsivo con Tailwind.

## 🧩 Flujo Esperado

1. El usuario crea un nuevo proyecto indicando nombre, cliente, fechas, responsables, etc.
2. El proyecto aparece instantáneamente en todas las vistas.
3. Cualquier miembro del equipo puede comentar, actualizar estado o agregar info.
4. La vista se actualiza cada 10 s gracias al polling contra la API n8n.

---

## 📁 Estructura del Proyecto

```
cerezo-app/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   ├── constants/
│   ├── hooks/
│   ├── views/
│   ├── config/
│   └── main.jsx
├── netlify.toml
├── vercel.json
├── package.json
└── README.md
```

---

## 🔄 Scripts Útiles

```bash
npm install       # Instala dependencias
npm run dev       # Corre la app en localhost:3000
npm run build     # Construye versión para producción
```

---

## 📦 Deploy

- **Vercel:** usa `vercel.json`, agrega `VITE_N8N_BASE_URL` y despliega.  
- **Netlify:** `netlify.toml` ya define `npm run build` y `dist`; añade la misma variable en Site settings.
