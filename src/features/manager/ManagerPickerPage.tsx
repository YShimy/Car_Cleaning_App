import { Building2, ChevronRight } from 'lucide-react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { joinWeekdays } from '@/lib/dates';
import { useDemoStore } from '@/store/demoStore';

export function ManagerPickerPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const compounds = useDemoStore((s) => s.compounds);
  const remembered = useDemoStore((s) => s.session.managerCompoundId);
  const changing = Boolean((location.state as { change?: boolean } | null)?.change);

  // The choice is remembered: go straight to the portal next time.
  if (remembered && !changing && compounds.some((c) => c.id === remembered)) {
    return <Navigate to={`/manager/${remembered}`} replace />;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-2xl">Choose your compound</h1>
        <p className="text-ink-2">You will see only this compound’s information.</p>
      </div>
      <ul className="space-y-2">
        {compounds
          .filter((c) => c.status !== 'onboarding')
          .map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className="w-full text-left"
                onClick={() => {
                  useDemoStore.getState().setManagerCompound(c.id);
                  navigate(`/manager/${c.id}`);
                }}
              >
                <Card className="hover:border-primary flex items-center gap-3 transition-colors">
                  <Building2 className="text-ink-2 size-5 shrink-0" aria-hidden />
                  <span className="flex-1">
                    <span className="block font-semibold">{c.name}</span>
                    <span className="text-ink-2 text-sm">
                      {c.area} · {joinWeekdays(c.serviceDays)}
                    </span>
                  </span>
                  <ChevronRight className="text-ink-2 size-5" aria-hidden />
                </Card>
              </button>
            </li>
          ))}
      </ul>
    </div>
  );
}
