import { createContext } from 'react';

/**
 * Where portalled overlays mount. Inside the phone frame this is the frame
 * element, so sheets stay within the "phone" on desktop.
 */
export const PortalContainerContext = createContext<HTMLElement | null>(null);
