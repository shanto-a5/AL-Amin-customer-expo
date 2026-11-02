import type { Role, User } from '@/domain/types';
import { RemoteAuthService, type RegisterUserInput } from '@/api/remote-auth-service';

export { AuthError } from './auth-error';
export type { Role, User, RegisterUserInput };

type ProfilePatch = Parameters<RemoteAuthService['updateProfile']>[1];

export interface AuthGateway {
  register(input: RegisterUserInput): Promise<User>;
  login(identifierOrPhone: string, password: string): Promise<User>;
  createSession(userId: string): Promise<string>;
  getCurrentUser(): Promise<User | null>;
  logout(userId?: string): Promise<void>;
  logoutEverywhere(userId?: string): Promise<void>;
  emailExists(email: string): Promise<boolean>;
  requestPasswordReset(email: string): Promise<{ localToken?: string }>;
  confirmPasswordReset(token: string, newPassword: string): Promise<void>;
  updateProfile(userId: string, patch: ProfilePatch): Promise<User>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
  changePin(currentPin: string, newPin: string): Promise<void>;
  addRole(userId: string, role: Role): Promise<void>;
  installUnauthorizedHandler(): void;
}

const service = new RemoteAuthService();

export function getAuthService(): AuthGateway {
  return service;
}

export const authService: AuthGateway = {
  register: (input) => getAuthService().register(input),
  login: (identifierOrPhone, password) => getAuthService().login(identifierOrPhone, password),
  createSession: (userId) => getAuthService().createSession(userId),
  getCurrentUser: () => getAuthService().getCurrentUser(),
  logout: (userId) => getAuthService().logout(userId),
  logoutEverywhere: (userId) => getAuthService().logoutEverywhere(userId),
  emailExists: (email) => getAuthService().emailExists(email),
  requestPasswordReset: (email) => getAuthService().requestPasswordReset(email),
  confirmPasswordReset: (token, newPassword) => getAuthService().confirmPasswordReset(token, newPassword),
  updateProfile: (userId, patch) => getAuthService().updateProfile(userId, patch),
  changePassword: (userId, currentPassword, newPassword) =>
    getAuthService().changePassword(userId, currentPassword, newPassword),
  changePin: (currentPin, newPin) => getAuthService().changePin(currentPin, newPin),
  addRole: (userId, role) => getAuthService().addRole(userId, role),
  installUnauthorizedHandler: () => getAuthService().installUnauthorizedHandler(),
};

export function resetAuthServiceForTest(): void {
  // no-op
}
