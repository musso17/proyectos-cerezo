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
    <div className="flex min-h-screen items-center justify-center bg-[#F7F8FA] px-4 py-10">
      <Toaster
        position="top-center"
        toastOptions={{
          className:
            'rounded-xl border border-[#E5E7EB] bg-white text-primary shadow-[0_12px_24px_rgba(15,23,42,0.08)]',
        }}
      />
      <div className="w-full max-w-md space-y-7 rounded-2xl border border-[#E5E7EB] bg-white p-10 shadow-[0_20px_40px_rgba(15,23,42,0.1)]">
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center justify-center rounded-full bg-accent/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-accent">
            Studio Planner
          </div>
          <h1 className="text-2xl font-semibold text-primary">Iniciar sesión</h1>
          <p className="text-sm text-secondary">
            Ingresa con tu correo corporativo para continuar gestionando tus proyectos.
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="email" className="block text-sm font-semibold text-secondary/80">
              Correo electrónico
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="tucorreo@empresa.com"
              autoComplete="email"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-secondary/80">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-[#D1D5DB] bg-white px-4 py-2.5 text-sm text-primary placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              placeholder="Ingresa tu contraseña"
              autoComplete="current-password"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-[0_16px_32px_rgba(108,99,255,0.25)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_40px_rgba(108,99,255,0.32)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Ingresando…' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
