"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../supabaseclient';
import Loader from './common/Loader';

const AuthGate = ({ children }) => {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [session, setSession] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      const { data } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(data.session);
      if (!data.session) {
        router.replace('/login');
      }
      setChecking(false);
    };

    initialize();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (!newSession) {
        router.replace('/login');
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, [router]);

  if (checking) {
    return (
      <div className="flex h-full min-h-[60vh] items-center justify-center">
        <Loader />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return typeof children === 'function' ? children(session) : children;
};

export default AuthGate;
