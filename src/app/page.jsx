"use client";

import { useEffect } from 'react';
import { Toaster } from 'react-hot-toast';
import TopNav from '../components/TopNav';
import MobileNavBar from '../components/MobileNavBar';
import ModalDetalles from '../components/modals/ModalDetalles';
import useStore from '../hooks/useStore';
import ViewRenderer from '../components/ViewRenderer';
import Loader from '../components/common/Loader';
import AuthGate from '../components/AuthGate';
import VistaVoiceRoom from '../components/views/VistaVoiceRoom';
import IncomingCallBanner from '../components/office/IncomingCallBanner';
import { useOfficePresence } from '../hooks/useOffice';
import { isTeamUser } from '../constants/team';
import { isOfficeRoom } from '../lib/office/rooms';

const HomeContent = ({ session }) => {
  const fetchProjects = useStore((state) => state.fetchProjects);
  const checkAndAdvanceProjectStates = useStore((state) => state.checkAndAdvanceProjectStates);
  const loading = useStore((state) => state.loading);
  const setCurrentUser = useStore((state) => state.setCurrentUser);
  const activeVoiceRoom = useStore((state) => state.activeVoiceRoom);
  const isVoiceRoomMinimized = useStore((state) => state.isVoiceRoomMinimized);
  const setActiveVoiceRoom = useStore((state) => state.setActiveVoiceRoom);
  const setCurrentView = useStore((state) => state.setCurrentView);
  const isTeam = isTeamUser(session?.user);

  useOfficePresence();

  useEffect(() => {
    setCurrentUser(session?.user || null);
  }, [session, setCurrentUser]);

  // Se carga una vez por usuario: Supabase emite un objeto de sesión nuevo al
  // refrescar el token y antes eso volvía a pedir toda la tabla de proyectos.
  const userId = session?.user?.id || null;
  useEffect(() => {
    if (userId) {
      const initializeData = async () => {
        await fetchProjects();
        await checkAndAdvanceProjectStates();
      };
      initializeData();
    }
  }, [userId, fetchProjects, checkAndAdvanceProjectStates]);

  // Enlace de llamada (?sala=...) recibido por WhatsApp: abre la oficina y
  // entra a la sala, silenciado.
  useEffect(() => {
    if (!userId || !isTeam || typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const room = url.searchParams.get('sala');
    if (!room) return;
    url.searchParams.delete('sala');
    window.history.replaceState(null, '', `${url.pathname}${url.search}${url.hash}`);
    if (!isOfficeRoom(room)) return;
    setCurrentView('Office');
    setActiveVoiceRoom(room);
  }, [userId, isTeam, setCurrentView, setActiveVoiceRoom]);

  return (
    // Con la sala minimizada, en móvil hay más espacio abajo para que la
    // píldora no tape lo último de la lista.
    <main className={`relative flex min-h-screen flex-col gap-4 px-3 pt-4 sm:px-4 md:px-6 md:pb-8 lg:gap-6 lg:pb-12 lg:pt-6 ${activeVoiceRoom && isVoiceRoomMinimized ? 'pb-48' : 'pb-28'}`}>
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
              // En móvil va sobre la barra de pestañas y a la izquierda del botón "+"
              // (antes lo tapaba); en escritorio, abajo a la derecha.
              ? "fixed left-3 right-[5.25rem] bottom-[calc(4rem+env(safe-area-inset-bottom)+0.9rem)] h-14 z-[60] shadow-2xl transition-all duration-300 rounded-lg overflow-hidden md:left-auto md:right-6 md:bottom-6 md:w-[420px] md:h-[72px]"
              : "fixed inset-0 z-[100] transition-all duration-300"
          }>
            <VistaVoiceRoom />
          </div>
        )}
      </section>

      {isTeam && <IncomingCallBanner />}
      <ModalDetalles />
      <MobileNavBar />
    </main>
  );
};

const HomePage = () => (
  <AuthGate>
    {(session) => <HomeContent session={session} />}
  </AuthGate>
);

export default HomePage;
