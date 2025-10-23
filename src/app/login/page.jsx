"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../supabaseclient';
import { toast, Toaster } from 'react-hot-toast';

const LoginPage = () => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (mounted && data.session) {
        router.replace('/');
      }
    };
    checkSession();
    return () => {
      mounted = false;
    };
  }, [router]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error('Credenciales inválidas.');
      setLoading(false);
      return;
    }
    toast.success('Bienvenido de nuevo');
    setLoading(false);
    router.replace('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-8">
      <Toaster position="top-center" toastOptions={{ className: 'bg-slate-900 text-slate-50 border border-slate-700/60' }} />
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-800/60 bg-slate-900/80 p-8 shadow-[0_25px_60px_rgba(2,6,23,0.55)]">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold text-slate-50">Iniciar sesión</h1>
          <p className="text-sm text-slate-400">Accede con tu correo corporativo y contraseña.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-medium text-slate-300">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="tucorreo@empresa.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium text-slate-300">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/40"
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 via-emerald-500 to-lime-500 px-4 py-2.5 text-sm font-semibold text-slate-900 shadow-[0_18px_40px_rgba(34,197,94,0.35)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(34,197,94,0.45)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
