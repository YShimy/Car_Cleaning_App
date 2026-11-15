import { Suspense } from 'react';
import { Link, Outlet, useParams } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { DemoBadge } from '@/components/ui/DemoBadge';
import { SkeletonList } from '@/components/ui/Skeleton';
import { useDemoStore } from '@/store/demoStore';

export default function ManagerLayout() {
  const { compoundId } = useParams();
  const compound = useDemoStore((s) => s.compounds.find((c) => c.id === compoundId));
  return (
    <div className="min-h-dvh">
      <header className="border-border bg-surface sticky top-0 z-30 border-b">
        <div className="mx-auto flex min-h-14 max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2">
          <div className="flex items-center gap-3">
            <BrandMark />
            <span className="text-ink-2 hidden text-sm sm:inline">Compound portal</span>
          </div>
          <div className="flex items-center gap-3">
            {compound && (
              <Link
                to="/manager"
                state={{ change: true }}
                className="text-primary no-print text-sm font-medium underline underline-offset-2"
              >
                Change compound
              </Link>
            )}
            <DemoBadge />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl p-4 md:p-6">
        <Suspense fallback={<SkeletonList rows={4} />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}
