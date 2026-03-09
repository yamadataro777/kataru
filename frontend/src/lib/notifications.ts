import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';

const INCUBATION_DELAY_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false;
  try {
    const { display } = await LocalNotifications.requestPermissions();
    return display === 'granted';
  } catch {
    return false;
  }
}

export async function scheduleIncubationReminder(sessionId: string, title: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display !== 'granted') return;

    // Use hash of sessionId as notification ID (must be number)
    const notifId = Math.abs(hashCode(sessionId));

    await LocalNotifications.schedule({
      notifications: [
        {
          id: notifId,
          title: '再考の時',
          body: `「${title}」— 3日が経ちました。今なら違う見方ができるかも。`,
          schedule: { at: new Date(Date.now() + INCUBATION_DELAY_MS) },
          extra: { sessionId, type: 'incubation' },
        },
      ],
    });
  } catch (e) {
    console.error('Failed to schedule notification:', e);
  }
}

export async function cancelIncubationReminder(sessionId: string): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;

  try {
    const notifId = Math.abs(hashCode(sessionId));
    await LocalNotifications.cancel({ notifications: [{ id: notifId }] });
  } catch {
    // Ignore — notification may not exist
  }
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}
