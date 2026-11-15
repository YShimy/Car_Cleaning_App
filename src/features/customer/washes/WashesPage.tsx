import { ChevronRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { WashStatusChip } from '@/components/app/WashStatusChip';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonList } from '@/components/ui/Skeleton';
import { StarRating } from '@/components/ui/StarRating';
import { WASH_TYPE_LABEL } from '@/config/copy';
import { carLabel } from '@/data/cars';
import { formatDateShort } from '@/lib/format';
import { pastWashes } from '@/lib/selectors';
import { useInitialLoading } from '@/lib/useInitialLoading';
import { useDemoStore } from '@/store/demoStore';
import { useCustomer } from '@/store/hooks';
import { WashThumb } from '../shared/WashThumb';

export function WashesPage() {
  const { customer, cars } = useCustomer();
  const washes = useDemoStore((s) => s.washes);
  const loading = useInitialLoading('customer-washes');
  const history = pastWashes(washes, customer.id);

  return (
    <div>
      <h1 className="mb-4 text-2xl">Wash history</h1>
      {loading ? (
        <SkeletonList rows={4} />
      ) : history.length === 0 ? (
        <Card>
          <EmptyState
            icon={Sparkles}
            title="Your washes and photos will appear here after your first wash."
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {history.map((wash) => {
            const car = cars.find((c) => c.id === wash.carId);
            return (
              <li key={wash.id}>
                <Link to={`/customer/washes/${wash.id}`}>
                  <Card className="flex items-center gap-3">
                    {wash.status === 'completed' && car && (
                      <WashThumb
                        car={car}
                        beforeSeed={wash.beforePhotoSeed}
                        afterSeed={wash.afterPhotoSeed}
                        className="h-14 w-24 shrink-0"
                      />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{formatDateShort(wash.scheduledDate)}</p>
                      <p className="text-ink-2 truncate text-sm">
                        {WASH_TYPE_LABEL[wash.type]}
                        {cars.length > 1 && car ? ` · ${carLabel(car)}` : ''}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <WashStatusChip status={wash.status} />
                        {wash.rating && (
                          <StarRating value={wash.rating.stars} size="sm" label="Your rating" />
                        )}
                      </div>
                    </div>
                    <ChevronRight className="text-ink-2 size-5 shrink-0" aria-hidden />
                  </Card>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
