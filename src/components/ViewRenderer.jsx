"use client";

import React, { useMemo } from 'react';
import useStore from '../hooks/useStore';
import VistaTabla from './views/VistaTabla';
import VistaGaleria from './views/VistaGaleria';
import VistaCalendario from './views/VistaCalendario';
import VistaTimeline from './views/VistaTimeline';

const ViewRenderer = () => {
  const currentView = useStore((state) => state.currentView);

  const renderedView = useMemo(() => {
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
  }, [currentView]);

  return (
    <div
      key={currentView}
      className="animate-fade-up space-y-6 transition-all duration-300 ease-[var(--ease-ios-out)]"
    >
      {renderedView}
    </div>
  );
};

export default ViewRenderer;
