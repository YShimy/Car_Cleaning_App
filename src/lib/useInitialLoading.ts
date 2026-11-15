import { useEffect, useState } from 'react';

const seen = new Set<string>();

/**
 * True for a moment the first time a screen is opened, so skeletons can
 * show briefly and the demo feels like a real app. Never again for that
 * screen in this page load — taps are always instant.
 */
export function useInitialLoading(screen: string, ms = 350): boolean {
  const [loading, setLoading] = useState(() => !seen.has(screen));
  useEffect(() => {
    if (!loading) return;
    seen.add(screen);
    const timer = setTimeout(() => setLoading(false), ms);
    return () => clearTimeout(timer);
  }, [loading, screen, ms]);
  return loading;
}
