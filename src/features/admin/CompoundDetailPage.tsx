import { SearchX } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar } from '@/components/app/Avatar';
import { Card, SectionTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { KpiCard } from '@/components/ui/KpiCard';
import { ProgressBar } from '@/components/ui/ProgressSteps';
import { StatusChip } from '@/components/ui/StatusChip';
import { PLANS } from '@/config/business';
import { ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '@/config/copy';
import { joinWeekdays, WEEKDAY_LABEL } from '@/lib/dates';
import { formatDateNumeric, formatEGP, SERVICE_WINDOW_LABEL } from '@/lib/format';
import { capacityByDay, compoundStats } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';
import { ISSUE_TONE, SUB_STATUS, COMPOUND_STATUS } from '@/config/status';
import { AdminPage, Breadcrumb, Chip } from './shared';

export function CompoundDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === id));
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const washes = useDemoStore((s) => s.washes);
  const customers = useDemoStore((s) => s.customers);
  const washers = useDemoStore((s) => s.washers);
  const issues = useDemoStore((s) => s.issues);

  if (!compound) return <EmptyState icon={SearchX} title="We could not find this compound." />;

  const stats = compoundStats({ subscriptions, washes }, compound.id);
  const days = capacityByDay(compound, subscriptions);
  const subs = subscriptions.filter((s) => s.compoundId === compound.id);
  const compoundIssues = issues.filter((i) => i.compoundId === compound.id);
  const rows = subs.map((sub) => ({
    sub,
    customer: customers.find((c) => c.id === sub.customerId)!,
  }));

  return (
    <AdminPage
      title={compound.name}
      subtitle={`${compound.area} · partner since ${formatDateNumeric(compound.partnershipSince)}`}
      actions={<Chip def={COMPOUND_STATUS[compound.status]} />}
    >
      <Breadcrumb to="/admin/compounds" label="All compounds" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard label="Active subscribers" value={String(stats.subscribers)} />
        <KpiCard label="MRR" value={formatEGP(stats.mrr)} />
        <KpiCard
          label="Average rating"
          value={stats.averageRating ? stats.averageRating.toFixed(2) : '—'}
        />
        <KpiCard
          label="Open issues"
          value={String(compoundIssues.filter((i) => i.status !== 'resolved').length)}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle className="mb-3">Service days</SectionTitle>
          <ul className="space-y-4">
            {days.map((d) => (
              <li key={d.day}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="font-medium">{WEEKDAY_LABEL[d.day]}</span>
                  <span className="tabular text-ink-2">
                    {d.load} of {d.capacity} · {d.left === 0 ? 'Full' : `${d.left} left`}
                  </span>
                </div>
                <ProgressBar
                  value={d.load}
                  max={d.capacity}
                  tone={
                    d.status === 'full'
                      ? 'danger'
                      : d.status === 'nearly_full'
                        ? 'warning'
                        : 'primary'
                  }
                  label={`${WEEKDAY_LABEL[d.day]} capacity used`}
                />
              </li>
            ))}
          </ul>
          <p className="text-ink-2 mt-3 text-sm">Window {SERVICE_WINDOW_LABEL}</p>
        </Card>
        <Card>
          <SectionTitle className="mb-3">Washers</SectionTitle>
          <ul className="space-y-3">
            {washers
              .filter((w) => compound.washerIds.includes(w.id))
              .map((w) => (
                <li key={w.id} className="flex items-center gap-3">
                  <Avatar initials={w.photoInitials} size="sm" />
                  <span>
                    <span className="block font-medium">{w.name}</span>
                    <span className="text-ink-2 text-sm">ID verified · {w.phone}</span>
                  </span>
                </li>
              ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle className="mb-3">Compound</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-2">Manager contact</dt>
              <dd className="font-medium">{compound.managerName}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Service days</dt>
              <dd className="font-medium">{joinWeekdays(compound.serviceDays)}</dd>
            </div>
            <div>
              <dt className="text-ink-2">Parking zones</dt>
              <dd className="font-medium">{compound.parkingZones.join(' · ')}</dd>
            </div>
          </dl>
        </Card>
      </div>

      <section>
        <SectionTitle className="mb-2">Subscribers</SectionTitle>
        <DataTable
          rows={rows}
          rowKey={(r) => r.sub.id}
          searchText={(r) => `${r.customer.name} ${r.customer.unit}`}
          searchPlaceholder="Search subscribers"
          pageSize={8}
          onRowClick={(r) => navigate(`/admin/customers/${r.customer.id}`)}
          emptyMessage="No subscribers yet. This compound is still onboarding."
          columns={[
            {
              key: 'name',
              header: 'Customer',
              cell: (r) => <span className="font-medium">{r.customer.name}</span>,
              sortValue: (r) => r.customer.name,
            },
            { key: 'unit', header: 'Home', cell: (r) => r.customer.unit },
            {
              key: 'plan',
              header: 'Plan',
              cell: (r) => PLANS[r.sub.plan].name,
              sortValue: (r) => r.sub.plan,
            },
            { key: 'days', header: 'Wash days', cell: (r) => joinWeekdays(r.sub.weeklyDays) },
            {
              key: 'status',
              header: 'Status',
              cell: (r) => <Chip def={SUB_STATUS[r.sub.status]} />,
              sortValue: (r) => r.sub.status,
            },
            {
              key: 'price',
              header: 'Monthly',
              cell: (r) => formatEGP(r.sub.monthlyPrice),
              sortValue: (r) => r.sub.monthlyPrice,
              align: 'right',
            },
          ]}
        />
      </section>

      <Card>
        <SectionTitle className="mb-2">Issues</SectionTitle>
        {compoundIssues.length === 0 ? (
          <p className="text-ink-2">No issues reported in this compound.</p>
        ) : (
          <ul className="divide-border divide-y">
            {compoundIssues.map((issue) => (
              <li key={issue.id} className="flex items-start justify-between gap-3 py-2.5 text-sm">
                <span>
                  <span className="font-medium">{ISSUE_TYPE_LABEL[issue.type]}</span> ·{' '}
                  {issue.description}
                  <span className="text-ink-2 block text-xs">
                    {formatDateNumeric(issue.createdAt)}
                  </span>
                </span>
                <StatusChip tone={ISSUE_TONE[issue.status]}>
                  {ISSUE_STATUS_LABEL[issue.status]}
                </StatusChip>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </AdminPage>
  );
}
