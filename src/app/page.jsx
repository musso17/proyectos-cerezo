"use client";

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import ModalDetalles from '../components/modals/ModalDetalles';
import useStore from '../hooks/useStore';
import ViewRenderer from '../components/ViewRenderer';
import Loader from '../components/common/Loader';
import AuthGate from '../components/AuthGate';

const HomeContent = ({ session }) => {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const loading = useStore((state) => state.loading);
  const sidebarOpen = useStore((state) => state.sidebarOpen);
  const closeSidebar = useStore((state) => state.closeSidebar);
  const setCurrentUser = useStore((state) => state.setCurrentUser);

  useEffect(() => {
    setCurrentUser(session?.user || null);
  }, [session, setCurrentUser]);

  useEffect(() => {
    if (session) {
      fetchProjects();
    }
  }, [session, fetchProjects]);

  return (
    <main className="relative flex flex-1 flex-col gap-4 px-2 pb-16 pt-4 md:px-6 lg:flex-row lg:gap-6 lg:pb-12 lg:pt-6">
      <Toaster position="top-right" toastOptions={{ className: 'bg-slate-900 text-slate-50 border border-slate-700/60' }} />

      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      <section className="flex w-full flex-1 flex-col gap-4 overflow-hidden lg:gap-6">
        <Navbar />
        <div className="glass-panel soft-scroll flex-1 overflow-hidden rounded-3xl p-4 transition-all duration-200 ease-[var(--ease-ios-out)] hover:border-white/20 hover:shadow-[0_25px_55px_rgba(15,23,42,0.35)] sm:p-6">
          <div className="h-full overflow-y-auto soft-scroll pr-1 sm:pr-2">
            {loading ? <Loader /> : <ViewRenderer />}
          </div>
        </div>
      </section>

      {sidebarOpen && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm" onClick={closeSidebar} />
          <div className="relative ml-auto flex h-full w-[min(18rem,80%)] p-4">
            <Sidebar variant="mobile" className="h-full" onNavigate={closeSidebar} />
          </div>
        </div>
      )}

      <ModalDetalles />
    </main>
  );
};

const HomePage = () => (
  <AuthGate>
    {(session) => <HomeContent session={session} />}
  </AuthGate>
);

export default HomePage;
