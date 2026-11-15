import { useMemo } from 'react';
import { Avatar } from '@/components/app/Avatar';
import { DataTable } from '@/components/ui/DataTable';
import { washerStats } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { AdminPage } from './shared';

export function WashersPage() {
  const washers = useDemoStore((s) => s.washers);
  const compounds = useDemoStore((s) => s.compounds);
  const washes = useDemoStore((s) => s.washes);
  const issues = useDemoStore((s) => s.issues);

  const rows = useMemo(() => {
    const now = new Date();
    return washers.map((washer) => {
      const stats = washerStats({ washes, issues }, washer.id, now);
      const washIds = new Set(washes.filter((w) => w.washerId === washer.id).map((w) => w.id));
      return {
        washer,
        compounds: compounds
          .filter((c) => washer.compoundIds.includes(c.id))
          .map((c) => c.name)
          .join(', '),
        week: stats.washesThisWeek,
        minutes: stats.averageMinutes,
        rating: stats.averageRating ?? washer.rating,
        issues: issues.filter((i) => i.washId && washIds.has(i.washId)).length,
      };
    });
  }, [washers, compounds, washes, issues]);

  return (
    <AdminPage title="Washers" subtitle={`${washers.length} washers, all ID-verified`}>
      <DataTable
        rows={rows}
        rowKey={(r) => r.washer.id}
        searchText={(r) => `${r.washer.name} ${r.compounds}`}
        searchPlaceholder="Search washers"
        initialSort={{ key: 'rating', dir: 'desc' }}
        columns={[
          {
            key: 'name',
            header: 'Washer',
            cell: (r) => (
              <span className="flex items-center gap-2 font-medium">
                <Avatar initials={r.washer.photoInitials} size="sm" />
                {r.washer.name}
              </span>
            ),
            sortValue: (r) => r.washer.name,
          },
          { key: 'compounds', header: 'Compounds', cell: (r) => r.compounds },
          {
            key: 'week',
            header: 'Washes this week',
            cell: (r) => r.week,
            sortValue: (r) => r.week,
            align: 'right',
          },
          {
            key: 'minutes',
            header: 'Avg time',
            cell: (r) => (r.minutes ? `${Math.round(r.minutes)} min` : '—'),
            sortValue: (r) => r.minutes ?? 0,
            align: 'right',
          },
          {
            key: 'rating',
            header: 'Rating',
            cell: (r) => r.rating.toFixed(2),
            sortValue: (r) => r.rating,
            align: 'right',
          },
          {
            key: 'issues',
            header: 'Issues (10 weeks)',
            cell: (r) => r.issues,
            sortValue: (r) => r.issues,
            align: 'right',
          },
        ]}
      />
    </AdminPage>
  );
}
