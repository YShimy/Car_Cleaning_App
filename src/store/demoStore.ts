import { create } from 'zustand';
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware';
import { generateDemoData, NOUR_ID } from '@/data/generate';
import { toISODate } from '@/lib/dates';
import type {
  AddOnId,
  Car,
  Customer,
  DamageMarker,
  DemoData,
  ID,
  IssueStatus,
  IssueType,
  PaymentMethod,
  PlanId,
  Role,
  Session,
  Wash,
  Weekday,
} from '@/types/domain';
import * as r from './reducers';

/** Bump the version suffix to force every browser to regenerate. */
export const STORAGE_KEY = 'lamaa-demo-v1';
const STORAGE_VERSION = 1;

const initialSession = (data: DemoData): Session => ({
  role: 'customer',
  customerId: NOUR_ID,
  washerId:
    data.washes.find((w) => w.scheduledDate === data.generatedOn)?.washerId ?? data.washers[0].id,
  managerCompoundId: null,
  presentationMode: false,
  interviewMode: false,
});

const freshState = (now = new Date()): DemoData & { session: Session } => {
  const data = generateDemoData(now);
  return { ...data, session: initialSession(data) };
};

interface Actions {
  resetDemo: () => void;
  setRole: (role: Role) => void;
  /** Log in as an existing customer, or null for "new customer". */
  setPersona: (customerId: ID | null) => void;
  setWasher: (washerId: ID) => void;
  setManagerCompound: (compoundId: ID | null) => void;
  setPresentationMode: (on: boolean) => void;
  setInterviewMode: (on: boolean) => void;

  subscribe: (input: r.SubscribeInput) => ReturnType<typeof r.subscribe>;
  skipWash: (washId: ID) => void;
  pauseSubscription: (subId: ID, weeks: number) => void;
  resumeSubscription: (subId: ID) => void;
  changeWeeklyDay: (subId: ID, day: Weekday) => void;
  changePlan: (subId: ID, plan: PlanId) => void;
  requestCancellation: (subId: ID, reason: string) => void;
  undoCancellation: (subId: ID) => void;
  setPaymentMethod: (subId: ID, method: PaymentMethod) => void;
  addAddOn: (washId: ID, addOn: AddOnId) => void;
  rateWash: (washId: ID, rating: NonNullable<Wash['rating']>) => void;
  reportIssue: (input: { customerId: ID; washId?: ID; type: IssueType; description: string }) => ID;
  updateIssue: (issueId: ID, status: IssueStatus, resolutionNote?: string) => void;
  updateCustomer: (customerId: ID, changes: Partial<Customer>) => void;
  updateCar: (carId: ID, changes: Partial<Car>) => void;
  markNotificationsRead: (customerId: ID) => void;

  washArrive: (washId: ID) => void;
  washStart: (washId: ID) => void;
  washComplete: (
    washId: ID,
    details?: { washerNote?: string; damageMarkers?: DamageMarker[] },
  ) => void;
  saveWashDraft: (
    washId: ID,
    draft: Pick<Wash, 'checklist' | 'damageMarkers' | 'washerNote'>,
  ) => void;
  flagWash: (washId: ID, flag: r.WashFlag) => void;
  simulateNextStep: () => Wash | null;
  markWeatherDelay: (compoundId: ID, date: string) => { moved: number; movedTo: string };
}

export type DemoState = DemoData & { session: Session } & Actions;

/**
 * The persisted state is ~1.5 MB of JSON, so writes are debounced: a burst
 * of actions costs one localStorage write, flushed when the tab is hidden.
 */
function debouncedLocalStorage(delayMs = 250): StateStorage {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: { name: string; value: string } | null = null;
  const flush = () => {
    if (!pending) return;
    try {
      localStorage.setItem(pending.name, pending.value);
    } catch {
      // Storage full or blocked (private mode): the demo still works in memory.
    }
    pending = null;
  };
  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush();
    });
  }
  return {
    getItem: (name) => localStorage.getItem(name),
    setItem: (name, value) => {
      pending = { name, value };
      clearTimeout(timer);
      timer = setTimeout(flush, delayMs);
    },
    removeItem: (name) => {
      pending = null;
      localStorage.removeItem(name);
    },
  };
}

