import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useContext, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { PortalContainerContext } from './portal';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
}

function SheetShell({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClass,
}: SheetProps & { contentClass: string }) {
  const container = useContext(PortalContainerContext);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container ?? undefined}>
        <Dialog.Overlay className="animate-fade-in fixed inset-0 z-40 bg-black/40" />
        <Dialog.Content
          className={cn('bg-surface fixed z-50 flex flex-col outline-none', contentClass)}
        >
          <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-2">
            <div>
              <Dialog.Title className="text-xl font-semibold">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-ink-2 mt-1 text-sm">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            <Dialog.Close
              className="text-ink-2 hover:bg-bg -mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full"
              aria-label="Close"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-5 py-3">{children}</div>
          {footer && <div className="border-border space-y-2 border-t px-5 py-4">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Slides up from the bottom. Used in the phone views. */
export function BottomSheet(props: SheetProps) {
  return (
    <SheetShell
      {...props}
      contentClass="animate-slide-up inset-x-0 bottom-0 max-h-[88%] rounded-t-2xl"
    />
  );
}

/** Slides in from the right. Used in the desktop views. */
export function SideSheet(props: SheetProps) {
  return (
    <SheetShell
      {...props}
      contentClass="animate-slide-in-right inset-y-0 right-0 w-full max-w-md shadow-frame"
    />
  );
}
