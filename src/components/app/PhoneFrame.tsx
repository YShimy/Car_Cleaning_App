import { useState, type ReactNode } from 'react';
import { PortalContainerContext } from '../ui/portal';

/**
 * On screens wider than 600px the phone views render inside a 390 × 844
 * frame; on real phones they fill the screen.
 *
 * The frame has a CSS transform so `position: fixed` descendants (sheets,
 * overlays) are positioned relative to it rather than the browser window.
 */
export function PhoneFrame({ children }: { children: ReactNode }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  return (
    <div className="min-[600px]:bg-[#e6e9ef] min-[600px]:grid min-[600px]:min-h-dvh min-[600px]:place-items-center min-[600px]:p-6">
      <div
        ref={setFrame}
        style={{ transform: 'translateZ(0)' }}
        className="bg-bg relative h-dvh w-full overflow-hidden min-[600px]:h-[844px] min-[600px]:max-h-[calc(100dvh-48px)] min-[600px]:w-[390px] min-[600px]:rounded-[40px] min-[600px]:shadow-frame min-[600px]:ring-[10px] min-[600px]:ring-[#1b2330]"
      >
        <PortalContainerContext.Provider value={frame}>
          <div className="flex h-full flex-col">{children}</div>
        </PortalContainerContext.Provider>
      </div>
    </div>
  );
}
