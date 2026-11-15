import { Bell, CalendarDays, CircleHelp, Home, Sparkles, UserRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { PhoneFrame } from '@/components/app/PhoneFrame';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/cn';
import { useDemoStore } from '@/store/demoStore';
import { useCustomerContext } from '@/store/hooks';

/** Phone frame only: used by the welcome and onboarding screens. */
export function CustomerShell() {
  return (
    <PhoneFrame>
      <Outlet />
    </PhoneFrame>
  );
}

const TABS = [
  { to: '/customer/home', label: 'Home', icon: Home },
  { to: '/customer/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/customer/washes', label: 'Washes', icon: Sparkles },
  { to: '/customer/account', label: 'Account', icon: UserRound },
];

/**
 * Shows a WhatsApp-style preview when a new notification arrives for the
 * logged-in customer, so interviewees see how they would be updated.
 */
function useNotificationToasts(customerId: string | undefined) {
  const notifications = useDemoStore((s) => s.notifications);
  const whatsapp = useDemoStore(
    (s) => s.customers.find((c) => c.id === customerId)?.notificationPrefs.whatsapp,
  );
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!seen.current) {
      seen.current = new Set(notifications.map((n) => n.id));
      return;
    }
    for (const n of notifications) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      // Confirmations of the customer's own actions already show a toast.
      if (n.customerId !== customerId || n.kind === 'promo' || n.kind === 'payment') continue;
      if (whatsapp) toast.whatsapp(n.title, n.body);
      else toast.show(n.title, n.body);
    }
  }, [notifications, customerId, whatsapp]);
}

export function CustomerLayout() {
  const ctx = useCustomerContext();
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  const unread = useDemoStore(
    (s) => s.notifications.filter((n) => n.customerId === ctx?.customer.id && !n.read).length,
  );
  useNotificationToasts(ctx?.customer.id);

  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [pathname]);

  if (!ctx) return <Navigate to="/customer/welcome" replace />;

  return (
    <PhoneFrame>
      <header className="border-border bg-surface flex h-14 shrink-0 items-center justify-between border-b px-4">
        <BrandMark />
        <div className="flex">
          <Link
            to="/customer/support"
            aria-label="Help and support"
            className="hover:bg-bg grid size-12 place-items-center rounded-full"
          >
            <CircleHelp className="size-6" aria-hidden />
          </Link>
          <Link
            to="/customer/notifications"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            className="hover:bg-bg relative grid size-12 place-items-center rounded-full"
          >
            <Bell className="size-6" aria-hidden />
            {unread > 0 && (
              <span className="bg-danger absolute top-2 right-2 grid min-w-5 place-items-center rounded-full px-1 text-xs font-semibold text-white">
                {unread}
              </span>
            )}
          </Link>
        </div>
      </header>
      <main ref={main} className="flex-1 overflow-y-auto px-4 pt-4 pb-8">
        <Outlet />
      </main>
      <nav
        aria-label="Main"
        className="border-border bg-surface grid shrink-0 grid-cols-4 border-t pb-[env(safe-area-inset-bottom)]"
      >
        {TABS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium',
                isActive ? 'text-primary' : 'text-ink-2',
              )
            }
          >
            <Icon className="size-6" aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </PhoneFrame>
  );
}
