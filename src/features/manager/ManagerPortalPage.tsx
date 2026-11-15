import {
  CarFront,
  Clock,
  Droplets,
  MapPin,
  Printer,
  SearchX,
  ShieldCheck,
  Star,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar } from '@/components/app/Avatar';
import { Button } from '@/components/ui/Button';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { TextAreaField } from '@/components/ui/Field';
import { SideSheet } from '@/components/ui/Sheet';
import { StarRating } from '@/components/ui/StarRating';
import { StatusChip } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { BRAND } from '@/config/brand';
import { ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '@/config/copy';
import { ISSUE_TONE } from '@/config/status';
import { joinWeekdays } from '@/lib/dates';
import {
  formatDateLong,
  formatDateNumeric,
  formatDateShort,
  formatTime,
  SERVICE_WINDOW_LABEL,
} from '@/lib/format';
import {
  accessLog,
  anonymousUnit,
  compoundSatisfaction,
  compoundStats,
  expectedCarsThisWeek,
} from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';

function Rule({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <li className="flex items-start gap-3 py-2.5">
      <Icon className="text-primary mt-0.5 size-5 shrink-0" aria-hidden />
      <span>
        <span className="text-ink-2 block text-sm">{label}</span>
        <span className="font-medium">{value}</span>
      </span>
    </li>
  );
}

export function ManagerPortalPage() {
  const { compoundId } = useParams();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === compoundId));
  const washes = useDemoStore((s) => s.washes);
  const washers = useDemoStore((s) => s.washers);
  const issues = useDemoStore((s) => s.issues);
  const customers = useDemoStore((s) => s.customers);
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const [requestOpen, setRequestOpen] = useState(false);
  const [request, setRequest] = useState('');
  const [showAllLog, setShowAllLog] = useState(false);

  const view = useMemo(() => {
    if (!compound) return null;
    const now = new Date();
    return {
      now,
      week: expectedCarsThisWeek({ washes }, compound, now),
      log: accessLog({ washes, washers }, compound.id, now),
      satisfaction: compoundSatisfaction({ washes, issues }, compound.id, now),
      residents: compoundStats({ subscriptions, washes }, compound.id).subscribers,
    };
  }, [compound, washes, washers, issues, subscriptions]);

  if (!compound || !view)
    return <EmptyState icon={SearchX} title="We could not find this compound." />;

  const authorised = washers.filter((w) => compound.washerIds.includes(w.id));
  const { satisfaction } = view;
  const log = showAllLog ? view.log : view.log.slice(0, 6);

  const sendRequest = () => {
    setRequestOpen(false);
    setRequest('');
    toast.success(
      'Request sent',
      `${BRAND.name} will contact ${compound.managerName} within one working day.`,
    );
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl">{compound.name}</h1>
          <p className="text-ink-2">
            {compound.area} · Partner since {formatDateNumeric(compound.partnershipSince)} ·{' '}
            {view.residents} subscribed cars
          </p>
        </div>
        <Button variant="secondary" onClick={() => window.print()} className="no-print">
          <Printer className="size-5" aria-hidden />
          Monthly report (print or save as PDF)
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle>This week</SectionTitle>
          <p className="text-ink-2 text-sm">
            Wash days: {joinWeekdays(compound.serviceDays)} · {SERVICE_WINDOW_LABEL}
          </p>
          <ul className="divide-border mt-2 divide-y">
            {view.week.map((day) => (
              <li
                key={day.date.toISOString()}
                className="flex items-center justify-between gap-3 py-3"
              >
                <span>
                  <span className="block font-medium">{formatDateLong(day.date)}</span>
                  <span className="text-ink-2 text-sm">
                    {washers
                      .filter((w) => day.washerIds.includes(w.id))
                      .map((w) => w.name)
                      .join(' and ') || 'No washers booked'}
                  </span>
                </span>
                <span className="tabular text-right">
                  <span className="block text-xl font-semibold">{day.cars}</span>
                  <span className="text-ink-2 text-xs">cars expected</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>Washers authorised to enter</SectionTitle>
          <p className="text-ink-2 text-sm">Only these people may enter on wash days.</p>
          <ul className="divide-border mt-2 divide-y">
            {authorised.map((w) => (
              <li key={w.id} className="flex items-center gap-3 py-3">
                <Avatar initials={w.photoInitials} />
                <span className="flex-1">
                  <span className="block font-medium">{w.name}</span>
                  <span className="text-ink-2 text-sm">{w.phone}</span>
                </span>
                <StatusChip tone="success" icon={ShieldCheck}>
                  ID verified
                </StatusChip>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <SectionTitle>Resident satisfaction</SectionTitle>
          <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
            <p className="flex items-center gap-2">
              <span className="tabular text-3xl font-semibold">
                {satisfaction.averageRating ? satisfaction.averageRating.toFixed(1) : '—'}
              </span>
              {satisfaction.averageRating && (
                <StarRating
                  value={satisfaction.averageRating}
                  size="sm"
                  label="Average resident rating"
                />
              )}
            </p>
            <p className="text-ink-2 text-sm">
              {satisfaction.ratingsCount} ratings · {satisfaction.washesCompleted} washes completed
              (last 10 weeks)
            </p>
          </div>
          <h3 className="mt-4 text-base">
            Complaints this month: {satisfaction.complaints.length}
            {satisfaction.complaints.length > 0 && (
              <span className="text-ink-2 font-normal">
                {' '}
                · {satisfaction.complaintsResolved} resolved
              </span>
            )}
          </h3>
          {satisfaction.complaints.length === 0 ? (
            <p className="text-ink-2 mt-1 text-sm">No complaints from residents this month.</p>
          ) : (
            <ul className="divide-border mt-1 divide-y">
              {satisfaction.complaints.map((issue) => {
                const unit = customers.find((c) => c.id === issue.customerId)?.unit ?? '';
                return (
                  <li
                    key={issue.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    {/* No resident names: unit-level reference only. */}
                    <span>
                      {ISSUE_TYPE_LABEL[issue.type]} · {anonymousUnit(unit)}
                      <span className="text-ink-2 block text-xs">
                        {formatDateShort(issue.createdAt)}
                      </span>
                    </span>
                    <StatusChip tone={ISSUE_TONE[issue.status]}>
                      {ISSUE_STATUS_LABEL[issue.status]}
                    </StatusChip>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-start justify-between gap-3">
            <SectionTitle>Rules agreed with the compound</SectionTitle>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setRequestOpen(true)}
              className="no-print"
            >
              Request a change
            </Button>
          </div>
          <ul className="divide-border mt-1 divide-y">
            <Rule
              icon={Clock}
              label="Working hours"
              value={`${joinWeekdays(compound.serviceDays)}, ${SERVICE_WINDOW_LABEL}`}
            />
            <Rule
              icon={Droplets}
              label="Method"
              value="Water-free. Nothing runs onto the floor or into drains."
            />
            <Rule
              icon={MapPin}
              label="Where washers may work"
              value={compound.parkingZones.join(' · ')}
            />
            <Rule
              icon={CarFront}
              label="Cars"
              value="Subscribed residents’ cars only, in their own parking spots."
            />
            <Rule icon={UserRound} label="Compound contact" value={compound.managerName} />
          </ul>
        </Card>
      </div>

      <Card>
        <SectionTitle>Washer access log</SectionTitle>
        <p className="text-ink-2 text-sm">Entry and exit for the last 2 weeks.</p>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-border text-ink-2 border-b">
                <th scope="col" className="py-2 pr-3 font-medium">
                  Date
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Washer
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Entry
                </th>
                <th scope="col" className="py-2 pr-3 font-medium">
                  Exit
                </th>
                <th scope="col" className="py-2 text-right font-medium">
                  Cars washed
                </th>
              </tr>
            </thead>
            <tbody>
              {log.map((row) => (
                <tr
                  key={`${row.date}-${row.washerId}`}
                  className="border-border border-b last:border-0"
                >
                  <td className="py-2 pr-3">{formatDateShort(row.date)}</td>
                  <td className="py-2 pr-3">{row.washer.name}</td>
                  <td className="tabular py-2 pr-3">{formatTime(row.entry)}</td>
                  <td className="tabular py-2 pr-3">
                    {row.exit ? (
                      formatTime(row.exit)
                    ) : (
                      <StatusChip tone="info">On site now</StatusChip>
                    )}
                  </td>
                  <td className="tabular py-2 text-right">{row.cars}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {view.log.length === 0 && (
          <p className="text-ink-2 py-4 text-center">No visits in the last 2 weeks.</p>
        )}
        {view.log.length > 6 && (
          <Button
            variant="ghost"
            size="sm"
            className="no-print mt-1"
            onClick={() => setShowAllLog((v) => !v)}
          >
            {showAllLog ? 'Show fewer' : `Show all ${view.log.length} visits`}
          </Button>
        )}
      </Card>

      <p className="text-ink-2 flex items-center gap-1.5 text-sm">
        <Star className="size-4" aria-hidden />
        Resident names are never shown here. Report generated {formatDateLong(view.now)}.
      </p>

      <SideSheet
        open={requestOpen}
        onOpenChange={setRequestOpen}
        title="Request a change"
        description="Tell us what you would like to change: hours, zones, days, or anything else."
        footer={
          <Button block disabled={request.trim().length < 5} onClick={sendRequest}>
            Send request
          </Button>
        }
      >
        <TextAreaField
          label="Your request"
          value={request}
          onChange={setRequest}
          placeholder="For example: please finish by 1:00 PM on Saturdays."
        />
        <p className="text-ink-2 mt-2 text-sm">Demo: the request is not sent anywhere.</p>
      </SideSheet>
    </div>
  );
}
