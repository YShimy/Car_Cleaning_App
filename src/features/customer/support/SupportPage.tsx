import { ChevronRight, Flag, Inbox, MessageCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { Accordion } from '@/components/ui/Accordion';
import { Card, SectionTitle } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StatusChip, type Tone } from '@/components/ui/StatusChip';
import { ISSUE_STATUS_LABEL, ISSUE_TYPE_LABEL } from '@/config/copy';
import { formatDateShort } from '@/lib/format';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import type { IssueStatus } from '@/types/domain';
import { ChatScreen } from './ChatScreen';
import { FAQ } from './faq';

// eslint-disable-next-line react-refresh/only-export-components
export const ISSUE_TONE: Record<IssueStatus, Tone> = {
  submitted: 'neutral',
  under_review: 'info',
  resolved: 'success',
};

function ActionRow({
  to,
  icon: Icon,
  title,
  text,
}: {
  to: string;
  icon: LucideIcon;
  title: string;
  text: string;
}) {
  return (
    <Link to={to}>
      <Card className="hover:border-primary flex items-center gap-3 transition-colors">
        <span className="bg-primary-soft text-primary grid size-11 shrink-0 place-items-center rounded-xl">
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="flex-1">
          <span className="block font-semibold">{title}</span>
          <span className="text-ink-2 block text-sm">{text}</span>
        </span>
        <ChevronRight className="text-ink-2 size-5" aria-hidden />
      </Card>
    </Link>
  );
}

export function SupportPage() {
  const { customer } = useCustomer();
  const [params] = useSearchParams();
  const issues = useDemoStore((s) => s.issues);
  const mine = issues.filter((i) => i.customerId === customer.id);

  if (params.get('view') === 'chat') return <ChatScreen />;

  return (
    <div className="space-y-5">
      <PageHeader title="Help" />
      <div className="space-y-3">
        <ActionRow
          to="/customer/support?view=chat"
          icon={MessageCircle}
          title="Chat with us"
          text="Quick answers, or talk to a person."
        />
        <ActionRow
          to="/customer/support/report"
          icon={Flag}
          title="Report a problem"
          text="Missed wash, quality, damage or billing."
        />
      </div>

      <section>
        <SectionTitle className="mb-1">Common questions</SectionTitle>
        <Card className="py-1">
          <Accordion items={FAQ} />
        </Card>
      </section>

      <section>
        <SectionTitle className="mb-2">Your reports</SectionTitle>
        {mine.length === 0 ? (
          <Card>
            <EmptyState icon={Inbox} title="You have not reported any problems." />
          </Card>
        ) : (
          <ul className="space-y-2">
            {mine.map((issue) => (
              <li key={issue.id}>
                <Card>
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium">{ISSUE_TYPE_LABEL[issue.type]}</p>
                    <StatusChip tone={ISSUE_TONE[issue.status]}>
                      {ISSUE_STATUS_LABEL[issue.status]}
                    </StatusChip>
                  </div>
                  <p className="text-ink-2 mt-1 text-sm">{issue.description}</p>
                  {issue.resolutionNote && (
                    <p className="bg-success-soft mt-2 rounded-lg px-3 py-2 text-sm">
                      <span className="font-medium">Our reply:</span> {issue.resolutionNote}
                    </p>
                  )}
                  <p className="text-ink-2 mt-2 text-xs">
                    {formatDateShort(issue.createdAt)} · Ref {issue.id.toUpperCase()}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
