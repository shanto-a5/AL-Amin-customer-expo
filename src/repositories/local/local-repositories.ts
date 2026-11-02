import type { LocalDatabase } from '@/database/local-database';
import type {
  AppNotification,
  Session,
  User,
} from '@/domain/types';
import type {
  NotificationRepository,
  SessionRepository,
  UserRepository,
} from '@/repositories/interfaces';

function byId<T extends { id: string }>(collection: T[], id: string): T | undefined {
  return collection.find((x) => x.id === id);
}

export class LocalUserRepository implements UserRepository {
  constructor(private db: LocalDatabase) {}
  getById(id: string) {
    return byId(this.db.getCollection<User>('users'), id);
  }
  getByEmail(email: string) {
    return this.db.getCollection<User>('users').find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
  list() {
    return this.db.getCollection<User>('users');
  }
  create(user: User) {
    this.db.insert('users', user);
  }
  update(id: string, patch: Partial<User>) {
    this.db.update('users', id, patch);
  }
}

export class LocalSessionRepository implements SessionRepository {
  constructor(private db: LocalDatabase) {}
  getByToken(token: string) {
    return this.db.getCollection<Session>('sessions').find((s) => s.token === token);
  }
  create(session: Session) {
    this.db.insert('sessions', session);
  }
  delete(tokenOrId: string) {
    const match = this.db
      .getCollection<Session>('sessions')
      .find((s) => s.token === tokenOrId || s.id === tokenOrId);
    if (match) this.db.remove('sessions', match.id);
  }
  listForUser(userId: string) {
    return this.db.getCollection<Session>('sessions').filter((s) => s.userId === userId);
  }
}

export class LocalNotificationRepository implements NotificationRepository {
  constructor(private db: LocalDatabase) {}
  listForUser(userId: string) {
    return this.db
      .getCollection<AppNotification>('notifications')
      .filter((n) => n.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  create(notification: AppNotification) {
    this.db.insert('notifications', notification);
  }
  update(id: string, patch: Partial<AppNotification>) {
    this.db.update('notifications', id, patch);
  }
  remove(id: string) {
    this.db.remove('notifications', id);
  }
}
