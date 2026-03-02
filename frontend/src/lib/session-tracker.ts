const STORAGE_KEY = 'kataru_free_sessions_used';
const FEEDBACK_COMPLETED_KEY = 'kataru_feedback_completed';
const FEEDBACK_SCORE_KEY = 'kataru_feedback_score';
const USER_PLAN_KEY = 'kataru_user_plan';
const DEVICE_ID_KEY = 'kataru_device_id';

export const FREE_SESSION_LIMIT = 2;

// === Free session tracking ===

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

// === Feedback state ===

export function isFeedbackCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(FEEDBACK_COMPLETED_KEY) === 'true';
}

export function setFeedbackCompleted(score: number): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(FEEDBACK_COMPLETED_KEY, 'true');
  localStorage.setItem(FEEDBACK_SCORE_KEY, String(score));
}

export function getFeedbackScore(): number | null {
  if (typeof window === 'undefined') return null;
  const val = localStorage.getItem(FEEDBACK_SCORE_KEY);
  return val ? parseInt(val, 10) : null;
}

// === Plan state ===

export function getUserPlan(): 'free' | 'standard' {
  if (typeof window === 'undefined') return 'free';
  return (localStorage.getItem(USER_PLAN_KEY) as 'free' | 'standard') || 'free';
}

export function setUserPlan(plan: 'free' | 'standard'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(USER_PLAN_KEY, plan);
}

// === Access control ===

export function isTrialExhausted(): boolean {
  return getFreeSessionsUsed() >= FREE_SESSION_LIMIT;
}

export function needsFeedback(): boolean {
  return isTrialExhausted() && !isFeedbackCompleted();
}

export function canAccessDialogue(): boolean {
  if (!isTrialExhausted()) return true;
  return getUserPlan() === 'standard';
}

export function shouldShowFeedbackAfterResults(): boolean {
  return getFreeSessionsUsed() === FREE_SESSION_LIMIT && !isFeedbackCompleted();
}

// === Device ID ===

export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem(DEVICE_ID_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, id);
  }
  return id;
}
