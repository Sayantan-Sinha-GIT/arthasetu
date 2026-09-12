import { adminDb } from '@/lib/firebase-admin';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEvent {
  level: LogLevel;
  msg: string;
  requestId?: string;
  uid?: string | null;
  route?: string;
  model?: string;
  fellBack?: boolean;
  promptVersion?: string;
  durationMs?: number;
  details?: Record<string, unknown>;
  timestamp?: string;
}

/**
 * Structured server logger. Emits JSON lines and persists errors to Firestore for admin review.
 */
export const logger = {
  log(event: LogEvent) {
    const payload: LogEvent = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(payload);
    if (payload.level === 'error') {
      console.error(json);
      // Persist to error_events for the admin to inspect
      persistErrorEvent(payload).catch(() => {});
    } else if (payload.level === 'warn') {
      console.warn(json);
    } else {
      console.log(json);
    }
  },

  info(msg: string, meta?: Omit<LogEvent, 'level' | 'msg'>) {
    this.log({ level: 'info', msg, ...meta });
  },

  warn(msg: string, meta?: Omit<LogEvent, 'level' | 'msg'>) {
    this.log({ level: 'warn', msg, ...meta });
  },

  error(msg: string, meta?: Omit<LogEvent, 'level' | 'msg'>) {
    this.log({ level: 'error', msg, ...meta });
  },
};

async function persistErrorEvent(event: LogEvent) {
  try {
    const now = Date.now();
    const expiresAt = new Date(now + 30 * 24 * 60 * 60 * 1000); // 30 days TTL
    await adminDb.collection('error_events').add({
      ...event,
      createdAt: now,
      expiresAt,
    });
  } catch {
    // Silently fall back to console if adminDb is offline
  }
}
