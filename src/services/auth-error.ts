/**
 * Auth error (M7-Q).
 *
 * Lives in its own module so local and remote auth throw the *same class*. Screens
 * branch on `error instanceof AuthError` to attach a message to a specific input
 * (see app/(home)/account.tsx), so a second error class would silently stop those
 * messages from rendering in remote mode.
 */
export interface AuthFieldIssue {
  field: string;
  message: string;
}

export class AuthError extends Error {
  constructor(
    message: string,
    readonly field?: string,
    readonly fields: AuthFieldIssue[] = [],
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

const FIELD_LABELS: Record<string, string> = {
  name: 'Full name',
  nid: 'NID',
  phone: 'Mobile number',
  email: 'Mobile number',
  identifier: 'Mobile number',
  password: 'Password',
  newPassword: 'Password',
  pin: 'PIN',
  avatarUrl: 'Avatar',
};

/**
 * Turns an auth failure into per-input messages plus a banner that names each
 * field and reason. `inputKeys` maps a server field name to the key of the form
 * input that should be highlighted (for example phone -> loginPhone).
 */
export function describeAuthError(
  error: unknown,
  fallback: string,
  inputKeys: Record<string, string> = {},
): { banner: string; fieldErrors: Record<string, string> } {
  const fieldErrors: Record<string, string> = {};
  const lines: string[] = [];
  const issues =
    error instanceof AuthError
      ? error.fields.length > 0
        ? error.fields
        : error.field
          ? [{ field: error.field, message: error.message }]
          : []
      : [];
  for (const issue of issues) {
    const key = inputKeys[issue.field] ?? issue.field;
    if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    lines.push(`${FIELD_LABELS[issue.field] ?? issue.field}: ${issue.message}`);
  }
  if (lines.length > 0) return { banner: lines.join('\n'), fieldErrors };
  return { banner: error instanceof Error ? error.message : fallback, fieldErrors };
}
