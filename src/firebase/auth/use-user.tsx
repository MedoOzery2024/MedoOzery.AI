'use client';

import { Auth, onAuthStateChanged, User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useAuth } from '@/firebase/provider';

export interface UserHook {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
}

export function useUser(): UserHook {
  const auth = useAuth();
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [isLoading, setIsLoading] = useState<boolean>(!auth.currentUser);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // If there's no auth instance, we can't determine the user.
    if (!auth) {
      setUser(null);
      setIsLoading(false);
      setError(new Error("Auth service is not available."));
      return;
    }

    // Subscribe to auth state changes.
    const unsubscribe = onAuthStateChanged(auth,
      (user) => {
        setUser(user);
        setIsLoading(false);
      },
      (error) => {
        setError(error);
        setIsLoading(false);
      }
    );

    // Unsubscribe on unmount.
    return () => unsubscribe();
  }, [auth]);

  return { user, isLoading, error };
}
