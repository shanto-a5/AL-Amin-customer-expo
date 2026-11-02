import { router, useGlobalSearchParams, useRouter } from 'expo-router';
import type { Href } from 'expo-router';
import * as React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

import { BackButton } from '@/components/back-button';
import { Button, Screen } from '@/components/ui';
import { useSession, type SessionContextValue } from '@/modules/session/session-context';
import { colors, type as textType } from '@/theme/tokens';

export const HOME_ROUTE = '/' as const;

export const PROTECTED_ROUTES = [
  '/home',
  '/offers',
  '/transactions',
  '/add-money',
  '/notifications',
  '/settings',
] as const;
export type ProtectedRoute = (typeof PROTECTED_ROUTES)[number];
export type AuthRedirectHref = `${ProtectedRoute}` | `${ProtectedRoute}?${string}` | '/';

export function buildAuthRedirectNext(pathname: ProtectedRoute, params: Record<string, unknown>): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    const flat = Array.isArray(value) ? value : [value];
    for (const entry of flat) {
      if (entry === undefined || entry === null || entry === '') continue;
      parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(entry))}`);
    }
  }
  return parts.length > 0 ? `${pathname}?${parts.join('&')}` : pathname;
}

export function authRedirectHref(next: string | string[] | undefined): AuthRedirectHref {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value) return '/';
  const queryIndex = value.indexOf('?');
  const pathname = queryIndex === -1 ? value : value.slice(0, queryIndex);
  const search = queryIndex === -1 ? '' : value.slice(queryIndex);
  if (!PROTECTED_ROUTES.includes(pathname as (typeof PROTECTED_ROUTES)[number])) return '/';
  return `${pathname}${search}` as AuthRedirectHref;
}

export function authRedirectTarget(next: string | string[] | undefined): Href {
  const href = authRedirectHref(next);
  if (href === '/') return '/' as Href;
  const queryIndex = href.indexOf('?');
  if (queryIndex === -1) return href as Href;
  const pathname = href.slice(0, queryIndex);
  const params: Record<string, string> = {};
  for (const pair of href.slice(queryIndex + 1).split('&')) {
    if (!pair) continue;
    const eq = pair.indexOf('=');
    const key = decodeURIComponent(eq === -1 ? pair : pair.slice(0, eq));
    const value = eq === -1 ? '' : decodeURIComponent(pair.slice(eq + 1).replace(/\+/g, ' '));
    if (key) params[key] = value;
  }
  return { pathname, params } as Href;
}

export function useRequireAuth(): (intent?: 'login' | 'register') => boolean {
  const session = useSession();
  const router = useRouter();
  return React.useCallback(
    (intent = 'login') => {
      if (session.status === 'checking') return false;
      if (session.status === 'signedIn') return true;
      router.push({ pathname: intent === 'register' ? '/register' : '/login' });
      return false;
    },
    [session.status, router],
  );
}

function CheckingGate(): React.JSX.Element {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.background,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[textType.caption, { marginTop: 12 }]}>Restoring your session…</Text>
    </View>
  );
}

function AuthRedirect({ next }: { next?: ProtectedRoute }): React.JSX.Element {
  const router = useRouter();
  const searchParams = useGlobalSearchParams();
  const started = React.useRef(false);

  React.useEffect(() => {
    if (started.current) return;
    started.current = true;
    if (next) {
      router.push({ pathname: '/login', params: { next: buildAuthRedirectNext(next, searchParams) } });
      return;
    }
    router.push('/login');
  }, [router, next, searchParams]);

  return <CheckingGate />;
}

export function withSession(
  Component: React.ComponentType<{ session: SessionContextValue }>,
  next?: ProtectedRoute,
): (props: Record<string, unknown>) => React.JSX.Element {
  return function SessionGuarded(props: Record<string, unknown>): React.JSX.Element {
    const session = useSession();
    if (session.status === 'checking') return <CheckingGate />;
    if (session.status === 'signedOut') return <AuthRedirect next={next} />;
    return <Component {...props} session={session} />;
  };
}

export function hasAuthRedirectTarget(next: string | string[] | undefined): boolean {
  const value = Array.isArray(next) ? next[0] : next;
  if (!value) return false;
  return authRedirectHref(value) !== '/';
}

export function resumeAfterAuth(router: { back: () => void }): void {
  router.back();
}

export function SignInGate({
  title,
  message,
  fallback = '/',
}: {
  title: string;
  message: string;
  fallback?: Href;
}): React.JSX.Element {
  return (
    <Screen padded>
      <BackButton fallbackHref={fallback} />
      <Text style={[textType.h1, { marginTop: 12 }]}>{title}</Text>
      <Text style={[textType.body, { color: colors.textMuted, marginTop: 6 }]}>{message}</Text>
      <View style={{ height: 16 }} />
      <Button title="Sign in" fullWidth onPress={() => router.push('/login')} />
      <View style={{ height: 8 }} />
      <Button title="Create an account" variant="secondary" fullWidth onPress={() => router.push('/register')} />
    </Screen>
  );
}
