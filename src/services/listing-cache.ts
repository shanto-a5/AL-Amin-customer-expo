/**
 * Account-isolated listing cache and global progress tracker.
 */
import { getContainer } from '@/infrastructure/container';
import { notificationService } from './notification-service';

export type ListingResource = 'notifications' | 'feed';

export const LISTING_RESOURCES: readonly ListingResource[] = ['notifications', 'feed'];

const CACHE_COLLECTION = 'listCache' as const;
const KEY_SEPARATOR = ':';

const BACKGROUND_TTL_MS = 15_000;
export const MANUAL_COOLDOWN_MS = 4_000;

export interface ListingState {
  loaded: boolean;
  inflight: boolean;
  refreshing: boolean;
  error: string | null;
}

interface ListCacheRecord {
  id: string;
  updatedAt: number;
}

interface ResourceState {
  loaded: boolean;
  inflight: boolean;
  manualInflight: boolean;
  lastSuccessAt: number;
  lastCompletedAt: number;
  error: string | null;
}

const EMPTY_STATE: ListingState = { loaded: false, inflight: false, refreshing: false, error: null };

class ListingCache {
  private states = new Map<string, ResourceState>();
  private listeners = new Set<() => void>();
  private progressListeners = new Set<() => void>();
  private pending = 0;

  private key(accountId: string, resource: ListingResource): string {
    return `${accountId}${KEY_SEPARATOR}${resource}`;
  }

  private readRecord(accountId: string, resource: ListingResource): ListCacheRecord | undefined {
    try {
      return getContainer().db.getById<ListCacheRecord>(CACHE_COLLECTION, this.key(accountId, resource));
    } catch {
      return undefined;
    }
  }

  private state(accountId: string, resource: ListingResource): ResourceState {
    const key = this.key(accountId, resource);
    let state = this.states.get(key);
    if (!state) {
      const record = this.readRecord(accountId, resource);
      state = {
        loaded: Boolean(record),
        inflight: false,
        manualInflight: false,
        lastSuccessAt: record?.updatedAt ?? 0,
        lastCompletedAt: 0,
        error: null,
      };
      this.states.set(key, state);
    }
    return state;
  }

  getState(accountId: string, resource: ListingResource): ListingState {
    if (!accountId) return EMPTY_STATE;
    const state = this.state(accountId, resource);
    return {
      loaded: state.loaded,
      inflight: state.inflight,
      refreshing: state.inflight && state.manualInflight,
      error: state.error,
    };
  }

  getProgressPending(): number {
    return this.pending;
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  subscribeProgress(listener: () => void): () => void {
    this.progressListeners.add(listener);
    return () => {
      this.progressListeners.delete(listener);
    };
  }

  ensure(accountId: string, resource: ListingResource): void {
    if (!accountId) return;
    const state = this.state(accountId, resource);
    if (state.inflight) return;
    const fresh = state.loaded && Date.now() - state.lastSuccessAt < BACKGROUND_TTL_MS;
    if (fresh) return;
    this.start(accountId, resource, false);
  }

  refresh(accountId: string, resource: ListingResource): boolean {
    if (!accountId) return false;
    const state = this.state(accountId, resource);
    if (state.inflight) return false;
    if (state.lastCompletedAt > 0 && Date.now() - state.lastCompletedAt < MANUAL_COOLDOWN_MS) return false;
    this.start(accountId, resource, true);
    return true;
  }

  retry(accountId: string, resource: ListingResource): void {
    if (!accountId) return;
    const state = this.state(accountId, resource);
    if (state.inflight) return;
    this.start(accountId, resource, false);
  }

  markHydrated(accountId: string): void {
    if (!accountId) return;
    const now = Date.now();
    for (const resource of LISTING_RESOURCES) {
      const state = this.state(accountId, resource);
      state.loaded = true;
      state.lastSuccessAt = now;
      state.error = null;
      this.persist(accountId, resource, now);
    }
    this.emit();
  }

  clearAccount(accountId: string): void {
    if (!accountId) return;
    const db = getContainer().db;

    for (const resource of LISTING_RESOURCES) {
      this.states.delete(this.key(accountId, resource));
      try {
        db.remove(CACHE_COLLECTION, this.key(accountId, resource));
      } catch {
        /* database not loaded */
      }
    }

    this.emit();
  }

  private start(accountId: string, resource: ListingResource, manual: boolean): void {
    const state = this.state(accountId, resource);
    state.inflight = true;
    state.manualInflight = manual;
    state.error = null;
    this.emit();
    this.pending += 1;
    this.emitProgress();
    void this.run(accountId, resource, state);
  }

  private async run(accountId: string, resource: ListingResource, state: ResourceState): Promise<void> {
    try {
      if (resource === 'notifications') {
        await notificationService.hydrate(accountId);
      }
      state.loaded = true;
      state.lastSuccessAt = Date.now();
      this.persist(accountId, resource, state.lastSuccessAt);
    } catch (error) {
      state.error = error instanceof Error ? error.message : 'Could not refresh right now.';
    } finally {
      state.inflight = false;
      state.manualInflight = false;
      state.lastCompletedAt = Date.now();
      this.pending = Math.max(0, this.pending - 1);
      this.emitProgress();
      this.emit();
    }
  }

  private persist(accountId: string, resource: ListingResource, updatedAt: number): void {
    try {
      getContainer().db.upsert(CACHE_COLLECTION, { id: this.key(accountId, resource), updatedAt });
    } catch {
      // The in-memory stamp still serves the current session.
    }
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }

  private emitProgress(): void {
    for (const listener of this.progressListeners) listener();
  }
}

export const listingCache = new ListingCache();
