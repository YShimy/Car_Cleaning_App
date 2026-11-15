import { ArrowLeft } from 'lucide-react';
import { useEffect, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { ProgressSteps } from '@/components/ui/ProgressSteps';
import { recordStep, recordTap } from '@/lib/sessionRecorder';
import { TOTAL_STEPS } from './draft';

/**
 * Shell for every onboarding screen: back arrow and progress on top,
 * one primary button pinned to the bottom.
 */
export function OnboardingFrame({
  stepId,
  stepNumber,
  title,
  subtitle,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  primaryLoading,
  backTo,
  footerNote,
}: {
  stepId: string;
  stepNumber: number;
  title: string;
  subtitle?: string;
  children: ReactNode;
  primaryLabel?: string;
  onPrimary?: () => void;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  backTo: string;
  footerNote?: ReactNode;
}) {
  const navigate = useNavigate();
  useEffect(() => recordStep(stepId), [stepId]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (primaryDisabled || primaryLoading || !onPrimary) return;
    recordTap('primary');
    onPrimary();
  };

  return (
    <form onSubmit={submit} className="flex h-full flex-col" noValidate>
      <header className="bg-surface border-border flex shrink-0 items-center gap-2 border-b px-2 py-2">
        <button
          type="button"
          aria-label="Back"
          onClick={() => {
            recordTap('back');
            navigate(backTo);
          }}
          className="hover:bg-bg grid size-12 shrink-0 place-items-center rounded-full"
        >
          <ArrowLeft className="size-5" aria-hidden />
        </button>
        <div className="flex-1 pr-4">
          <ProgressSteps current={stepNumber} total={TOTAL_STEPS} />
        </div>
      </header>
      <div className="flex-1 overflow-y-auto px-5 pt-5 pb-6">
        <h1 className="text-2xl">{title}</h1>
        {subtitle && <p className="text-ink-2 mt-1">{subtitle}</p>}
        <div className="mt-5 space-y-4">{children}</div>
      </div>
      {primaryLabel && (
        <footer className="bg-surface border-border shrink-0 space-y-2 border-t px-5 pt-3 pb-[max(12px,env(safe-area-inset-bottom))]">
          {footerNote}
          <Button type="submit" block disabled={primaryDisabled} loading={primaryLoading}>
            {primaryLabel}
          </Button>
        </footer>
      )}
    </form>
  );
}
