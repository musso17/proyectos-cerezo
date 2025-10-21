"use client";

import useStore from '../hooks/useStore';
import VistaTabla from './views/VistaTabla';
import VistaGaleria from './views/VistaGaleria';
import VistaCalendario from './views/VistaCalendario';
import VistaTimeline from './views/VistaTimeline';

const ViewRenderer = () => {
  const currentView = useStore((state) => state.currentView);

  switch (currentView) {
    case 'Table':
      return <VistaTabla />;
    case 'Calendar':
      return <VistaCalendario />;
    case 'Timeline':
      return <VistaTimeline />;
    case 'Gallery':
      return <VistaGaleria />;
    default:
      return <VistaTabla />;
  }
};

export default ViewRenderer;
