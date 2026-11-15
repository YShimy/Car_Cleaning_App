import { toast } from '@/components/ui/toast';
import { useLongPress } from '@/lib/useLongPress';
import { useDemoStore } from '@/store/demoStore';
import { Logo } from './Logo';

/** The logo as used in app headers: long-press leaves presentation mode. */
export function BrandMark({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const handlers = useLongPress(() => {
    const { session, setPresentationMode } = useDemoStore.getState();
    if (session.presentationMode) {
      setPresentationMode(false);
      toast.show('Demo controls are back');
    }
  });
  return (
    <Logo
      size={size}
      {...handlers}
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none' }}
    />
  );
}
