import { LocalDatabase } from '@/database/local-database';
import {
  LocalNotificationRepository,
  LocalSessionRepository,
  LocalUserRepository,
} from '@/repositories/local/local-repositories';
import { AsyncStorageAdapter, LocalDeviceImageStorage, LocalSessionStorage } from '@/storage/implementations';

export interface RepositoryMap {
  users: LocalUserRepository;
  sessions: LocalSessionRepository;
  notifications: LocalNotificationRepository;
}

export class Container {
  readonly db: LocalDatabase;
  readonly imageStorage: LocalDeviceImageStorage;
  readonly sessionStorage: LocalSessionStorage;
  readonly repositories: RepositoryMap;

  constructor() {
    const storage = new AsyncStorageAdapter();
    this.db = new LocalDatabase(storage);
    this.imageStorage = new LocalDeviceImageStorage();
    this.sessionStorage = new LocalSessionStorage(storage);
    this.repositories = {
      users: new LocalUserRepository(this.db),
      sessions: new LocalSessionRepository(this.db),
      notifications: new LocalNotificationRepository(this.db),
    };
  }
}

let instance: Container | null = null;

export function getContainer(): Container {
  if (!instance) {
    instance = new Container();
  }
  return instance;
}
