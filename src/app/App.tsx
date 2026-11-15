import { HashRouter, Route, Routes } from 'react-router-dom';
import { BRAND } from '@/config/brand';

export function App() {
  return (
    <HashRouter>
      <Routes>
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
    </HashRouter>
  );
}
