import { CircleAlert, Clock, Sparkles, Star } from 'lucide-react';
import { Card, SectionTitle } from '@/components/ui/Card';
import { KpiCard } from '@/components/ui/KpiCard';
import { StarRating } from '@/components/ui/StarRating';
import { washerStats } from '@/lib/selectors';
import { useDemoStore } from '@/store/demoStore';

export function SummaryPage() {
  const washerId = useDemoStore((s) => s.session.washerId);
  const washes = useDemoStore((s) => s.washes);
  const issues = useDemoStore((s) => s.issues);
  const stats = washerStats({ washes, issues }, washerId, new Date());
  const weekAverage = stats.ratingsThisWeek.length
    ? stats.ratingsThisWeek.reduce((sum, r) => sum + r.stars, 0) / stats.ratingsThisWeek.length
    : null;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl">Summary</h1>
      <div className="grid grid-cols-2 gap-3">
        <KpiCard
          label="Done today"
          value={`${stats.doneToday} of ${stats.totalToday}`}
          icon={Sparkles}
        />
        <KpiCard label="Done this week" value={String(stats.washesThisWeek)} icon={Sparkles} />
        <KpiCard
          label="Average time per wash"
          value={stats.averageMinutes ? `${Math.round(stats.averageMinutes)} min` : '—'}
          icon={Clock}
        />
        <KpiCard
          label="Issues flagged this week"
          value={String(stats.issuesThisWeek + stats.flaggedToday)}
          icon={CircleAlert}
        />
      </div>
      <Card>
        <SectionTitle className="flex items-center gap-2">
          <Star className="size-5" aria-hidden />
          Ratings this week
        </SectionTitle>
        {weekAverage === null ? (
          <p className="text-ink-2 mt-2">
            No ratings yet this week. Customers rate after they see the photos.
          </p>
        ) : (
          <>
            <p className="mt-2 flex items-center gap-3">
              <span className="tabular text-3xl font-semibold">{weekAverage.toFixed(1)}</span>
              <StarRating value={weekAverage} size="sm" label="Average this week" />
              <span className="text-ink-2 text-sm">
                {stats.ratingsThisWeek.length} rating{stats.ratingsThisWeek.length > 1 ? 's' : ''}
              </span>
            </p>
            <ul className="mt-3 flex flex-wrap gap-2">
              {Object.entries(
                stats.ratingsThisWeek
                  .flatMap((r) => r.tags)
                  .reduce<Record<string, number>>(
                    (acc, tag) => ({ ...acc, [tag]: (acc[tag] ?? 0) + 1 }),
                    {},
                  ),
              ).map(([tag, count]) => (
                <li key={tag} className="border-border bg-bg rounded-full border px-3 py-1 text-sm">
                  {tag} · {count}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}
