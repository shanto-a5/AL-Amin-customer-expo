import type {
  AppNotification,
  Session,
  User,
} from '@/domain/types';

export type FindOptions<T> = {
  where?: Partial<T>;
  orderBy?: { field: keyof T; direction: 'asc' | 'desc' };
  limit?: number;
  offset?: number;
};

export interface UserRepository {
  getById(id: string): User | undefined;
  getByEmail(email: string): User | undefined;
  list(): User[];
  create(user: User): void;
  update(id: string, patch: Partial<User>): void;
}

export interface SessionRepository {
  getByToken(token: string): Session | undefined;
  create(session: Session): void;
  delete(token: string): void;
  listForUser(userId: string): Session[];
}

export interface NotificationRepository {
  listForUser(userId: string): AppNotification[];
  create(notification: AppNotification): void;
  update(id: string, patch: Partial<AppNotification>): void;
  remove(id: string): void;
}
