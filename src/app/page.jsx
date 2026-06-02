"use client";

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import TopNav from '../components/TopNav';
import ModalDetalles from '../components/modals/ModalDetalles';
import useStore from '../hooks/useStore';
import ViewRenderer from '../components/ViewRenderer';
import Loader from '../components/common/Loader';
import AuthGate from '../components/AuthGate';
import VistaVoiceRoom from '../components/views/VistaVoiceRoom';

const HomeContent = ({ session }) => {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const checkAndAdvanceProjectStates = useStore((state) => state.checkAndAdvanceProjectStates);
  const loading = useStore((state) => state.loading);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const isVoiceRoomMinimized = useStore((state) => state.isVoiceRoomMinimized);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);

  useEffect(() => {
    setCurrentUser(session?.user || null);
  }, [session, setCurrentUser]);

  useEffect(() => {
    if (session) {
      const initializeData = async () => {
        await fetchProjects();
        await checkAndAdvanceProjectStates();
      };
      initializeData();
    }
  }, [session, fetchProjects, checkAndAdvanceProjectStates]);

  return (
    <main className="relative flex min-h-screen flex-col gap-4 px-3 pb-20 pt-4 sm:px-4 md:px-6 lg:gap-6 lg:pb-12 lg:pt-6">
      <Toaster position="top-right" toastOptions={{ className: 'bg-slate-900 text-slate-50 border border-slate-700/60' }} />

      <section className="relative flex w-full flex-1 flex-col gap-4 overflow-hidden lg:gap-6">
        <TopNav />
        <div className="glass-panel flex-1 overflow-hidden rounded-xl p-4 transition-all duration-200 ease-[var(--ease-ios-out)] hover:border-white/20 hover:shadow-[0_25px_55px_rgba(15,23,42,0.35)] sm:p-6 dark:hover:border-white/10 dark:hover:shadow-[0_28px_60px_rgba(0,0,0,0.55)]">
          <div className="mx-auto h-full max-w-[1600px] overflow-y-auto soft-scroll pr-1 sm:pr-2">
            {loading ? <Loader /> : <ViewRenderer />}
          </div>
        </div>

        {activeVoiceRoom && (
          <div className={
            isVoiceRoomMinimized
              ? "fixed bottom-6 right-6 w-[420px] h-[72px] z-[60] shadow-2xl transition-all duration-300 rounded-lg overflow-hidden"
              : "fixed inset-0 z-[100] transition-all duration-300"
          }>
            <VistaVoiceRoom />
          </div>
        )}
      </section>

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
