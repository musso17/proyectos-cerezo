import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import useStore from './hooks/useStore';
import { Toaster } from 'react-hot-toast';
import VistaKanban from './components/views/VistaKanban';
import VistaTabla from './components/views/VistaTabla';
import VistaGaleria from './components/views/VistaGaleria';
import VistaCalendario from './components/views/VistaCalendario';
import VistaTimeline from './components/views/VistaTimeline';
import ModalDetalles from './components/modals/ModalDetalles';
import Loading from './components/Loading';
import { API } from './config/api';

const ViewRenderer = () => {
  const currentView = useStore((state) => state.currentView);

  switch (currentView) {
    case 'Table':
      return <VistaTabla />;
    case 'Kanban':
      return <VistaKanban />;
    case 'Gallery':
      return <VistaGaleria />;
    case 'Calendar':
      return <VistaCalendario />;
    case 'Timeline':
      return <VistaTimeline />;
    default:
      return <VistaKanban />;
  }
};

const App = () => {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const loading = useStore((state) => state.loading);
  const error = useStore((state) => state.error);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        await fetchProjects();
      } catch (error) {
        console.error('Fallo al cargar proyectos:', error);
      }
    };

    loadProjects();

    const intervalId = window.setInterval(() => {
      if (isMounted) {
        loadProjects();
      }
    }, 10000);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
    };
  }, [fetchProjects]);

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.debug('[App] API configurada', API);
    }
  }, []);

  return (
    <div className="bg-background text-primary min-h-screen font-sans flex">
      <Toaster />
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {error && (
            <div className="mx-6 mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          )}
          {loading ? <Loading /> : <ViewRenderer />}
        </main>
      </div>
      <ModalDetalles />
    </div>
  );
};

export default App;
