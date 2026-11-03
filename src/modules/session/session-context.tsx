import * as React from 'react';

import type { User } from '@/domain/types';
import { ensureBooted } from '@/infrastructure/bootstrap';
import { authService, type RegisterUserInput } from '@/services/auth-gateway';
import { notificationService } from '@/services/notification-service';
import { listingCache } from '@/services/listing-cache';
import { setFcmUser, unregisterFcmOnLogout } from '@/services/fcm-manager';

export type SessionStatus = 'checking' | 'signedIn' | 'signedOut';

export interface SessionContextValue {
  status: SessionStatus;
  user: User | null;
  isAdmin: boolean;
  signIn: (phoneOrEmail: string, password: string) => Promise<User>;
  signUp: (input: RegisterUserInput) => Promise<User>;
  signOut: (userId?: string) => Promise<void>;
  signOutEverywhere: (userId?: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const SessionContext = React.createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [status, setStatus] = React.useState<SessionStatus>('checking');
  const [user, setUser] = React.useState<User | null>(null);
  const [, setRevision] = React.useState(0);

  React.useEffect(() => {
    let mounted = true;
    ensureBooted()
      .then(() => authService.getCurrentUser())
      .then(async (current) => {
        if (current) {
          await notificationService.hydrate(current.id).catch(() => undefined);
          listingCache.markHydrated(current.id);
          void setFcmUser(current);
        }
        if (mounted) {
          setUser(current);
          setStatus(current ? 'signedIn' : 'signedOut');
        }
      })
      .catch(() => {
        if (mounted) {
          setUser(null);
          setStatus('signedOut');
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => notificationService.subscribe(() => setRevision((n) => n + 1)), []);

  const signIn = React.useCallback(async (phoneOrEmail: string, password: string): Promise<User> => {
    const loggedIn = await authService.login(phoneOrEmail, password);
    await authService.createSession(loggedIn.id);
    const current = await authService.getCurrentUser();
    if (current) {
      await notificationService.hydrate(current.id).catch(() => undefined);
      listingCache.markHydrated(current.id);
    }
    setUser(current ?? loggedIn);
    setStatus('signedIn');
    void setFcmUser(current ?? loggedIn);
    return current ?? loggedIn;
  }, []);

  const signUp = React.useCallback(async (input: RegisterUserInput): Promise<User> => {
    const registered = await authService.register(input);
    await authService.createSession(registered.id);
    await notificationService.hydrate(registered.id).catch(() => undefined);
    listingCache.markHydrated(registered.id);
    setUser(registered);
    setStatus('signedIn');
    void setFcmUser(registered);
    return registered;
  }, []);

  const signOut = React.useCallback(async (userId?: string): Promise<void> => {
    const accountId = userId ?? user?.id;
    await unregisterFcmOnLogout().catch(() => undefined);
    await authService.logout(userId);
    if (accountId) listingCache.clearAccount(accountId);
    setUser(null);
    setStatus('signedOut');
  }, [user?.id]);

  const signOutEverywhere = React.useCallback(async (userId?: string): Promise<void> => {
    const accountId = userId ?? user?.id;
    await unregisterFcmOnLogout().catch(() => undefined);
    await authService.logoutEverywhere(userId);
    if (accountId) listingCache.clearAccount(accountId);
    setUser(null);
    setStatus('signedOut');
  }, [user?.id]);

  const refresh = React.useCallback(async (): Promise<void> => {
    const current = await authService.getCurrentUser();
    if (current) {
      await notificationService.hydrate(current.id).catch(() => undefined);
      listingCache.markHydrated(current.id);
    }
    setUser(current);
    setStatus(current ? 'signedIn' : 'signedOut');
  }, []);

  const value: SessionContextValue = {
    status,
    user,
    isAdmin: Boolean(user?.roles.includes('admin')),
    signIn,
    signUp,
    signOut,
    signOutEverywhere,
    refresh,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = React.useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within a SessionProvider.');
  return value;
}
