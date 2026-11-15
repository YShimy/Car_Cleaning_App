import {
  Bell,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Gift,
  MapPin,
  MessageSquareText,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/lib/cn';
import { toISODate } from '@/lib/dates';
import { formatDateShort, formatTime } from '@/lib/format';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { Notification } from '@/types/domain';

const ICONS: Record<Notification['kind'], LucideIcon> = {
  reminder: CalendarClock,
  washer_on_site: MapPin,
  wash_done: CheckCircle2,
  payment: CreditCard,
  issue_update: MessageSquareText,
  promo: Gift,
};

function NotificationList({
  title,
  items,
  unreadIds,
}: {
  title: string;
  items: Notification[];
  unreadIds: Set<string>;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionTitle className="mb-2">{title}</SectionTitle>
      <ul className="space-y-2">
        {items.map((n) => {
          const Icon = ICONS[n.kind];
          const unread = unreadIds.has(n.id);
          const body = (
            <Card
              className={cn(
                'flex items-start gap-3',
                unread && 'border-primary/40 bg-primary-soft',
              )}
            >
              <span className="bg-surface border-border text-primary grid size-10 shrink-0 place-items-center rounded-full border">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-medium">
                  {n.title}
                  {unread && <span className="sr-only"> (new)</span>}
                </span>
                <span className="text-ink-2 block text-sm">{n.body}</span>
                <span className="text-ink-2 mt-1 block text-xs">
                  {title === 'Today'
                    ? formatTime(n.createdAt)
                    : `${formatDateShort(n.createdAt)} · ${formatTime(n.createdAt)}`}
                </span>
              </span>
              {unread && (
                <span className="bg-primary mt-1.5 size-2.5 shrink-0 rounded-full" aria-hidden />
              )}
            </Card>
          );
          return <li key={n.id}>{n.link ? <Link to={n.link}>{body}</Link> : body}</li>;
        })}
      </ul>
    </section>
  );
}

export function NotificationsPage() {
  const { customer } = useCustomer();
  const notifications = useDemoStore((s) => s.notifications);
  const mine = notifications.filter((n) => n.customerId === customer.id);
  // Remember what was unread when the screen opened, so it stays highlighted
  // for this visit even though it is marked as read straight away.
  const [unreadIds] = useState(() => new Set(mine.filter((n) => !n.read).map((n) => n.id)));

  useEffect(() => {
    useDemoStore.getState().markNotificationsRead(customer.id);
  }, [customer.id]);

  const today = toISODate(new Date());
  const isToday = (n: Notification) => toISODate(new Date(n.createdAt)) === today;
  const setPref = (key: 'whatsapp' | 'push', value: boolean) =>
    useDemoStore.getState().updateCustomer(customer.id, {
      notificationPrefs: { ...customer.notificationPrefs, [key]: value },
    });

  return (
    <div className="space-y-5">
      <PageHeader title="Notifications" />
      {mine.length === 0 ? (
        <Card>
          <EmptyState
            icon={Bell}
            title="No notifications yet. We will tell you before and after every wash."
          />
        </Card>
      ) : (
        <>
          <NotificationList title="Today" items={mine.filter(isToday)} unreadIds={unreadIds} />
          <NotificationList
            title="Earlier"
            items={mine.filter((n) => !isToday(n))}
            unreadIds={unreadIds}
          />
        </>
      )}
      <section>
        <SectionTitle className="mb-2">How we reach you</SectionTitle>
        <Card className="divide-border divide-y py-1">
          <Switch
            label="WhatsApp updates"
            hint="Reminder the day before, and photos when your car is done."
            checked={customer.notificationPrefs.whatsapp}
            onCheckedChange={(v) => setPref('whatsapp', v)}
          />
          <Switch
            label="App notifications"
            checked={customer.notificationPrefs.push}
            onCheckedChange={(v) => setPref('push', v)}
          />
        </Card>
      </section>
    </div>
  );
}
