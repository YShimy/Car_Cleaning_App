import { addDays } from 'date-fns';
import { CalendarCheck, CheckCircle2, CircleAlert, Clock, Inbox, Users } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Avatar } from '@/components/app/Avatar';
import { DayCapacityCard } from '@/components/app/DayCapacityCard';
import { Logo } from '@/components/app/Logo';
import { PlanCard } from '@/components/app/PlanCard';
import { Timeline } from '@/components/app/Timeline';
import { Accordion } from '@/components/ui/Accordion';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { EmptyState } from '@/components/ui/EmptyState';
import { RadioCard, SelectField, TextField } from '@/components/ui/Field';
import { KpiCard } from '@/components/ui/KpiCard';
import { PriceTag } from '@/components/ui/PriceTag';
import { ProgressBar, ProgressSteps } from '@/components/ui/ProgressSteps';
import { BottomSheet, SideSheet } from '@/components/ui/Sheet';
import { Skeleton, SkeletonList } from '@/components/ui/Skeleton';
import { StarRating } from '@/components/ui/StarRating';
import { StatusChip } from '@/components/ui/StatusChip';
import { Switch } from '@/components/ui/Switch';
import { SegmentedTabs } from '@/components/ui/Tabs';
import { toast } from '@/components/ui/toast';
import type { PlanId, Weekday } from '@/types/domain';
import { CarGallery } from './CarGallery';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="border-border border-b pb-2 text-xl">{title}</h2>
      {children}
    </section>
  );
}

const tableRows = Array.from({ length: 30 }, (_, i) => ({
  id: `r${i}`,
  name: ['Palm Grove', 'Cedar Heights', 'Lotus Gardens'][i % 3] + ` ${i + 1}`,
  subscribers: 20 + ((i * 7) % 31),
}));

