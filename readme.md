# Gestor de Proyectos Audiovisuales

Una aplicación web moderna construida con React, Vite y Tailwind CSS para gestionar proyectos audiovisuales.

## Características

- **Vistas Múltiples:** Tabla, Kanban y Galería.
- **Búsqueda y Filtros:** Búsqueda en tiempo real y filtros por estado, cliente y tipo.
- **Gestión CRUD:** Funcionalidad completa para Crear, Leer, Actualizar y Eliminar proyectos.
- **Diseño Moderno:** Interfaz de usuario elegante y responsiva con Tailwind CSS.
- **Despliegue Sencillo:** Configurado para un despliegue fácil en Netlify.

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

El proyecto está listo para ser desplegado en Netlify. Simplemente conecta tu repositorio de Git a Netlify y usa la siguiente configuración:

-   **Comando de construcción:** `npm run build`
-   **Directorio de publicación:** `dist`

El archivo `netlify.toml` incluido en el repositorio configura esto automáticamente.
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
- **Almacenamiento:** localStorage (MVP), pronto Supabase
- **Despliegue:** Netlify

---

## 🧠 Funcionalidades Actuales (MVP)

- Vista en Tabla, Kanban y Galería
- Crear, editar y eliminar proyectos
- Filtros por cliente y estado
- Comentarios y colaboradores
- Adjuntar archivos (simulado)
- Interfaz responsiva y liviana
- Almacenamiento local persistente

---

## 🛠️ Próximas Funcionalidades

- Autenticación con roles (Supabase)
- Sincronización entre usuarios
- Timeline de cambios
- Propiedades personalizadas
- Archivos reales y notificaciones
- Templates y automatizaciones

---

## 🧩 Flujo Esperado

1. El usuario crea un nuevo proyecto indicando nombre, cliente, fechas, responsables, etc.
2. El proyecto aparece instantáneamente en todas las vistas.
3. Cualquier miembro del equipo puede comentar, actualizar estado o agregar info.
4. Todo queda sincronizado en tiempo real (futuro con Supabase).

---

## 📁 Estructura del Proyecto

```
cerezo-project-netlify/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   ├── views/
│   ├── context/
│   ├── data/
│   └── App.jsx
├── netlify.toml
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

## 📦 Deploy en Netlify

El proyecto ya incluye el archivo `netlify.toml` con configuración base:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```
