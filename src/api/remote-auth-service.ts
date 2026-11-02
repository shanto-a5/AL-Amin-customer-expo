import type { Role, TransactionDto, User } from '@/domain/types';
import { ApiError, getApiClient, onUnauthorized } from './api-client';
import type { ApiUser } from './vanta-api';
import { vantaApi } from './vanta-api';
import { getContainer } from '@/infrastructure/container';
import { AuthError } from '@/services/auth-error';
import type { SessionStorage } from '@/storage/storage-adapter';

export function toDeviceUser(apiUser: ApiUser, pendingAddMoney?: TransactionDto[]): User {
  const avatarVal = apiUser.avatarUrl || apiUser.avatar || '';
  return {
    id: apiUser.id,
    customerId: apiUser.customerId ?? '',
    name: apiUser.name,
    nid: apiUser.nid ?? '',
    email: apiUser.email ?? '',
    phone: apiUser.phone ?? '',
    passwordHash: '',
    passwordSalt: '',
    avatar: avatarVal,
    avatarUrl: avatarVal,
    balance: Number(apiUser.balance ?? 0),
    pinLockedUntil: apiUser.pinLockedUntil ?? null,
    pendingAddMoney: pendingAddMoney ?? apiUser.pendingAddMoney ?? [],
    roles: [...(apiUser.roles ?? [])],
    createdAt: apiUser.createdAt,
    updatedAt: apiUser.updatedAt,
  };
}

function toAuthError(error: unknown): AuthError {
  if (error instanceof AuthError) return error;
  if (error instanceof ApiError) return new AuthError(error.message, error.field);
  if (error instanceof Error) return new AuthError(error.message);
  return new AuthError('Something went wrong. Try again.');
}

export interface RegisterUserInput {
  name: string;
  nid: string;
  phone: string;
  password: string;
  pin: string;
  email?: string;
  avatarUrl?: string;
}

export class RemoteAuthService {
  private store(): SessionStorage {
    return getContainer().sessionStorage;
  }

  installUnauthorizedHandler(): void {
    onUnauthorized(() => this.clearToken());
  }

  async register(input: RegisterUserInput): Promise<User> {
    try {
      const result = await vantaApi.register({
        name: input.name.trim(),
        nid: input.nid.trim(),
        phone: input.phone.trim(),
        password: input.password,
        pin: input.pin.trim(),
        email: input.email?.trim() ? input.email.trim().toLowerCase() : undefined,
        avatarUrl: input.avatarUrl?.trim() || undefined,
      });
      getApiClient().setToken(result.token);
      await this.store().setToken(result.token);
      return toDeviceUser(result.user, result.pendingAddMoney);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async login(identifierOrPhone: string, password: string): Promise<User> {
    try {
      const clean = identifierOrPhone.trim();
      const result = await vantaApi.login({
        phone: clean,
        identifier: clean,
        password,
      });
      getApiClient().setToken(result.token);
      await this.store().setToken(result.token);
      return toDeviceUser(result.user, result.pendingAddMoney);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async createSession(_userId: string): Promise<string> {
    const token = await this.store().getToken();
    if (!token) {
      throw new AuthError('You are signed in, but the session token was lost. Please sign in again.');
    }
    getApiClient().setToken(token);
    return token;
  }

  async getCurrentUser(): Promise<User | null> {
    const token = await this.store().getToken();
    if (!token) return null;
    getApiClient().setToken(token);
    try {
      const { user, pendingAddMoney } = await vantaApi.me();
      return toDeviceUser(user, pendingAddMoney);
    } catch (error) {
      if (error instanceof ApiError && error.isUnauthorized) {
        await this.clearToken();
        return null;
      }
      throw toAuthError(error);
    }
  }

  async logout(): Promise<void> {
    try {
      await vantaApi.logout();
    } catch (error) {
      if (!(error instanceof ApiError && (error.isUnauthorized || error.isRetryable))) {
        throw toAuthError(error);
      }
    } finally {
      await this.clearToken();
    }
  }

  async logoutEverywhere(): Promise<void> {
    try {
      await vantaApi.logoutEverywhere();
    } finally {
      await this.clearToken();
    }
  }

  async emailExists(): Promise<boolean> {
    throw new AuthError('This cannot be checked from the app. Request a reset link instead.');
  }

  async resetPassword(): Promise<void> {
    throw new AuthError('Use the emailed reset link to choose a new password.');
  }

  async requestPasswordReset(email: string): Promise<{ localToken?: string }> {
    try {
      await vantaApi.requestPasswordReset({ email: email.trim() });
      return {};
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    if (newPassword.length < 6) {
      throw new AuthError('Password must be at least 6 characters.', 'newPassword');
    }
    try {
      await vantaApi.confirmPasswordReset({ token: token.trim(), newPassword });
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async updateProfile(
    _userId: string,
    patch: { name?: string; email?: string; phone?: string; avatar?: string; avatarUrl?: string },
  ): Promise<User> {
    try {
      const { user } = await vantaApi.updateProfile(patch);
      return toDeviceUser(user);
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async changePassword(_userId: string, currentPassword: string, newPassword: string): Promise<void> {
    try {
      await vantaApi.changePassword({ currentPassword, newPassword });
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async changePin(currentPin: string, newPin: string): Promise<void> {
    try {
      await vantaApi.changePin({ currentPin, newPin });
    } catch (error) {
      throw toAuthError(error);
    }
  }

  async addRole(_userId: string, _role: Role): Promise<void> {
    throw new AuthError('Roles are granted by an administrator, not from the app.');
  }

  private async clearToken(): Promise<void> {
    getApiClient().setToken(null);
    await this.store().clearToken();
  }
}
