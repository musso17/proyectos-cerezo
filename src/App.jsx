import React, { useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import useStore from './hooks/useStore';
import Loader from './components/common/Loader';
import { Toaster } from 'react-hot-toast';
import VistaKanban from './components/views/VistaKanban';
import VistaTabla from './components/views/VistaTabla';
import VistaGaleria from './components/views/VistaGaleria';
import VistaCalendario from './components/views/VistaCalendario';
import VistaTimeline from './components/views/VistaTimeline';
import ModalDetalles from './components/modals/ModalDetalles';

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

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <div className="bg-background text-primary min-h-screen font-sans flex">
      <Toaster />
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 overflow-y-auto">
          {loading ? <Loader /> : <ViewRenderer />}
        </main>
      </div>
      <ModalDetalles />
    </div>
  );
};

export default App;
