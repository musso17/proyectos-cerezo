const DEFAULT_BASE_URL = 'http://localhost:5678/webhook-test/proyecto';

const API_BASE_URL = import.meta.env?.VITE_N8N_BASE_URL || DEFAULT_BASE_URL;

const defaultHeaders = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
};

const buildUrl = (path) => {
  const normalizedBase = API_BASE_URL.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}`;
};

const handleResponse = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  let parsed;

  if (isJson) {
    parsed = await response.json();
  } else {
    const text = await response.text();
    parsed = text ? { message: text } : null;
  }

  if (!response.ok) {
    const errorMessage =
      (parsed && (parsed.message || parsed.error || parsed.status)) ||
      `Error ${response.status}`;
    throw new Error(errorMessage);
  }

  return parsed;
};

export const API = {
  async obtenerProyectos() {
    try {
      const response = await fetch(buildUrl('/obtener-proyectos'), {
        method: 'GET',
        headers: {
          ...defaultHeaders,
        },
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error al obtener proyectos:', error);
      throw error;
    }
  },

  async crearProyecto(payload) {
    try {
      const response = await fetch(buildUrl('/crear-proyecto'), {
        method: 'POST',
        headers: {
          ...defaultHeaders,
        },
        body: JSON.stringify(payload),
      });

      return await handleResponse(response);
    } catch (error) {
      console.error('Error al crear proyecto:', error);
      throw error;
    }
  },

  async actualizarProyecto(id, payload) {
    try {
      const response = await fetch(buildUrl(`/actualizar-proyecto/${encodeURIComponent(id)}`), {
        method: 'PUT',
        headers: {
          ...defaultHeaders,
        },
        body: JSON.stringify(payload),
      });

      return await handleResponse(response);
    } catch (error) {
      console.error(`Error al actualizar proyecto ${id}:`, error);
      throw error;
    }
  },

  async eliminarProyecto(id) {
    try {
      const response = await fetch(buildUrl(`/eliminar-proyecto/${encodeURIComponent(id)}`), {
        method: 'DELETE',
        headers: {
          ...defaultHeaders,
        },
      });

      return await handleResponse(response);
    } catch (error) {
      console.error(`Error al eliminar proyecto ${id}:`, error);
      throw error;
    }
  },
};

