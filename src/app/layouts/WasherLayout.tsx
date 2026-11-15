import { ClipboardList, ListChecks, UserRound } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { PhoneFrame } from '@/components/app/PhoneFrame';
import { cn } from '@/lib/cn';

const TABS = [
  { to: '/washer/today', label: 'Today', icon: ListChecks },
  { to: '/washer/summary', label: 'Summary', icon: ClipboardList },
  { to: '/washer/profile', label: 'Profile', icon: UserRound },
];

export function WasherLayout() {
  const { pathname } = useLocation();
  const main = useRef<HTMLElement>(null);
  // The wash flow is a full-screen stepper: no tab bar, so nothing distracts.
  const inFlow = pathname.startsWith('/washer/wash/');

  useEffect(() => {
    main.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <PhoneFrame>
      {!inFlow && (
        <header className="bg-ink flex h-14 shrink-0 items-center justify-between px-4 text-white">
          <BrandMark />
          <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">Washer</span>
        </header>
      )}
      <main ref={main} className={cn('flex-1 overflow-y-auto', inFlow ? '' : 'px-4 pt-4 pb-8')}>
        <Outlet />
      </main>
      {!inFlow && (
        <nav
          aria-label="Main"
          className="border-border bg-surface grid shrink-0 grid-cols-3 border-t pb-[env(safe-area-inset-bottom)]"
        >
          {TABS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold',
                  isActive ? 'text-primary' : 'text-ink-2',
                )
              }
            >
              <Icon className="size-6" aria-hidden />
              {label}
            </NavLink>
          ))}
        </nav>
      )}
    </PhoneFrame>
  );
}
