'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from 'firebase/auth';
import { watchAuthState } from '@/lib/firebase';

interface UseAuthOptions {
  /** If true, redirect to "/" when there is no signed-in user. */
  requireAuth?: boolean;
}

interface UseAuthResult {
  user: User | null;
  loading: boolean;
}

/**
 * Wraps Firebase's onAuthStateChanged in a hook.
 *
 * The original project's chessmaininterface.html / chessgame.html pages
 * never actually checked auth state, so anyone could open them directly
 * without signing in. Passing { requireAuth: true } here closes that gap:
 * unauthenticated visitors get redirected back to the login page.
 */
export function useAuth(options: UseAuthOptions = {}): UseAuthResult {
  const { requireAuth = false } = options;
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = watchAuthState((firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
      if (requireAuth && !firebaseUser) {
        router.replace('/');
      }
    });
    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requireAuth]);

  return { user, loading };
}
