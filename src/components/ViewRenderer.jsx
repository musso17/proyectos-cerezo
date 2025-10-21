"use client";

import useStore from '../hooks/useStore';
import VistaKanban from './views/VistaKanban';
import VistaTabla from './views/VistaTabla';
import VistaGaleria from './views/VistaGaleria';
import VistaCalendario from './views/VistaCalendario';
import VistaTimeline from './views/VistaTimeline';

const ViewRenderer = () => {
  const currentView = useStore((state) => state.currentView);

  switch (currentView) {
    case 'Table':
      return <VistaTabla />;
    case 'Kanban':
      return <VistaKanban />;
    case 'Calendar':
      return <VistaCalendario />;
    case 'Timeline':
      return <VistaTimeline />;
    case 'Gallery':
      return <VistaGaleria />;
    default:
      return <VistaKanban />;
  }
};

export default ViewRenderer;

