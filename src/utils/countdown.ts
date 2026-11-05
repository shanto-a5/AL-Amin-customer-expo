/**
 * Countdown helpers for the manual admin fulfilment windows.
 *
 * Both sides derive the remaining time from the SERVER's `expiresAt`, so a
 * request made 2 minutes ago for a 5 minute window shows 03:00 on every device.
 * Reaching 00:00 only means the window has elapsed: it never settles anything.
 */

export function remainingMs(expiresAt: string | null | undefined, nowMs: number): number {
  if (!expiresAt) return 0;
  const target = new Date(expiresAt).getTime();
  if (Number.isNaN(target)) return 0;
  return Math.max(0, target - nowMs);
}

export function formatCountdown(expiresAt: string | null | undefined, nowMs: number): string {
  const totalSeconds = Math.ceil(remainingMs(expiresAt, nowMs) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function formatAgo(createdAt: string | null | undefined, nowMs: number): string {
  if (!createdAt) return '';
  const created = new Date(createdAt).getTime();
  if (Number.isNaN(created)) return '';
  const seconds = Math.max(0, Math.floor((nowMs - created) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
