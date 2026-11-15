import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { formatEGP, formatPercent } from '@/lib/format';
import { capacityByDay, compoundStats, type DayCapacity } from '@/lib/selectors';
import { COMPOUND_STATUS } from '@/config/status';
import { useDemoStore } from '@/store/demoStore';
import type { Compound } from '@/types/domain';
import { AdminPage, Chip } from './shared';

interface Row {
  compound: Compound;
  subscribers: number;
  mrr: number;
  rating: number | null;
  days: DayCapacity[];
  washers: string;
}

const used = (d: DayCapacity) => (d.capacity ? d.load / d.capacity : 0);

export function CompoundsPage() {
  const navigate = useNavigate();
  const compounds = useDemoStore((s) => s.compounds);
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const washes = useDemoStore((s) => s.washes);
  const washers = useDemoStore((s) => s.washers);

  const rows = useMemo<Row[]>(
    () =>
      compounds.map((compound) => {
        const stats = compoundStats({ subscriptions, washes }, compound.id);
        return {
          compound,
          subscribers: stats.subscribers,
          mrr: stats.mrr,
          rating: stats.averageRating,
          days: capacityByDay(compound, subscriptions),
          washers: washers
            .filter((w) => compound.washerIds.includes(w.id))
            .map((w) => w.name)
            .join(', '),
        };
      }),
    [compounds, subscriptions, washes, washers],
  );

  const columns: Column<Row>[] = [
    {
      key: 'name',
      header: 'Compound',
      cell: (r) => <span className="font-medium">{r.compound.name}</span>,
      sortValue: (r) => r.compound.name,
    },
    {
      key: 'area',
      header: 'Area',
      cell: (r) => r.compound.area,
      sortValue: (r) => r.compound.area,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (r) => <Chip def={COMPOUND_STATUS[r.compound.status]} />,
      sortValue: (r) => r.compound.status,
    },
    {
      key: 'subs',
      header: 'Subscribers',
      cell: (r) => r.subscribers,
      sortValue: (r) => r.subscribers,
      align: 'right',
    },
    {
      key: 'capacity',
      header: 'Capacity used',
      cell: (r) => (
        <span className="tabular whitespace-nowrap">
          {r.days.map((d) => (
            <span
              key={d.day}
              className={
                d.status === 'full'
                  ? 'text-danger font-medium'
                  : d.status === 'nearly_full'
                    ? 'text-warning font-medium'
                    : ''
              }
            >
              {d.day[0].toUpperCase() + d.day.slice(1)} {formatPercent(used(d))}{' '}
            </span>
          ))}
        </span>
      ),
      sortValue: (r) => Math.max(...r.days.map(used)),
    },
    { key: 'washers', header: 'Washers', cell: (r) => r.washers },
    {
      key: 'rating',
      header: 'Avg rating',
      cell: (r) => (r.rating ? r.rating.toFixed(2) : '—'),
      sortValue: (r) => r.rating ?? 0,
      align: 'right',
    },
    {
      key: 'mrr',
      header: 'MRR',
      cell: (r) => formatEGP(r.mrr),
      sortValue: (r) => r.mrr,
      align: 'right',
    },
  ];

  return (
    <AdminPage title="Compounds" subtitle={`${compounds.length} compounds`}>
      <DataTable
        rows={rows}
        columns={columns}
        rowKey={(r) => r.compound.id}
        searchText={(r) => `${r.compound.name} ${r.compound.area}`}
        searchPlaceholder="Search compounds"
        onRowClick={(r) => navigate(`/admin/compounds/${r.compound.id}`)}
        initialSort={{ key: 'subs', dir: 'desc' }}
      />
    </AdminPage>
  );
}
