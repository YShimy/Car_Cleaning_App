/**
 * Usability-test helper (PLAN.md section 11).
 * Records which onboarding screens an interviewee used and for how long.
 * Stored in localStorage on this device only — nothing is ever sent anywhere.
 */
export const SESSIONS_KEY = 'lamaa-interview-sessions-v1';

export interface InterviewEvent {
  /** Milliseconds since the session started. */
  t: number;
  type: 'step' | 'primary' | 'back';
  step: string;
}

export interface InterviewSession {
  id: string;
  startedAt: string;
  endedAt?: string;
  outcome: 'in_progress' | 'completed' | 'abandoned';
  totalMs: number;
  /** Time spent on each step, in milliseconds. */
  stepMs: Record<string, number>;
  backPresses: number;
  primaryTaps: number;
  plan?: string;
  paymentMethod?: string;
  washDay?: string;
  compound?: string;
  events: InterviewEvent[];
}

let current:
  (InterviewSession & { startMs: number; lastStep: string | null; lastStepAt: number }) | null =
  null;

export function loadSessions(): InterviewSession[] {
  try {
    return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]') as InterviewSession[];
  } catch {
    return [];
  }
}

function save(session: InterviewSession) {
  try {
    const all = loadSessions().filter((s) => s.id !== session.id);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([session, ...all]));
  } catch {
    // Storage unavailable: recording is a nice-to-have, never block the demo.
  }
}

export const clearSessions = () => localStorage.removeItem(SESSIONS_KEY);

const snapshot = (): InterviewSession | null => {
  if (!current) return null;
  const { startMs: _s, lastStep: _l, lastStepAt: _a, ...session } = current;
  return session;
};

const closeStep = (now: number) => {
  if (!current?.lastStep) return;
  current.stepMs[current.lastStep] =
    (current.stepMs[current.lastStep] ?? 0) + (now - current.lastStepAt);
};

export function startInterviewSession(now = Date.now()) {
  // A session still open when a new one starts was abandoned.
  if (current) endInterviewSession('abandoned', {}, now);
  current = {
    id: `int_${now.toString(36)}`,
    startedAt: new Date(now).toISOString(),
    outcome: 'in_progress',
    totalMs: 0,
    stepMs: {},
    backPresses: 0,
    primaryTaps: 0,
    events: [],
    startMs: now,
    lastStep: null,
    lastStepAt: now,
  };
}

export const isRecording = () => current !== null;

/** Call when an onboarding screen is shown. */
export function recordStep(step: string, now = Date.now()) {
  if (!current || current.lastStep === step) return;
  closeStep(now);
  current.lastStep = step;
  current.lastStepAt = now;
  current.events.push({ t: now - current.startMs, type: 'step', step });
  current.totalMs = now - current.startMs;
  save(snapshot()!);
}

/** Call when the primary or back button is tapped. */
export function recordTap(type: 'primary' | 'back', now = Date.now()) {
  if (!current) return;
  if (type === 'back') current.backPresses++;
  else current.primaryTaps++;
  current.events.push({ t: now - current.startMs, type, step: current.lastStep ?? '' });
}

export function endInterviewSession(
  outcome: 'completed' | 'abandoned',
  choices: Pick<InterviewSession, 'plan' | 'paymentMethod' | 'washDay' | 'compound'> = {},
  now = Date.now(),
) {
  if (!current) return;
  closeStep(now);
  current.outcome = outcome;
  current.endedAt = new Date(now).toISOString();
  current.totalMs = now - current.startMs;
  Object.assign(current, choices);
  save(snapshot()!);
  current = null;
}
