import { Download, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { DataTable } from '@/components/ui/DataTable';
import { StatusChip } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { formatDateNumeric, formatTime } from '@/lib/format';
import { downloadTextFile } from '@/lib/ics';
import { clearSessions, loadSessions, type InterviewSession } from '@/lib/sessionRecorder';
import { AdminPage } from './shared';

const seconds = (ms: number) => `${Math.round(ms / 1000)} s`;
const duration = (ms: number) =>
  ms >= 60_000
    ? `${Math.floor(ms / 60_000)} min ${Math.round((ms % 60_000) / 1000)} s`
    : seconds(ms);

const slowestStep = (s: InterviewSession) => {
  const entries = Object.entries(s.stepMs).sort((a, b) => b[1] - a[1]);
  return entries[0] ? `Step ${entries[0][0]} (${seconds(entries[0][1])})` : '—';
};

export function InterviewsPage() {
  const [sessions, setSessions] = useState(loadSessions);

  return (
    <AdminPage
      title="Interview sessions"
      subtitle="Recorded on this device when “Start as a new customer” is used. Nothing is sent anywhere."
      actions={
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={sessions.length === 0}
            onClick={() =>
              downloadTextFile(
                'lamaa-interview-sessions.json',
                JSON.stringify(sessions, null, 2),
                'application/json',
              )
            }
          >
            <Download className="size-4" aria-hidden />
            Export JSON
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={sessions.length === 0}
            onClick={() => {
              if (
                !window.confirm(
                  'Delete all recorded interview sessions on this device? Export them first if you need them.',
                )
              )
                return;
              clearSessions();
              setSessions([]);
              toast.success('Interview sessions deleted');
            }}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete all
          </Button>
        </div>
      }
    >
      <DataTable
        rows={sessions}
        rowKey={(s) => s.id}
        emptyMessage="No sessions yet. Use “Start as a new customer” on the launcher to record one."
        columns={[
          {
            key: 'started',
            header: 'Started',
            cell: (s) => `${formatDateNumeric(s.startedAt)}, ${formatTime(s.startedAt)}`,
            sortValue: (s) => s.startedAt,
          },
          {
            key: 'outcome',
            header: 'Outcome',
            cell: (s) => (
              <StatusChip
                tone={
                  s.outcome === 'completed'
                    ? 'success'
                    : s.outcome === 'abandoned'
                      ? 'danger'
                      : 'neutral'
                }
              >
                {s.outcome === 'completed'
                  ? 'Subscribed'
                  : s.outcome === 'abandoned'
                    ? 'Abandoned'
                    : 'In progress'}
              </StatusChip>
            ),
            sortValue: (s) => s.outcome,
          },
          {
            key: 'total',
            header: 'Total time',
            cell: (s) => duration(s.totalMs),
            sortValue: (s) => s.totalMs,
            align: 'right',
          },
          { key: 'slowest', header: 'Slowest step', cell: slowestStep },
          {
            key: 'back',
            header: 'Back presses',
            cell: (s) => s.backPresses,
            sortValue: (s) => s.backPresses,
            align: 'right',
          },
          {
            key: 'plan',
            header: 'Plan',
            cell: (s) => s.plan ?? '—',
            sortValue: (s) => s.plan ?? '',
          },
          { key: 'day', header: 'Day', cell: (s) => s.washDay ?? '—' },
          {
            key: 'payment',
            header: 'Payment',
            cell: (s) => s.paymentMethod ?? '—',
            sortValue: (s) => s.paymentMethod ?? '',
          },
          { key: 'compound', header: 'Compound', cell: (s) => s.compound ?? '—' },
        ]}
      />
      <p className="text-ink-2 text-sm">
        Step numbers match the onboarding screens (1 = welcome, 2 = phone, 2b = code, … 7 = review
        and pay). The JSON export includes the time on every step and every tap.
      </p>
    </AdminPage>
  );
}