export const useDemoStore = create<DemoState>()(
  persist(
    (set, get) => {
      /** Runs a reducer against the current data and merges the result. */
      const run = (reducer: (data: DemoData, now: Date) => r.Patch) =>
        set(reducer(get(), new Date()));
      const setSession = (changes: Partial<Session>) =>
        set((s) => ({ session: { ...s.session, ...changes } }));

      return {
        ...freshState(),

        resetDemo: () =>
          set((s) => {
            const fresh = freshState();
            // Keep presentation mode: resetting mid-demo should not reveal the toolbar.
            return {
              ...fresh,
              session: { ...fresh.session, presentationMode: s.session.presentationMode },
            };
          }),
        setRole: (role) => setSession({ role }),
        setPersona: (customerId) => setSession({ customerId, role: 'customer' }),
        setWasher: (washerId) => setSession({ washerId }),
        setManagerCompound: (managerCompoundId) => setSession({ managerCompoundId }),
        setPresentationMode: (presentationMode) => setSession({ presentationMode }),
        setInterviewMode: (interviewMode) => setSession({ interviewMode }),

        subscribe: (input) => {
          const result = r.subscribe(get(), input, new Date());
          set(result.patch);
          setSession({ customerId: result.customerId });
          return result;
        },
        skipWash: (washId) => run((d, now) => r.skipWash(d, washId, now)),
        pauseSubscription: (subId, weeks) =>
          run((d, now) => r.pauseSubscription(d, subId, weeks, now)),
        resumeSubscription: (subId) => run((d, now) => r.resumeSubscription(d, subId, now)),
        changeWeeklyDay: (subId, day) => run((d, now) => r.changeWeeklyDay(d, subId, day, now)),
        changePlan: (subId, plan) => run((d, now) => r.changePlan(d, subId, plan, now)),
        requestCancellation: (subId, reason) =>
          run((d, now) => r.requestCancellation(d, subId, reason, now)),
        undoCancellation: (subId) => run((d, now) => r.undoCancellation(d, subId, now)),
        setPaymentMethod: (subId, method) => run((d) => r.setPaymentMethod(d, subId, method)),
        addAddOn: (washId, addOn) => run((d, now) => r.addAddOn(d, washId, addOn, now)),
        rateWash: (washId, rating) => run((d) => r.rateWash(d, washId, rating)),
        reportIssue: (input) => {
          const { patch, issueId } = r.reportIssue(get(), input, new Date());
          set(patch);
          return issueId;
        },
        updateIssue: (issueId, status, note) =>
          run((d, now) => r.updateIssue(d, issueId, status, note, now)),
        updateCustomer: (customerId, changes) =>
          run((d) => r.updateCustomer(d, customerId, changes)),
        updateCar: (carId, changes) => run((d) => r.updateCar(d, carId, changes)),
        markNotificationsRead: (customerId) => run((d) => r.markNotificationsRead(d, customerId)),

        washArrive: (washId) => run((d, now) => r.washArrive(d, washId, now)),
        washStart: (washId) => run((d, now) => r.washStart(d, washId, now)),
        washComplete: (washId, details) => run((d, now) => r.washComplete(d, washId, now, details)),
        saveWashDraft: (washId, draft) => run((d) => r.saveWashDraft(d, washId, draft)),
        flagWash: (washId, flag) => run((d, now) => r.flagWash(d, washId, flag, now)),
        simulateNextStep: () => {
          const { patch, focusWash } = r.simulateNextStep(
            get(),
            get().session.customerId,
            new Date(),
          );
          set(patch);
          return focusWash;
        },
        markWeatherDelay: (compoundId, date) => {
          const { patch, moved, movedTo } = r.markWeatherDelay(get(), compoundId, date, new Date());
          set(patch);
          return { moved, movedTo };
        },
      };
    },
    {
      name: STORAGE_KEY,
      version: STORAGE_VERSION,
      storage: createJSONStorage(() => debouncedLocalStorage()),
      // A different stored version means the data shape changed: start fresh.
      migrate: () => freshState() as unknown as DemoState,
      // Dates are generated relative to "today". If the stored data is from
      // another day, regenerate so the demo always feels current.
      merge: (persisted, current) => {
        const stored = persisted as Partial<DemoState> | undefined;
        if (!stored || stored.generatedOn !== toISODate(new Date())) {
          return stored?.session
            ? {
                ...current,
                session: { ...current.session, presentationMode: stored.session.presentationMode },
              }
            : current;
        }
        return { ...current, ...stored };
      },
    },
  ),
);

/** Stable "now" for a render pass; the demo does not need a ticking clock. */
export const getNow = () => new Date();
