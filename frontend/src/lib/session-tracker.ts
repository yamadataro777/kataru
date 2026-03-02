const STORAGE_KEY = 'kataru_free_sessions_used';
export const FREE_SESSION_LIMIT = 2;

export function getFreeSessionsUsed(): number {
  if (typeof window === 'undefined') return 0;
  const val = localStorage.getItem(STORAGE_KEY);
  return val ? parseInt(val, 10) : 0;
}

export function incrementFreeSessionsUsed(): void {
  if (typeof window === 'undefined') return;
  const current = getFreeSessionsUsed();
  localStorage.setItem(STORAGE_KEY, String(current + 1));
}

export function getFreeSessionsRemaining(): number {
  return Math.max(0, FREE_SESSION_LIMIT - getFreeSessionsUsed());
}

export function hasFreeSessions(): boolean {
  return getFreeSessionsRemaining() > 0;
}
