import { SearchX } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { CarIllustration } from '@/components/app/CarIllustration';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Card, SectionTitle } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { EmptyState } from '@/components/ui/EmptyState';
import { StarRating } from '@/components/ui/StarRating';
import { StatusChip } from '@/components/ui/StatusChip';
import { PAYMENT_METHOD_LABEL, PLANS } from '@/config/business';
import { ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL, WASH_TYPE_LABEL } from '@/config/copy';
import { CAR_COLOR_LABEL, carLabel } from '@/data/cars';
import { ISSUE_TONE, SUB_STATUS, PAYMENT_STATUS } from '@/config/status';
import { joinWeekdays } from '@/lib/dates';
import { formatDateNumeric, formatEGP } from '@/lib/format';
import { useDemoStore } from '@/store/demoStore';
import { AdminPage, Breadcrumb, Chip, TextLink } from './shared';

export function CustomerDetailPage() {
  const { id } = useParams();
  const customer = useDemoStore((s) => s.customers.find((c) => c.id === id));
  const compounds = useDemoStore((s) => s.compounds);
  const allCars = useDemoStore((s) => s.cars);
  const allSubs = useDemoStore((s) => s.subscriptions);
  const allWashes = useDemoStore((s) => s.washes);
  const allPayments = useDemoStore((s) => s.payments);
  const allIssues = useDemoStore((s) => s.issues);
  const washers = useDemoStore((s) => s.washers);
  const customers = useDemoStore((s) => s.customers);

  if (!customer) return <EmptyState icon={SearchX} title="We could not find this customer." />;

  const compound = compounds.find((c) => c.id === customer.compoundId)!;
  const cars = allCars.filter((c) => c.customerId === customer.id);
  const subs = allSubs.filter((s) => s.customerId === customer.id);
  const washes = allWashes
    .filter((w) => w.customerId === customer.id)
    .sort((a, b) => b.scheduledDate.localeCompare(a.scheduledDate));
  const payments = allPayments
    .filter((p) => p.customerId === customer.id)
    .sort((a, b) => b.date.localeCompare(a.date));
  const issues = allIssues.filter((i) => i.customerId === customer.id);
  const referrer = customers.find((c) => c.id === customer.referredBy);
  const notes = cars.flatMap((c) => (c.notes ? [`${carLabel(c)}: ${c.notes}`] : []));

  return (
    <AdminPage
      title={customer.name}
      subtitle={`${customer.unit} · ${customer.phone} · joined ${formatDateNumeric(customer.joinedAt)}`}
    >
      <Breadcrumb to="/admin/customers" label="All customers" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <SectionTitle className="mb-2">Profile</SectionTitle>
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-ink-2">Compound</dt>
              <dd>
                <TextLink to={`/admin/compounds/${compound.id}`}>{compound.name}</TextLink>
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">Referral code</dt>
              <dd className="font-medium">
                {customer.referralCode}
                {referrer && (
                  <span className="text-ink-2 font-normal"> · referred by {referrer.name}</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">Updates</dt>
              <dd className="font-medium">
                {[
                  customer.notificationPrefs.whatsapp && 'WhatsApp',
                  customer.notificationPrefs.push && 'App',
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </dd>
            </div>
            <div>
              <dt className="text-ink-2">Notes</dt>
              <dd>{notes.length ? notes.join(' · ') : 'No notes.'}</dd>
            </div>
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <SectionTitle className="mb-2">Cars and subscriptions</SectionTitle>
          <ul className="divide-border divide-y">
            {cars.map((car) => {
              const sub = subs.find((s) => s.carId === car.id);
              return (
                <li key={car.id} className="flex flex-wrap items-center gap-3 py-3">
                  <CarIllustration
                    bodyType={car.bodyType}
                    color={car.color}
                    state="clean"
                    seed={car.year}
                    className="h-14 w-24 shrink-0 rounded-md"
                  />
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="font-medium">
                      {CAR_COLOR_LABEL[car.color]} {carLabel(car)} {car.year} · {car.plate}
                    </p>
                    <p className="text-ink-2">
                      {car.parkingZone} · {car.parkingSpot}
                    </p>
                    {sub && (
                      <p className="text-ink-2">
                        {PLANS[sub.plan].name} · {joinWeekdays(sub.weeklyDays)} ·{' '}
                        {formatEGP(sub.monthlyPrice)}/month ·{' '}
                        {PAYMENT_METHOD_LABEL[sub.paymentMethod]}
                        {sub.cancelAt && ` · ends ${formatDateNumeric(sub.cancelAt)}`}
                        {sub.status === 'paused' &&
                          sub.pausedUntil &&
                          ` · until ${formatDateNumeric(sub.pausedUntil)}`}
                      </p>
                    )}
                  </div>
                  {sub && <Chip def={SUB_STATUS[sub.status]} />}
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <section>
        <SectionTitle className="mb-2">Wash history</SectionTitle>
        <DataTable
          rows={washes}
          rowKey={(w) => w.id}
          pageSize={8}
          emptyMessage="No washes yet."
          columns={[
            {
              key: 'date',
              header: 'Date',
              cell: (w) => formatDateNumeric(w.scheduledDate),
              sortValue: (w) => w.scheduledDate,
            },
            { key: 'type', header: 'Type', cell: (w) => WASH_TYPE_LABEL[w.type] },
            {
              key: 'washer',
              header: 'Washer',
              cell: (w) => washers.find((x) => x.id === w.washerId)?.name ?? '—',
            },
            {
              key: 'status',
              header: 'Status',
              cell: (w) => <WashStatusChip status={w.status} />,
              sortValue: (w) => w.status,
            },
            {
              key: 'rating',
              header: 'Rating',
              cell: (w) => (w.rating ? <StarRating value={w.rating.stars} size="sm" /> : '—'),
              sortValue: (w) => w.rating?.stars ?? 0,
            },
            {
              key: 'tags',
              header: 'Feedback',
              cell: (w) => w.rating?.tags.join(', ') || w.washerNote || '',
            },
          ]}
        />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle className="mb-2">Payments</SectionTitle>
          {payments.length === 0 ? (
            <p className="text-ink-2">No payments yet.</p>
          ) : (
            <ul className="divide-border divide-y">
              {payments.slice(0, 8).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    {p.description}
                    <span className="text-ink-2 block text-xs">
                      {formatDateNumeric(p.date)} · {PAYMENT_METHOD_LABEL[p.method]}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="tabular font-medium">{formatEGP(p.amount)}</span>
                    <Chip def={PAYMENT_STATUS[p.status]} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card>
          <SectionTitle className="mb-2">Issues</SectionTitle>
          {issues.length === 0 ? (
            <p className="text-ink-2">No issues reported.</p>
          ) : (
            <ul className="divide-border divide-y">
              {issues.map((issue) => (
                <li key={issue.id} className="py-2 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-medium">{ISSUE_TYPE_LABEL[issue.type]}</span>
                    <StatusChip tone={ISSUE_TONE[issue.status]}>
                      {ISSUE_STATUS_LABEL[issue.status]}
                    </StatusChip>
                  </div>
                  <p>{issue.description}</p>
                  {issue.resolutionNote && (
                    <p className="text-ink-2">Reply: {issue.resolutionNote}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </AdminPage>
  );
}
