import { CheckCircle2, CircleAlert, Info, MessageCircle, X } from 'lucide-react';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/cn';
import { useToastStore, type ToastItem } from './toast';

const icons = {
  default: Info,
  success: CheckCircle2,
  error: CircleAlert,
  whatsapp: MessageCircle,
} as const;

function ToastCard({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const Icon = icons[item.variant];
  const isWa = item.variant === 'whatsapp';
  return (
    <div
      className={cn(
        'animate-toast-in rounded-card bg-surface shadow-frame pointer-events-auto flex w-full items-start gap-3 border p-3',
        isWa ? 'border-whatsapp/40 border-l-whatsapp border-l-4' : 'border-border',
      )}
    >
      <span
        className={cn(
          'mt-0.5 grid size-8 shrink-0 place-items-center rounded-full',
          item.variant === 'default' && 'bg-primary-soft text-primary',
          item.variant === 'success' && 'bg-success-soft text-success',
          item.variant === 'error' && 'bg-danger-soft text-danger',
          isWa && 'bg-whatsapp text-white',
        )}
      >
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        {isWa && (
          <p className="text-whatsapp text-xs font-semibold">
            WhatsApp · now <span className="text-ink-2 font-normal">· {BRAND.name}</span>
          </p>
        )}
        <p className="text-sm font-semibold">{item.title}</p>
        {item.body && <p className="text-ink-2 text-sm">{item.body}</p>}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="text-ink-2 hover:bg-bg -m-1 grid size-8 shrink-0 place-items-center rounded-full"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  return (
    <div
      aria-live="polite"
      role="status"
      className="no-print pointer-events-none fixed inset-x-0 top-3 z-[60] mx-auto flex w-full max-w-[366px] flex-col gap-2 px-3"
    >
      {toasts.map((t) => (
        <ToastCard key={t.id} item={t} onDismiss={() => dismiss(t.id)} />
      ))}
    </div>
  );
}
