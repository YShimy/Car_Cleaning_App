import {
  CircleAlert,
  CloudRain,
  Coins,
  Sparkles,
  Star,
  Timer,
  TrendingDown,
  Users,
} from 'lucide-react';
import { useMemo } from 'react';
import { Avatar } from '@/components/app/Avatar';
import { Card, SectionTitle } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressSteps';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StatusChip } from '@/components/ui/StatusChip';
import { formatDateLong, formatEGP, formatPercent } from '@/lib/format';
import {
  compoundStats,
  kpis,
  revenueByPlan,
  subscriberGrowth,
  todayProgress,
  washesPerDay,
} from '@/lib/selectors';
import { useInitialLoading } from '@/lib/useInitialLoading';
import { useDemoStore } from '@/store/demoStore';
import { BarChartCard, LineChartCard } from './charts';
import { AdminPage, TextLink } from './shared';

const thousands = (v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v));

export function OverviewPage() {
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const washes = useDemoStore((s) => s.washes);
  const issues = useDemoStore((s) => s.issues);
  const compounds = useDemoStore((s) => s.compounds);
  const washers = useDemoStore((s) => s.washers);
  const loading = useInitialLoading('admin-overview', 400);

  // Everything below is derived from the store; nothing is hard-coded.
  const view = useMemo(() => {
    const now = new Date();
    return {
      now,
      k: kpis({ subscriptions, washes, issues }, now),
      growth: subscriberGrowth(subscriptions, now),
      perDay: washesPerDay(washes, now),
      byPlan: revenueByPlan(subscriptions),
      byCompound: compounds
        .map((c) => ({
          compound: c.name,
          subscribers: compoundStats({ subscriptions, washes }, c.id).subscribers,
        }))
        .sort((a, b) => b.subscribers - a.subscribers),
      today: todayProgress({ compounds, washes, washers }, now),
    };
  }, [subscriptions, washes, issues, compounds, washers]);
  const { k } = view;

  if (loading) {
    return (
      <AdminPage title="Overview">
        <SkeletonList rows={4} />
      </AdminPage>
    );
  }

  return (
    <AdminPage title="Overview" subtitle={formatDateLong(view.now)}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Active subscribers"
          value={k.activeSubscribers.toLocaleString('en-US')}
          icon={Users}
          hint="Active subscriptions (cars)"
        />
        <KpiCard label="Monthly recurring revenue" value={formatEGP(k.mrr)} icon={Coins} />
        <KpiCard
          label="Washes this week"
          value={`${k.washesThisWeek.done} done`}
          hint={`${k.washesThisWeek.scheduled} still scheduled`}
          icon={Sparkles}
        />
        <KpiCard
          label="On-time completion"
          value={formatPercent(k.onTimeRate, 1)}
          hint="Last 30 days"
          icon={Timer}
        />
        <KpiCard
          label="Average rating"
          value={k.averageRating ? k.averageRating.toFixed(2) : '—'}
          hint="All rated washes"
          icon={Star}
        />
        <KpiCard label="Open issues" value={String(k.openIssues)} icon={CircleAlert} />
        <KpiCard
          label="Monthly churn"
          value={formatPercent(k.churnRate, 1)}
          hint="Last 30 days"
          icon={TrendingDown}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineChartCard
          title="Subscriber growth"
          note="Live subscriptions at month end, last 6 months"
          rows={view.growth}
          labelKey="month"
          valueKey="subscribers"
          valueLabel="Subscribers"
        />
        <BarChartCard
          title="Washes per day"
          note="Completed washes, last 14 days"
          rows={view.perDay}
          labelKey="label"
          valueKey="washes"
          valueLabel="Washes"
        />
        <BarChartCard
          title="Revenue by plan"
          note="Monthly recurring revenue, EGP"
          rows={view.byPlan}
          labelKey="plan"
          valueKey="revenue"
          valueLabel="MRR"
          format={formatEGP}
          tickFormat={thousands}
        />
        <BarChartCard
          title="Subscribers by compound"
          note="Active subscriptions"
          rows={view.byCompound}
          labelKey="compound"
          valueKey="subscribers"
          valueLabel="Subscribers"
          horizontal
        />
      </div>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <SectionTitle>Today</SectionTitle>
          <TextLink to="/admin/schedule">Open schedule board</TextLink>
        </div>
        {view.today.length === 0 ? (
          <p className="text-ink-2">No compound is served today.</p>
        ) : (
          <ul className="divide-border divide-y">
            {view.today.map((row) => (
              <li
                key={row.compound.id}
                className="grid items-center gap-x-6 gap-y-2 py-3 md:grid-cols-[14rem_1fr_auto]"
              >
                <div>
                  <TextLink to={`/admin/compounds/${row.compound.id}`}>
                    {row.compound.name}
                  </TextLink>
                  <p className="text-ink-2 text-sm">{row.compound.area}</p>
                </div>
                <div>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="tabular font-medium">
                      {row.done} of {row.total} done
                    </span>
                    {row.delayed && (
                      <StatusChip tone="warning" icon={CloudRain}>
                        Weather delay
                      </StatusChip>
                    )}
                  </div>
                  <ProgressBar
                    value={row.done}
                    max={row.total}
                    tone="success"
                    label={`${row.compound.name} progress`}
                  />
                </div>
                <ul className="flex flex-wrap gap-3">
                  {row.washers.map((w) => (
                    <li key={w.id} className="flex items-center gap-2 text-sm">
                      <Avatar initials={w.photoInitials} size="sm" />
                      {w.name}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminPage>
  );
}
