/**
 * Bootstrap gate.
 *
 * Sequences the app's cold-start so the UI never races unmounted infrastructure:
 *   1. Load collections from storage into LocalDatabase.
 *   2. Prime the stored bearer token and register the 401 handler.
 *   3. Check API reachability via `/health`.
 */
import * as React from 'react';

import { getContainer } from '@/infrastructure/container';
import { ApiError, getApiClient } from '@/api/api-client';
import { vantaApi } from '@/api/vanta-api';
import { getAuthService } from '@/services/auth-gateway';
import { describeRuntimeConfig } from '@/config/runtime-config';

let bootPromise: Promise<void> | null = null;

async function ensureLoaded(): Promise<void> {
  const container = getContainer();
  if (!container.db.loadedFlag) {
    await container.db.load();
  }

  await bootRemote();
}

async function bootRemote(): Promise<void> {
  console.info(`[vanta] ${describeRuntimeConfig()}`);

  const token = await getContainer().sessionStorage.getToken();
  if (token) getApiClient().setToken(token);

  getAuthService().installUnauthorizedHandler?.();

  let health;
  try {
    health = await vantaApi.health();
  } catch (error) {
    if (error instanceof ApiError && error.code === 'network_error') {
      throw new Error(
        'Could not reach the API at the configured base URL. Start the server; there is no local fallback.',
      );
    }
    throw error;
  }

  if (!health.database.ok) {
    throw new Error('The API is running but its datastore is not ready. Check the server logs.');
  }
  if (health.database.driver !== 'mongo') {
    console.warn(
      `[vanta] the API is using the "${health.database.driver}" datastore driver. Data is not durable.`,
    );
  }
}

export type BootState =
  | { status: 'loading' }
  | { status: 'ready' }
  | { status: 'failed'; error: Error; retry: () => void };

export function useBootGate(): BootState {
  const [attempt, setAttempt] = React.useState(0);
  const [result, setResult] = React.useState<{
    attempt: number;
    status: 'ready' | 'failed';
    error: Error | null;
  }>({ attempt: -1, status: 'ready', error: null });

  React.useEffect(() => {
    let active = true;
    if (!bootPromise) {
      bootPromise = ensureLoaded();
    }
    void bootPromise.then(
      () => {
        if (active) setResult({ attempt, status: 'ready', error: null });
      },
      (error: unknown) => {
        bootPromise = null;
        if (active) {
          setResult({ attempt, status: 'failed', error: error instanceof Error ? error : new Error(String(error)) });
        }
      },
    );
    return () => {
      active = false;
    };
  }, [attempt]);

  const retry = React.useCallback(() => setAttempt((value) => value + 1), []);

  if (result.attempt !== attempt) return { status: 'loading' };
  if (result.status === 'failed') {
    return { status: 'failed', error: result.error ?? new Error('Boot failed.'), retry };
  }
  return { status: 'ready' };
}

export async function ensureBooted(): Promise<void> {
  if (!bootPromise) {
    bootPromise = ensureLoaded();
  }
  return bootPromise;
}

export async function resetBootForTest(): Promise<void> {
  bootPromise = null;
}
