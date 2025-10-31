'use client';

import React, { useMemo } from 'react';
import useStore from '../hooks/useStore';
import VistaCarbonoDashboard from './views/VistaCarbonoDashboard';
import VistaDashboard from './views/VistaDashboard';
import VistaAgenteDashboard from './views/VistaAgenteDashboard'; // Importar el nuevo dashboard
import VistaTabla from './views/VistaTabla';
import VistaGaleria from './views/VistaGaleria';
import VistaCalendario from './views/VistaCalendario';
import VistaCiclos from './views/VistaCiclos';

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
  const currentView = useStore((state) => state.currentView);
  const currentUser = useStore((state) => state.currentUser);

  const renderedView = useMemo(() => {
    switch (currentView) {
      case 'Dashboard':
        if (isFrancisco(currentUser)) {
          return <VistaCarbonoDashboard />;
        }
        else if (isCeo(currentUser)) {
          return <VistaDashboard />;
        } else {
          // Por defecto, todos los demás ven el dashboard de agente.
          return <VistaAgenteDashboard />;
        }
      case 'Table':
        return <VistaTabla />;
      case 'Calendar':
        return <VistaCalendario />;
      case 'Gallery':
        return <VistaGaleria />;
      case 'Ciclos':
        if (isFrancisco(currentUser)) {
          return <VistaTabla />; // Redirige a la tabla si es Francisco
        }
        return <VistaCiclos />;
      default:
        return <VistaTabla />;
    }
  }, [currentView, currentUser]);

  return (
    <div key={currentView}>
      {renderedView}
    </div>
  );
};

export default ViewRenderer;
