'use client';

import React, { useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import useStore from '../hooks/useStore';
import VistaCarbonoDashboard from './views/VistaCarbonoDashboard';
import VistaDashboard from './views/VistaDashboard';
import VistaAgenteDashboard from './views/VistaAgenteDashboard'; // Importar el nuevo dashboard
import VistaTabla from './views/VistaTabla';
import VistaGaleria from './views/VistaGaleria';
import VistaCalendario from './views/VistaCalendario';
import VistaEdicion from './views/VistaEdicion';

// Helpers para identificar roles de usuario por email
const isCeo = (user) => {
  const email = user?.email?.toLowerCase() || '';
  return email === 'hola@cerezoperu.com';
};

const isAgent = (user) => {
  const email = user?.email?.toLowerCase() || '';
  return email === 'mauriciomu22ts@gmail.com' || email === 'edsonlom321@gmail.com';
};

const isFrancisco = (user) => {
  const email = user?.email?.toLowerCase() || '';
  return email === 'francisco@carbonomkt.com';
};


const ViewRenderer = () => {
  const { currentView, currentUser, allProjects } = useStore(
    useShallow((state) => ({
      currentView: state.currentView,
      currentUser: state.currentUser,
      allProjects: state.projects,
    }))
  );

  const renderedView = useMemo(() => {
    const isFranciscoUser = isFrancisco(currentUser);

    const carbonoProjects = isFranciscoUser
      ? (allProjects || []).filter(
        (p) =>
          p.client?.toLowerCase() === 'carbono' ||
          p.cliente?.toLowerCase() === 'carbono' ||
          p.properties?.tag === 'carbono'
      )
      : allProjects;

    switch (currentView) {
      case 'Dashboard':
        if (isFranciscoUser) {
          return <VistaCarbonoDashboard />;
        }
        else if (isCeo(currentUser)) {
          return <VistaDashboard />;
        } else {
          return <VistaAgenteDashboard />;
        }
      case 'Table':
        return <VistaTabla projects={isFranciscoUser ? carbonoProjects : undefined} />;
      case 'Calendar':
        return <VistaCalendario projects={isFranciscoUser ? carbonoProjects : undefined} />;
      case 'Gallery':
        return <VistaGaleria projects={isFranciscoUser ? carbonoProjects : undefined} />;
      case 'Edition':
        return <VistaEdicion />;
      default:
        return <VistaTabla projects={isFranciscoUser ? carbonoProjects : undefined} />;
    }
  }, [currentView, currentUser, allProjects]);

  return (
    <div key={currentView}>
      {renderedView}
    </div>
  );
};

export default ViewRenderer;
