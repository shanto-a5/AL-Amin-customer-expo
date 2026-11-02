export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export type CollectionKey =
  | 'users'
  | 'sessions'
  | 'notifications'
  | 'listCache';
