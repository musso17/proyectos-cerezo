"use client";

import React from 'react';

const Loader = () => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="h-14 w-14 animate-spin rounded-full border-[3px] border-cyan-400/30 border-t-cyan-400 shadow-[0_0_25px_rgba(8,145,178,0.35)]" />
        <div className="absolute inset-1 rounded-full bg-cyan-400/15 blur-md" />
      </div>
      <p className="text-sm font-medium text-slate-300">Sincronizando con el estudio…</p>
    </div>
  );
};

export default Loader;
