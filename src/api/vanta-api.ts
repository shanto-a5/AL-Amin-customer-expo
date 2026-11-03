/**
 * Typed API surface for AllPay BD (অল পে বিডি).
 */
import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { ApiError, getApiClient } from './api-client';
import type {
  OfferCategory,
  OfferDto,
  Role,
  TelecomOperator,
  TransactionDto,
  TransactionStatus,
  TransactionType,
} from '@/domain/types';
import type { NotificationDto } from './remote-notifications';

const MEDIA_UPLOAD_TIMEOUT_MS = 60_000;

const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.avif': 'image/avif',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
};

function normaliseImageExtension(value: string): string {
  const match = /\.([a-z0-9]{2,5})(?:[?#]|$)/i.exec(value);
  const candidate = match ? `.${match[1].toLowerCase()}` : '.jpg';
  return MIME_BY_EXTENSION[candidate] ? candidate : '.jpg';
}

function withImageExtension(name: string, extension: string): string {
  const base = name.replace(/[\\/:*?"<>|]+/g, '-').trim() || 'upload';
  return base.toLowerCase().endsWith(extension) ? base : `${base}${extension}`;
}

export interface ApiUser {
  id: string;
  customerId: string;
  name: string;
  nid: string;
  email: string;
  phone: string;
  avatar: string;
  avatarUrl: string;
  balance: number;
  pendingDebit?: number;
  pinLockedUntil?: string | null;
  pendingAddMoney?: TransactionDto[];
  roles: Role[];
  createdAt: string;
  updatedAt: string;
}

export interface AuthResult {
  user: ApiUser;
  pendingAddMoney?: TransactionDto[];
  token: string;
  expiresAt: string;
}

export interface RechargeReceipt {
  trxId: string;
  extRefNum?: string | null;
  createdAt: string;
  operator: TelecomOperator;
  targetPhone: string;
  type: 'FLEXILOAD' | 'OFFER_PURCHASE';
  amount: number;
  status?: TransactionStatus;
  offerTitle: string | null;
  balanceBefore: number;
  balanceAfter: number;
  idempotentReplay?: boolean;
  transaction: TransactionDto;
  user: ApiUser;
}

export interface MasterFloatStatus {
  balance: number;
  lowFloatThreshold: number;
  isLowFloat: boolean;
  pendingDebitTotal: number;
  pendingDebitCount: number;
  availableAfterPending: number;
  inquiryQueueSize: number;
  updatedAt: string;
}

export interface ReconciliationSummary {
  processedRows: number;
  settledCount: number;
  refundedCount: number;
  skippedCount: number;
  details: {
    ref: string;
    trxId?: string;
    extRefNum?: string;
    amount?: number;
    outcome: 'COMPLETED' | 'REFUNDED' | 'SKIPPED';
    reason?: string;
  }[];
  reconciledAt: string;
}

export interface InitiateAddMoneyResult {
  sessionId: string;
  gateway: 'BKASH' | 'NAGAD' | 'BANK';
  senderNumber: string;
  amount: number;
  expiresAt: string;
  expiresInSeconds: number;
  resendInSeconds: number;
  devOtp?: string;
}

export interface VerifyAddMoneyOtpResult {
  transaction: TransactionDto;
  pendingAddMoney: TransactionDto[];
  scheduledReleaseAt: string;
  holdDurationSeconds: number;
  message: string;
  notice: string;
}

export interface CompleteAddMoneyResult {
  alreadyCompleted: boolean;
  transaction: TransactionDto;
  user: ApiUser | null;
  pendingAddMoney: TransactionDto[];
  callerUser: ApiUser | null;
}

export interface HealthReport {
  status: 'ok' | 'degraded';
  service: string;
  version: string;
  apiVersion: string;
  database: { ok: boolean; driver: string; detail?: string };
  config: Record<string, unknown>;
  uptimeSeconds: number;
}

function findHeaderCaseInsensitive(
  headers: Record<string, string> | undefined,
  name: string,
): string | undefined {
  if (!headers) return undefined;
  const target = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === target) return value;
  }
  return undefined;
}

export class VantaApi {
  private get client() {
    return getApiClient();
  }

  // ------------------------------------------------------------- capability
  health(): Promise<HealthReport> {
    return this.client.get<HealthReport>('/health');
  }

  ready(): Promise<{ ready: boolean; database: { ok: boolean; driver: string } }> {
    return this.client.get('/health/ready');
  }

  mediaProviders(): Promise<{ providers: { id: string; label: string; configured: boolean }[] }> {
    return this.client.get('/meta/media-providers');
  }

  // -------------------------------------------------------------------- auth
  register(input: {
    name: string;
    nid: string;
    phone: string;
    password: string;
    pin: string;
    email?: string;
    avatarUrl?: string;
  }): Promise<AuthResult> {
    return this.client.post<AuthResult>('/auth/register', input, { authenticated: false });
  }

  login(input: { phone?: string; identifier?: string; email?: string; password: string }): Promise<AuthResult> {
    return this.client.post<AuthResult>('/auth/login', input, { authenticated: false });
  }

  me(): Promise<{ user: ApiUser; pendingAddMoney?: TransactionDto[] }> {
    return this.client.get('/auth/me');
  }

  updateProfile(patch: {
    name?: string;
    email?: string;
    phone?: string;
    avatar?: string;
    avatarUrl?: string;
  }): Promise<{ user: ApiUser }> {
    return this.client.patch('/auth/me', patch);
  }

  changePassword(input: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ changed: boolean; otherSessionsRevoked: boolean }> {
    return this.client.post('/auth/me/password', input);
  }

  changePin(input: { currentPin: string; newPin: string }): Promise<{ changed: boolean }> {
    return this.client.post('/auth/pin/change', input);
  }

  logout(): Promise<{ loggedOut: boolean }> {
    return this.client.post('/auth/logout');
  }

  logoutEverywhere(): Promise<{ loggedOutEverywhere: boolean }> {
    return this.client.post('/auth/logout-all');
  }

  requestPasswordReset(input: { email: string }): Promise<{ accepted: boolean; expiresInMinutes: number }> {
    return this.client.post('/auth/password-reset/request', input, { authenticated: false });
  }

  confirmPasswordReset(input: { token: string; newPassword: string }): Promise<{ reset: boolean; sessionsRevoked: number }> {
    return this.client.post('/auth/password-reset/confirm', input, { authenticated: false });
  }

  // ------------------------------------------------------------------ offers
  offers(params?: {
    operator?: TelecomOperator | 'ALL';
    category?: OfferCategory | 'ALL';
    includeInactive?: boolean;
  }): Promise<{ offers: OfferDto[] }> {
    return this.client.get('/offers', {
      authenticated: false,
      query: {
        operator: params?.operator && params.operator !== 'ALL' ? params.operator : undefined,
        category: params?.category && params.category !== 'ALL' ? params.category : undefined,
        includeInactive: params?.includeInactive ? 'true' : undefined,
      },
    });
  }

  createOffer(input: {
    operator: TelecomOperator;
    title: string;
    category: OfferCategory;
    validity: string;
    price: number;
    dataMb?: number;
    minutes?: number;
    isActive?: boolean;
  }): Promise<{ offer: OfferDto }> {
    return this.client.post('/offers', input);
  }

  updateOffer(
    id: string,
    patch: Partial<{
      operator: TelecomOperator;
      title: string;
      category: OfferCategory;
      validity: string;
      price: number;
      dataMb: number;
      minutes: number;
      isActive: boolean;
    }>,
  ): Promise<{ offer: OfferDto }> {
    return this.client.patch(`/offers/${encodeURIComponent(id)}`, patch);
  }

  // --------------------------------------------------- flexiload & recharge
  recharge(input: {
    operator: TelecomOperator;
    targetPhone: string;
    amount: number;
    pin: string;
    type: 'FLEXILOAD' | 'OFFER_PURCHASE';
    offerId?: string | null;
    extRefNum?: string;
    mnpOverride?: boolean;
    simulateTimeout?: boolean;
  }): Promise<RechargeReceipt> {
    return this.client.post<RechargeReceipt>('/transactions/recharge', input);
  }

  // --------------------------------------- admin aggregator & reconciliation
  masterFloat(): Promise<{ masterFloat: MasterFloatStatus }> {
    return this.client.get('/admin/master-float');
  }

  topUpMasterFloat(amount: number): Promise<{ masterFloat: MasterFloatStatus }> {
    return this.client.post('/admin/master-float/top-up', { amount });
  }

  disputes(): Promise<{ disputes: TransactionDto[]; count: number; masterFloat: MasterFloatStatus }> {
    return this.client.get('/admin/disputes');
  }

  resolveDispute(
    trxIdOrExtRef: string,
    action: 'COMPLETE' | 'REFUND' | 'INQUIRE',
    note?: string,
  ): Promise<{ transaction: TransactionDto; masterFloat: MasterFloatStatus }> {
    return this.client.post(`/admin/disputes/${encodeURIComponent(trxIdOrExtRef)}/resolve`, {
      action,
      note,
    });
  }

  reconcileCsv(csvContent: string): Promise<{
    reconciliation: ReconciliationSummary;
    masterFloat: MasterFloatStatus;
  }> {
    return this.client.post('/admin/reconciliation/csv', { csvContent });
  }

  // ------------------------------------------------------- add money & otp
  initiateAddMoney(input: {
    gateway: 'BKASH' | 'NAGAD' | 'BANK';
    senderNumber: string;
    amount: number;
  }): Promise<InitiateAddMoneyResult> {
    return this.client.post<InitiateAddMoneyResult>('/add-money/initiate', input);
  }

  verifyAddMoneyOtp(input: {
    sessionId: string;
    otp: string;
  }): Promise<VerifyAddMoneyOtpResult> {
    return this.client.post<VerifyAddMoneyOtpResult>('/add-money/verify-otp', input);
  }

  completeAddMoneyNow(trxId: string): Promise<CompleteAddMoneyResult> {
    return this.client.post<CompleteAddMoneyResult>(`/add-money/complete-now/${encodeURIComponent(trxId)}`, {});
  }

  // ------------------------------------------------------------ transactions
  transactions(params?: {
    type?: TransactionType | 'ALL';
    status?: TransactionStatus | 'ALL';
    operator?: TelecomOperator | 'ALL';
    scope?: 'all' | 'mine';
    page?: number;
    limit?: number;
  }): Promise<{
    transactions: TransactionDto[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
    balance: number;
    pendingAddMoney: TransactionDto[];
  }> {
    return this.client.get('/transactions', {
      query: {
        type: params?.type && params.type !== 'ALL' ? params.type : undefined,
        status: params?.status && params.status !== 'ALL' ? params.status : undefined,
        operator: params?.operator && params.operator !== 'ALL' ? params.operator : undefined,
        scope: params?.scope === 'all' ? 'all' : undefined,
        page: params?.page,
        limit: params?.limit,
      },
    });
  }

  // ----------------------------------------------------------- notifications
  notifications(options: { limit?: number; unread?: boolean } = {}): Promise<{ notifications: NotificationDto[]; unreadCount: number }> {
    const { limit, unread } = options;
    return this.client.get('/notifications', { query: { limit, unread: unread ? 'true' : undefined } });
  }

  unreadNotificationCount(): Promise<{ unreadCount: number }> {
    return this.client.get('/notifications/unread-count');
  }

  markNotificationRead(id: string): Promise<{ notification: NotificationDto }> {
    return this.client.patch(`/notifications/${encodeURIComponent(id)}/read`, {});
  }

  markAllNotificationsRead(): Promise<{ updated: number }> {
    return this.client.post('/notifications/read-all', {});
  }

  deleteNotification(id: string): Promise<{ deleted: true }> {
    return this.client.delete(`/notifications/${encodeURIComponent(id)}`);
  }

  // ------------------------------------------------------------------- media
  private async uploadMultipartFile<T>(
    endpoint: string,
    fileUri: string,
    options: {
      httpMethod: 'PATCH' | 'POST';
      fieldName: 'avatar' | 'file';
      authenticated?: boolean;
    },
  ): Promise<T> {
    if (!fileUri || typeof fileUri !== 'string') {
      throw new ApiError('The selected photo is no longer available on this device. Pick it again.', {
        code: 'validation_failed',
      });
    }

    const extension = normaliseImageExtension(fileUri);
    const mimeType = MIME_BY_EXTENSION[extension] ?? 'image/jpeg';

    if (Platform.OS === 'web') {
      const filename = withImageExtension(`${options.fieldName}-${Date.now()}${extension}`, extension);
      const response = await fetch(fileUri);
      const blob = await response.blob();
      const resolvedMime = blob.type || mimeType;
      const form = new FormData();
      form.append(options.fieldName, new Blob([blob], { type: resolvedMime }), filename);
      return this.client.request<T>(endpoint, {
        method: options.httpMethod,
        form,
        authenticated: options.authenticated,
        timeoutMs: MEDIA_UPLOAD_TIMEOUT_MS,
      });
    }

    const endpointUrl = this.client.resolveUrl(endpoint);
    const token = this.client.getToken();
    const usedBearer = options.authenticated !== false && token !== null;
    const headers: Record<string, string> = {
      Accept: 'application/json',
      ...(usedBearer ? { Authorization: `Bearer ${token}` } : {}),
    };

    let uploadResult: FileSystem.FileSystemUploadResult;
    try {
      uploadResult = await FileSystem.uploadAsync(endpointUrl, fileUri, {
        httpMethod: options.httpMethod,
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: options.fieldName,
        mimeType,
        headers,
      });
    } catch (caught) {
      throw this.client.toUploadError(caught);
    }

    const requestId = findHeaderCaseInsensitive(uploadResult.headers, 'x-request-id');
    return this.client.parseEnvelope<T>(uploadResult.status, uploadResult.body, {
      requestId,
      usedBearer,
    });
  }

  async uploadMedia(uri: string): Promise<{
    media: { url: string; publicId: string; format: string; resourceType: string };
  }> {
    return this.uploadMultipartFile('/media', uri, {
      httpMethod: 'POST',
      fieldName: 'file',
      authenticated: true,
    });
  }

  async uploadAvatar(
    uri: string,
    options: { authenticated?: boolean } = {},
  ): Promise<{
    user: ApiUser | null;
    avatarUrl: string;
    media: { url: string; publicId: string; format: string; resourceType: string } | null;
  }> {
    const isAuthenticated = options.authenticated ?? this.client.hasToken();
    const endpoint = isAuthenticated ? '/user/avatar' : '/upload/avatar';
    const httpMethod = isAuthenticated ? 'PATCH' : 'POST';

    return this.uploadMultipartFile(endpoint, uri, {
      httpMethod,
      fieldName: 'avatar',
      authenticated: isAuthenticated,
    });
  }
}

export const vantaApi = new VantaApi();
