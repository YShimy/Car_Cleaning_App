import { Bot } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader } from '@/components/app/PageHeader';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';
import { firstName } from '@/lib/format';
import { useCustomer } from '@/store/hooks';

interface Message {
  from: 'bot' | 'me';
  text: string;
  link?: { to: string; label: string };
}

/** Fixed script: this is a demo of the support entry point, not an AI. */
const SCRIPT: { chip: string; reply: Omit<Message, 'from'> }[] = [
  {
    chip: 'Reschedule',
    reply: {
      text: 'You can skip a wash, pause, or change your wash day yourself. It takes a few seconds.',
      link: { to: '/customer/schedule', label: 'Open Schedule' },
    },
  },
  {
    chip: 'Billing',
    reply: {
      text: 'Your plan, payment method and payment history are in your account.',
      link: { to: '/customer/account', label: 'Open Account' },
    },
  },
  {
    chip: 'Report a problem',
    reply: {
      text: 'Sorry about that. Tell us what happened and we will look at your wash photos. We reply within 24 hours.',
      link: { to: '/customer/support/report', label: 'Report a problem' },
    },
  },
  {
    chip: 'Talk to a person',
    reply: { text: 'We’ll reply on WhatsApp within 30 minutes (8 AM–8 PM).' },
  },
];

export function ChatScreen() {
  const { customer } = useCustomer();
  const [messages, setMessages] = useState<Message[]>([
    { from: 'bot', text: `Hello ${firstName(customer.name)}. How can we help?` },
  ]);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const ask = (index: number) => {
    const item = SCRIPT[index];
    setMessages((m) => [...m, { from: 'me', text: item.chip }, { from: 'bot', ...item.reply }]);
  };

  return (
    <div className="flex min-h-full flex-col">
      <PageHeader title="Chat with us" backTo="/customer/support" />
      <p className="text-ink-2 -mt-2 mb-4 flex items-center gap-2 text-sm">
        <Bot className="size-4" aria-hidden />
        {BRAND.name} assistant · scripted demo answers
      </p>
      <ol className="flex-1 space-y-3" aria-live="polite" aria-label="Conversation">
        {messages.map((m, i) => (
          <li key={i} className={cn('flex', m.from === 'me' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[85%] rounded-2xl px-4 py-2.5',
                m.from === 'me'
                  ? 'bg-primary rounded-br-md text-white'
                  : 'bg-surface border-border rounded-bl-md border',
              )}
            >
              <span className="sr-only">{m.from === 'me' ? 'You: ' : 'Assistant: '}</span>
              {m.text}
              {m.link && (
                <Link
                  to={m.link.to}
                  className="text-primary mt-2 block font-semibold underline underline-offset-2"
                >
                  {m.link.label}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
      <div ref={end} />
      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Quick replies">
        {SCRIPT.map((item, i) => (
          <button
            key={item.chip}
            type="button"
            onClick={() => ask(i)}
            className="border-primary text-primary bg-surface hover:bg-primary-soft min-h-11 rounded-full border px-4 text-sm font-medium"
          >
            {item.chip}
          </button>
        ))}
      </div>
    </div>
  );
}
