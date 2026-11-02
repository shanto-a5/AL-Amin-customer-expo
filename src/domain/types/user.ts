import type { BaseEntity } from './entity';

export type Role = 'user' | 'admin';

export type TransactionType = 'FLEXILOAD' | 'OFFER_PURCHASE' | 'ADD_MONEY';
export type TransactionStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
export type TelecomOperator = 'GP' | 'ROBI' | 'BL' | 'AIRTEL' | 'TELETALK';
export type PaymentGatewayType = 'BKASH' | 'NAGAD' | 'BANK' | 'WALLET';
export type OfferCategory = 'INTERNET' | 'COMBO' | 'MINUTES';

export interface OfferDto {
  id: string;
  operator: TelecomOperator;
  title: string;
  category: OfferCategory;
  validity: string;
  price: number;
  dataMb: number;
  minutes: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionDto {
  id: string;
  trxId: string;
  userId: string;
  user?: {
    id: string;
    name: string;
    phone: string;
    customerId: string;
  };
  type: TransactionType;
  operator: TelecomOperator | 'NONE';
  paymentGateway: PaymentGatewayType;
  targetPhone: string;
  offerId: string | null;
  amount: number;
  status: TransactionStatus;
  scheduledReleaseAt: string | null;
  metadata: {
    offerTitle?: string | null;
    balanceBefore?: number | null;
    balanceAfter?: number | null;
    [key: string]: unknown;
  };
  createdAt: string;
  updatedAt: string;
}

export interface User extends BaseEntity {
  customerId: string;
  name: string;
  nid: string;
  email: string;
  phone: string;
  passwordHash: string;
  passwordSalt: string;
  avatar: string;
  avatarUrl: string;
  balance: number;
  pinLockedUntil?: string | null;
  pendingAddMoney?: TransactionDto[];
  roles: Role[];
}

export interface Session extends BaseEntity {
  userId: string;
  token: string;
  expiresAt: string;
}

export type NotificationType =
  | 'system'
  | 'info'
  | 'warning'
  | 'alert'
  | 'security'
  | 'account';

export interface AppNotification extends BaseEntity {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string>;
}
