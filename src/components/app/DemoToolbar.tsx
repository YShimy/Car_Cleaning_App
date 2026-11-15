import { ChevronDown, FlaskConical, MonitorPlay, RotateCcw, StepForward } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { NOUR_ID } from '@/data/generate';
import { cn } from '@/lib/cn';
import { firstName } from '@/lib/format';
import { useDemoStore } from '@/store/demoStore';
import type { Role } from '@/types/domain';
import { toast } from '../ui/toast';

const ROLES: { role: Role; label: string; path: string }[] = [
  { role: 'customer', label: 'Customer', path: '/customer/home' },
  { role: 'washer', label: 'Washer', path: '/washer/today' },
  { role: 'admin', label: 'Admin', path: '/admin' },
  { role: 'manager', label: 'Manager', path: '/manager' },
];

const STEP_MESSAGE: Record<string, string> = {
  washer_on_site: 'Washer arrived',
  in_progress: 'Washing started',
  completed: 'Wash completed with photos',
};

const NEW_CUSTOMER = '__new__';

/**
 * Floating demo controls. Hidden entirely in presentation mode; bring it
 * back with Shift+D or a long-press on the logo.
 */
export function DemoToolbar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const session = useDemoStore((s) => s.session);
  const customers = useDemoStore((s) => s.customers);
  const {
    setRole,
    setPersona,
    setPresentationMode,
    setInterviewMode,
    simulateNextStep,
    resetDemo,
  } = useDemoStore.getState();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (e.shiftKey && e.key.toLowerCase() === 'd') {
        const { session: s, setPresentationMode: toggle } = useDemoStore.getState();
        toggle(!s.presentationMode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // During an interview the resident should see only the product.
  if (session.presentationMode || session.interviewMode) return null;

  // Customers created in this demo session (ids from the generator are numeric).
  const created = customers.filter((c) => c.id !== NOUR_ID && !/^cust_\d{4}$/.test(c.id));

  const switchRole = (role: Role, path: string) => {
    setRole(role);
    navigate(role === 'customer' && !session.customerId ? '/customer/welcome' : path);
  };

  const switchPersona = (value: string) => {
    setInterviewMode(false);
    if (value === NEW_CUSTOMER) {
      setPersona(null);
      navigate('/customer/welcome');
    } else {
      setPersona(value);
      navigate('/customer/home');
    }
  };

  const simulate = () => {
    const focus = simulateNextStep();
    if (session.role !== 'customer' || !focus) {
      toast.show(
        'Advanced today’s washes one step',
        focus ? STEP_MESSAGE[focus.status] : undefined,
      );
    }
  };

  const reset = () => {
    resetDemo();
    toast.success('Demo data reset');
    navigate('/');
  };

  const item =
    'flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-sm font-medium hover:bg-white/10';

  return (
    <div className="no-print fixed bottom-20 left-2 z-[35] text-white min-[600px]:bottom-4 min-[600px]:left-4">
      {open && (
        <div
          className="animate-fade-in mb-2 w-64 space-y-3 rounded-2xl bg-[#1b2330]/95 p-3 shadow-frame backdrop-blur"
          role="region"
          aria-label="Demo controls"
        >
          <div>
            <p className="mb-1.5 text-xs font-medium text-white/70">View as</p>
            <div className="grid grid-cols-2 gap-1.5">
              {ROLES.map((r) => (
                <button
                  key={r.role}
                  type="button"
                  onClick={() => switchRole(r.role, r.path)}
                  aria-pressed={session.role === r.role}
                  className={cn(
                    'min-h-10 rounded-lg px-2 text-sm font-medium',
                    session.role === r.role ? 'text-ink bg-white' : 'bg-white/10 hover:bg-white/20',
                  )}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-white/70">Customer persona</span>
            <select
              value={session.customerId ?? NEW_CUSTOMER}
              onChange={(e) => switchPersona(e.target.value)}
              className="text-ink min-h-10 w-full rounded-lg bg-white px-2 text-sm"
            >
              <option value={NOUR_ID}>Nour Hassan</option>
              {created.map((c) => (
                <option key={c.id} value={c.id}>
                  {firstName(c.name)} (joined in this demo)
                </option>
              ))}
              <option value={NEW_CUSTOMER}>New customer</option>
            </select>
          </label>
          <div className="space-y-0.5 border-t border-white/15 pt-2">
            <button type="button" className={item} onClick={simulate}>
              <StepForward className="size-4" aria-hidden /> Simulate next step
            </button>
            <button
              type="button"
              className={item}
              onClick={() => {
                setPresentationMode(true);
                toast.show(
                  'Presentation mode on',
                  'Press Shift+D or long-press the logo to show the demo controls again.',
                );
              }}
            >
              <MonitorPlay className="size-4" aria-hidden /> Presentation mode
            </button>
            <button type="button" className={item} onClick={reset}>
              <RotateCcw className="size-4" aria-hidden /> Reset demo
            </button>
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1 border-t border-white/15 pt-2 text-xs text-white/80">
            <Link to="/" className="underline underline-offset-2">
              Launcher
            </Link>
            <Link
              to="/admin/interviews"
              onClick={() => setRole('admin')}
              className="underline underline-offset-2"
            >
              Interview sessions
            </Link>
            <Link to="/share" className="underline underline-offset-2">
              Share QR
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn(
          'flex min-h-10 items-center gap-1.5 rounded-full bg-[#1b2330] px-3 text-sm font-medium shadow-card transition-opacity',
          open ? 'opacity-100' : 'opacity-60 hover:opacity-100 focus-visible:opacity-100',
        )}
      >
        <FlaskConical className="size-4" aria-hidden />
        <span className="max-[599px]:sr-only">Demo</span>
        <ChevronDown
          className={cn('size-4 transition-transform', open ? '' : 'rotate-180')}
          aria-hidden
        />
      </button>
    </div>
  );
}
