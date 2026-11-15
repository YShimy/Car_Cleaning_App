import {
  Building2,
  CalendarRange,
  CreditCard,
  HardHat,
  LayoutDashboard,
  MessageSquareWarning,
  PanelLeft,
  Users,
} from 'lucide-react';
import { Suspense, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { SkeletonList } from '@/components/ui/Skeleton';
import { cn } from '@/lib/cn';

const NAV = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/admin/schedule', label: 'Schedule', icon: CalendarRange },
  { to: '/admin/compounds', label: 'Compounds', icon: Building2 },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/washers', label: 'Washers', icon: HardHat },
  { to: '/admin/issues', label: 'Issues', icon: MessageSquareWarning },
  { to: '/admin/payments', label: 'Payments', icon: CreditCard },
];

export default function AdminLayout() {
  // Collapsed by default below 1024px (tablet); the button toggles it anywhere.
  const [collapsed, setCollapsed] = useState(() => window.innerWidth < 1024);
  return (
    <div className="flex min-h-dvh">
      <aside
        className={cn(
          'border-border bg-surface no-print sticky top-0 flex h-dvh shrink-0 flex-col border-r transition-[width] duration-200',
          collapsed ? 'w-16' : 'w-56',
        )}
      >
        <div className="flex h-14 items-center px-3.5">
          {collapsed ? <BrandMark size="sm" /> : <BrandMark />}
        </div>
        <nav aria-label="Admin" className="flex-1 space-y-1 px-2 py-2">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              title={collapsed ? label : undefined}
              className={({ isActive }) =>
                cn(
                  'flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium',
                  isActive
                    ? 'bg-primary-soft text-primary'
                    : 'text-ink-2 hover:bg-bg hover:text-ink',
                )
              }
            >
              <Icon className="size-5 shrink-0" aria-hidden />
              <span className={collapsed ? 'sr-only' : ''}>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="border-border bg-surface/90 sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b px-4 backdrop-blur">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
              aria-expanded={!collapsed}
              className="hover:bg-bg no-print grid size-10 place-items-center rounded-lg"
            >
              <PanelLeft className="size-5" aria-hidden />
            </button>
            <span className="text-ink-2 text-sm font-medium">Operations</span>
          </div>
          <DemoBadge />
        </header>
        <main className="mx-auto max-w-[1400px] p-4 md:p-6">
          <Suspense fallback={<SkeletonList rows={4} />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
