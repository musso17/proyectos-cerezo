"use client";

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ModalDetalles from '../components/modals/ModalDetalles';
import useStore from '../hooks/useStore';
import ViewRenderer from '../components/ViewRenderer';
import Loader from '../components/common/Loader';

const HomePage = () => {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const loading = useStore((state) => state.loading);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <main className="relative flex flex-1 gap-6 px-2 pb-12 pt-6 md:px-8">
      <Toaster position="top-right" toastOptions={{ className: 'bg-slate-900 text-slate-50 border border-slate-700/60' }} />
      <Sidebar />
      <section className="flex w-full flex-1 flex-col gap-6 overflow-hidden">
        <Navbar />
        <div className="glass-panel soft-scroll flex-1 overflow-hidden rounded-3xl p-6">
          <div className="h-full overflow-y-auto soft-scroll pr-2">
            {loading ? <Loader /> : <ViewRenderer />}
          </div>
        </div>
      </section>
      <ModalDetalles />
    </main>
  );
};

export default HomePage;

