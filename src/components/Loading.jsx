import React from 'react';

const Loading = ({ message = 'Cargando proyectos...' }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full py-12 text-primary">
      <div className="h-12 w-12 border-4 border-t-transparent border-accent rounded-full animate-spin" />
      <p className="mt-4 text-sm text-secondary">{message}</p>
    </div>
  );
};

export default Loading;

