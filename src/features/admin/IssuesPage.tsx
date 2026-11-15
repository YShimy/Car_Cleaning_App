import { Inbox } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { RadioCard, TextAreaField } from '@/components/ui/Field';
import { SideSheet } from '@/components/ui/Sheet';
import { StatusChip, type Tone } from '@/components/ui/StatusChip';
import { toast } from '@/components/ui/toast';
import { ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '@/config/copy';
import { formatDateNumeric, formatTime } from '@/lib/format';
import { useDemoStore } from '@/store/demoStore';
import type { Issue, IssueStatus, IssueType } from '@/types/domain';
import { AdminPage, FilterSelect, TextLink } from './shared';

const COLUMNS: IssueStatus[] = ['submitted', 'under_review', 'resolved'];
const TYPE_TONE: Record<IssueType, Tone> = {
  missed_wash: 'warning',
  quality: 'info',
  damage: 'danger',
  billing: 'primary',
  other: 'neutral',
};

function IssueSheet({ issue, onClose }: { issue: Issue; onClose: () => void }) {
  const customer = useDemoStore((s) => s.customers.find((c) => c.id === issue.customerId));
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === issue.compoundId));
  const wash = useDemoStore((s) => s.washes.find((w) => w.id === issue.washId));
  const washer = useDemoStore((s) => s.washers.find((w) => w.id === wash?.washerId));
  const [status, setStatus] = useState<IssueStatus>(issue.status);
  const [note, setNote] = useState(issue.resolutionNote ?? '');
  const needsNote = status === 'resolved' && !note.trim();

  const save = () => {
    useDemoStore.getState().updateIssue(issue.id, status, note.trim() || undefined);
    toast.success(
      'Issue updated',
      status !== issue.status ? 'The customer has been notified.' : undefined,
    );
    onClose();
  };

  return (
    <SideSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title={ISSUE_TYPE_LABEL[issue.type]}
      description={`Ref ${issue.id.toUpperCase()} · ${formatDateNumeric(issue.createdAt)}, ${formatTime(issue.createdAt)}`}
      footer={
        <Button block onClick={save} disabled={needsNote}>
          {needsNote ? 'Add a reply to resolve' : 'Save'}
        </Button>
      }
    >
      <div className="space-y-5">
        <p className="bg-bg rounded-card p-3">{issue.description}</p>
        <dl className="space-y-2 text-sm">
          {customer && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Customer</dt>
              <dd>
                <TextLink to={`/admin/customers/${customer.id}`}>{customer.name}</TextLink> ·{' '}
                {customer.unit}
              </dd>
            </div>
          )}
          <div className="flex justify-between gap-3">
            <dt className="text-ink-2">Compound</dt>
            <dd>{compound?.name}</dd>
          </div>
          {wash && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Wash</dt>
              <dd>
                {formatDateNumeric(wash.scheduledDate)}
                {washer && ` · ${washer.name}`}
              </dd>
            </div>
          )}
          {wash?.washerNote && (
            <div className="flex justify-between gap-3">
              <dt className="text-ink-2">Washer’s note</dt>
              <dd className="text-right">{wash.washerNote}</dd>
            </div>
          )}
        </dl>
        <fieldset className="space-y-2">
          <legend className="mb-2 font-semibold">Status</legend>
          {COLUMNS.map((s) => (
            <RadioCard
              key={s}
              name="issue-status"
              value={s}
              checked={status === s}
              onChange={(v) => setStatus(v as IssueStatus)}
              title={ISSUE_STATUS_LABEL[s]}
            />
          ))}
        </fieldset>
        <TextAreaField
          label="Reply to the customer"
          value={note}
          onChange={setNote}
          rows={3}
          placeholder="What we did about it. The customer sees this."
          hint="Shown to the customer in their app."
        />
      </div>
    </SideSheet>
  );
}

export function IssuesPage() {
  const issues = useDemoStore((s) => s.issues);
  const customers = useDemoStore((s) => s.customers);
  const compounds = useDemoStore((s) => s.compounds);
  const [type, setType] = useState('all');
  const [openId, setOpenId] = useState<string | null>(null);
  const filtered = issues
    .filter((i) => type === 'all' || i.type === type)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const open = issues.find((i) => i.id === openId);

  return (
    <AdminPage
      title="Issues"
      subtitle={`${issues.filter((i) => i.status !== 'resolved').length} open of ${issues.length}`}
      actions={
        <FilterSelect label="Type" value={type} onChange={setType}>
          <option value="all">All types</option>
          {(Object.keys(ISSUE_TYPE_LABEL) as IssueType[]).map((t) => (
            <option key={t} value={t}>
              {ISSUE_TYPE_LABEL[t]}
            </option>
          ))}
        </FilterSelect>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        {COLUMNS.map((status) => {
          const list = filtered.filter((i) => i.status === status);
          return (
            <section
              key={status}
              className="bg-border/40 rounded-card p-3"
              aria-label={ISSUE_STATUS_LABEL[status]}
            >
              <h2 className="mb-3 flex items-center justify-between font-semibold">
                {ISSUE_STATUS_LABEL[status]}
                <span className="bg-surface text-ink-2 tabular rounded-full px-2 py-0.5 text-xs">
                  {list.length}
                </span>
              </h2>
              {list.length === 0 ? (
                <EmptyState icon={Inbox} title="Nothing here." />
              ) : (
                <ul className="space-y-2">
                  {list.map((issue) => (
                    <li key={issue.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(issue.id)}
                        className="bg-surface shadow-card hover:border-primary w-full rounded-lg border border-transparent p-3 text-left text-sm"
                      >
                        <span className="flex items-center justify-between gap-2">
                          <StatusChip tone={TYPE_TONE[issue.type]}>
                            {ISSUE_TYPE_LABEL[issue.type]}
                          </StatusChip>
                          <span className="text-ink-2 text-xs">
                            {formatDateNumeric(issue.createdAt)}
                          </span>
                        </span>
                        <span className="mt-2 line-clamp-2 block">{issue.description}</span>
                        <span className="text-ink-2 mt-1 block text-xs">
                          {customers.find((c) => c.id === issue.customerId)?.name} ·{' '}
                          {compounds.find((c) => c.id === issue.compoundId)?.name}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
      {open && <IssueSheet key={open.id} issue={open} onClose={() => setOpenId(null)} />}
    </AdminPage>
  );
}
