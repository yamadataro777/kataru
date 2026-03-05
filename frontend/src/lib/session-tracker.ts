const FEEDBACK_COMPLETED_KEY = 'kataru_feedback_completed';
const FEEDBACK_SCORE_KEY = 'kataru_feedback_score';
const DEVICE_ID_KEY = 'kataru_device_id';

export const FREE_SESSION_LIMIT = 5;

export type UserPlan = 'free' | 'lite' | 'standard';

// Session phase for gradual unlock (free users only)
export type SessionPhase =
  | 'intro'           // Session 1: Free report
  | 'teaser'          // Session 2: Free report + action items teaser
  | 'full_preview'    // Session 3: Full paid report (one-time)
  | 'dialogue_preview'// Session 4: Dialogue mode preview (Stage 1-2 only)
  | 'exhausted';      // Session 5+: Paywall

export function getSessionPhase(freeSessionsUsed: number): SessionPhase {
  switch (freeSessionsUsed) {
    case 0: return 'intro';
    case 1: return 'teaser';
    case 2: return 'full_preview';
    case 3: return 'dialogue_preview';
    default: return 'exhausted';
  }
}

export function getReportPlanForPhase(phase: SessionPhase): 'free' | 'paid' {
  // Session 3 (full_preview) gets a paid report as a one-time preview
  return phase === 'full_preview' ? 'paid' : 'free';
}

export function canAccessDialogueForPhase(phase: SessionPhase, plan: UserPlan): boolean {
  if (plan === 'standard') return true;
  // Session 4 (dialogue_preview) allows one-time dialogue access
  return phase === 'dialogue_preview';
}

// === Feedback state (still localStorage-based, migrated to DB later) ===

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

// === Plan-based access control ===

export function canAccessDialogue(plan: UserPlan, freeSessionsUsed: number): boolean {
  if (plan === 'standard') return true;
  const phase = getSessionPhase(freeSessionsUsed);
  return phase === 'dialogue_preview';
}

export function hasFreeSessions(plan: UserPlan, freeSessionsUsed: number): boolean {
  if (plan !== 'free') return true; // Paid plans have different limits
  return freeSessionsUsed < FREE_SESSION_LIMIT;
}

export function isTrialExhausted(plan: UserPlan, freeSessionsUsed: number): boolean {
  if (plan !== 'free') return false;
  return freeSessionsUsed >= FREE_SESSION_LIMIT;
}

export function shouldShowFeedbackAfterResults(plan: UserPlan, freeSessionsUsed: number): boolean {
  if (plan !== 'free') return false;
  return freeSessionsUsed === FREE_SESSION_LIMIT && !isFeedbackCompleted();
}

// Plan display helpers
export function getPlanDisplayName(plan: UserPlan): string {
  switch (plan) {
    case 'free': return 'Free';
    case 'lite': return 'Lite';
    case 'standard': return 'Standard';
  }
}

export function getPlanLimits(plan: UserPlan) {
  switch (plan) {
    case 'free':
      return { sessions: 5, retention: 7, dialogue: false, detailedReport: false };
    case 'lite':
      return { sessions: 15, retention: Infinity, dialogue: false, detailedReport: true };
    case 'standard':
      return { sessions: Infinity, retention: Infinity, dialogue: true, detailedReport: true };
  }
}
