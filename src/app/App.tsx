import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Toaster } from '@/components/ui/Toaster';
import { BRAND } from '@/config/brand';

const StyleguidePage = lazy(() => import('@/features/styleguide/StyleguidePage'));

export function App() {
  return (
    <HashRouter>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/styleguide" element={<StyleguidePage />} />
          <Route
            path="*"
            element={
              <main className="grid min-h-dvh place-items-center p-6 text-center">
                <div>
                  <h1 className="text-3xl">{BRAND.name}</h1>
                  <p className="text-ink-2 mt-2">{BRAND.tagline}</p>
                </div>
              </main>
            }
          />
        </Routes>
      </Suspense>
      <Toaster />
    </HashRouter>
  );
}