export default function StyleguidePage() {
  const [plan, setPlan] = useState<PlanId>('plus');
  const [day, setDay] = useState<Weekday>('tue');
  const [stars, setStars] = useState(4);
  const [on, setOn] = useState(true);
  const [radio, setRadio] = useState('card');
  const [bottomOpen, setBottomOpen] = useState(false);
  const [sideOpen, setSideOpen] = useState(false);
  const today = new Date();

  return (
    <main className="mx-auto max-w-5xl space-y-10 p-4 md:p-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Logo size="lg" />
        <DemoBadge />
      </header>
      <h1 className="text-3xl">Styleguide</h1>

      <Section title="Buttons">
        <div className="flex flex-wrap gap-3">
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="destructive">Destructive</Button>
          <Button loading>Loading</Button>
          <Button disabled>Disabled</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large (washer)</Button>
        </div>
      </Section>

      <Section title="Status chips">
        <div className="flex flex-wrap gap-2">
          <StatusChip tone="success" icon={CheckCircle2}>
            Completed
          </StatusChip>
          <StatusChip tone="info" icon={Clock}>
            In progress
          </StatusChip>
          <StatusChip tone="warning" icon={CircleAlert}>
            Nearly full
          </StatusChip>
          <StatusChip tone="danger" icon={CircleAlert}>
            Overdue
          </StatusChip>
          <StatusChip tone="primary" icon={CalendarCheck}>
            Scheduled
          </StatusChip>
          <StatusChip>Neutral</StatusChip>
        </div>
      </Section>

      <Section title="Prices and KPIs">
        <div className="flex flex-wrap items-end gap-6">
          <PriceTag amount={650} period="month" size="sm" />
          <PriceTag amount={950} period="month" />
          <PriceTag amount={1360} strikeAmount={1600} period="month" size="lg" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <KpiCard label="Active subscribers" value="312" hint="Across 9 compounds" icon={Users} />
          <KpiCard label="Monthly recurring revenue" value="EGP 284,300" />
          <KpiCard label="Average rating" value="4.6" hint="Last 10 weeks" />
        </div>
      </Section>

      <Section title="Plan cards">
        <div className="grid gap-4 md:grid-cols-3">
          {(['essential', 'plus', 'premium'] as const).map((p) => (
            <PlanCard key={p} plan={p} selected={plan === p} onSelect={setPlan} />
          ))}
        </div>
      </Section>

      <Section title="Day capacity cards">
        <div className="grid gap-4 md:grid-cols-3">
          <DayCapacityCard
            day="tue"
            nextDate={addDays(today, 2)}
            spotsLeft={6}
            selected={day === 'tue'}
            onSelect={setDay}
          />
          <DayCapacityCard
            day="sat"
            nextDate={addDays(today, 6)}
            spotsLeft={2}
            selected={day === 'sat'}
            onSelect={setDay}
          />
          <DayCapacityCard
            day="sun"
            nextDate={addDays(today, 7)}
            spotsLeft={0}
            selected={false}
            onJoinWaitlist={() => toast.show('You are on the Sunday waitlist.')}
          />
        </div>
      </Section>

      <Section title="Progress, rating, timeline">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="space-y-4">
            <ProgressSteps current={3} total={7} />
            <ProgressBar value={8} max={14} label="Washes done" tone="success" />
            <ProgressBar value={26} max={28} label="Capacity used" tone="warning" />
          </Card>
          <Card className="space-y-3 text-center">
            <StarRating value={stars} onChange={setStars} />
            <StarRating value={4.6} size="sm" />
          </Card>
          <Card>
            <Timeline
              steps={[
                { title: 'Washer arrived at Palm Grove', detail: '9:05 AM', state: 'done' },
                { title: 'Washing your car now', state: 'current' },
                { title: 'Done — see photos', state: 'upcoming' },
              ]}
            />
          </Card>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid gap-4 md:grid-cols-2">
          <TextField label="Phone number" prefix="+20" defaultValue="10 0000 0123" />
          <TextField label="With error" defaultValue="" error="Enter your building number." />
          <TextField label="Read-only (demo card)" value="4242 4242 4242 4242" readOnly />
          <SelectField label="Parking zone" defaultValue="b1">
            <option value="b1">Basement B1</option>
            <option value="b2">Basement B2</option>
          </SelectField>
          <RadioCard
            name="sg-pay"
            value="card"
            checked={radio === 'card'}
            onChange={setRadio}
            title="Card"
          />
          <RadioCard
            name="sg-pay"
            value="cash"
            checked={radio === 'cash'}
            onChange={setRadio}
            title="Cash on first wash"
            description="Pay the washer in person."
          />
          <Switch
            checked={on}
            onCheckedChange={setOn}
            label="WhatsApp updates"
            hint="Recommended"
          />
        </div>
      </Section>

      <Section title="Tabs and accordion">
        <div className="grid gap-6 md:grid-cols-2">
          <SegmentedTabs
            label="Wash detail"
            tabs={[
              { value: 'photos', label: 'Photos', content: <p>Photos tab</p> },
              { value: 'checklist', label: 'Checklist', content: <p>Checklist tab</p> },
              { value: 'details', label: 'Details', content: <p>Details tab</p> },
            ]}
          />
          <Accordion
            items={[
              {
                id: 'a',
                title: 'What if it rains?',
                content: 'We move your wash to the next day.',
              },
              { id: 'b', title: 'How do I pause?', content: 'From the Schedule tab.' },
            ]}
          />
        </div>
      </Section>

      <Section title="Sheets and toasts">
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setBottomOpen(true)}>
            Open bottom sheet
          </Button>
          <Button variant="secondary" onClick={() => setSideOpen(true)}>
            Open side sheet
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.show('Saved', 'Your changes are saved.')}
          >
            Toast
          </Button>
          <Button variant="secondary" onClick={() => toast.success('Wash skipped')}>
            Success toast
          </Button>
          <Button variant="secondary" onClick={() => toast.error('That day is full.')}>
            Error toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => toast.whatsapp('Your car is clean', 'Tap to see the photos.')}
          >
            WhatsApp-style toast
          </Button>
        </div>
        <BottomSheet
          open={bottomOpen}
          onOpenChange={setBottomOpen}
          title="Skip this wash?"
          description="You can skip until 8:00 PM the day before."
          footer={
            <Button block onClick={() => setBottomOpen(false)}>
              Skip wash
            </Button>
          }
        >
          <p>Skipped washes are credited as one free tire shine.</p>
        </BottomSheet>
        <SideSheet open={sideOpen} onOpenChange={setSideOpen} title="Issue details">
          <p>Side sheet content.</p>
        </SideSheet>
      </Section>

      <Section title="Empty and loading states">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <EmptyState icon={Inbox} title="No notifications yet." />
          </Card>
          <div className="space-y-3">
            <SkeletonList rows={2} />
            <Skeleton className="h-6 w-1/2" />
          </div>
        </div>
      </Section>

      <Section title="Avatars">
        <div className="flex items-center gap-3">
          <Avatar initials="AM" size="sm" />
          <Avatar initials="AM" />
          <Avatar initials="AM" size="lg" />
        </div>
      </Section>

      <Section title="Data table (sortable, searchable, paginated)">
        <DataTable
          rows={tableRows}
          rowKey={(r) => r.id}
          searchText={(r) => r.name}
          pageSize={5}
          columns={[
            { key: 'name', header: 'Compound', cell: (r) => r.name, sortValue: (r) => r.name },
            {
              key: 'subs',
              header: 'Subscribers',
              cell: (r) => r.subscribers,
              sortValue: (r) => r.subscribers,
              align: 'right',
            },
          ]}
        />
      </Section>

      <Section title="Car illustrations and before/after slider">
        <CarGallery />
      </Section>
    </main>
  );
}
