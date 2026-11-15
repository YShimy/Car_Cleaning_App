import { Button } from '@/components/ui/Button';
import { BottomSheet } from '@/components/ui/Sheet';
import { toast } from '@/components/ui/toast';
import { ADD_ONS, SKIP_CREDIT_ADD_ON } from '@/config/business';
import { formatDateLong, formatDateShort, formatTime } from '@/lib/format';
import { canSkip, skipDeadline } from '@/lib/rules';
import { useDemoStore } from '@/store/demoStore';
import type { Wash } from '@/types/domain';

/** Confirmation for skipping one wash; explains the rule and respects the cutoff. */
export function SkipSheet({ wash, onClose }: { wash: Wash | null; onClose: () => void }) {
  if (!wash) return null;
  const check = canSkip(wash, new Date());
  const deadline = skipDeadline(wash.scheduledDate);
  const credit = ADD_ONS[SKIP_CREDIT_ADD_ON].name.toLowerCase();

  const skip = () => {
    useDemoStore.getState().skipWash(wash.id);
    toast.success('Wash skipped', `You have a free ${credit} to use on any wash.`);
    onClose();
  };

  return (
    <BottomSheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Skip this wash?"
      description={formatDateLong(wash.scheduledDate)}
      footer={
        check.allowed ? (
          <>
            <Button block onClick={skip}>
              Skip this wash
            </Button>
            <Button block variant="ghost" onClick={onClose}>
              Keep it
            </Button>
          </>
        ) : (
          <Button block variant="secondary" onClick={onClose}>
            OK
          </Button>
        )
      }
    >
      {check.allowed ? (
        <p>
          Skipped washes are not refunded. Instead you get one free {credit} to add to any other
          wash. You can skip until {formatTime(deadline)} on {formatDateShort(deadline)}.
        </p>
      ) : (
        <p role="alert">
          {check.reason === 'past_cutoff'
            ? `Washes can be skipped until ${formatTime(deadline)} the day before. That time has passed, so the washer’s route is already set.`
            : 'This wash has already started, so it can no longer be skipped.'}
        </p>
      )}
    </BottomSheet>
  );
}
