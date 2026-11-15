import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

/** Title row with a back arrow, for screens below a tab. */
export function PageHeader({
  title,
  backTo,
  action,
}: {
  title: string;
  backTo?: string;
  action?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mb-4 flex items-center gap-1">
      <button
        type="button"
        onClick={() => (backTo ? navigate(backTo) : navigate(-1))}
        aria-label="Back"
        className="hover:bg-border/60 -ml-3 grid size-12 shrink-0 place-items-center rounded-full"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </button>
      <h1 className="flex-1 text-2xl">{title}</h1>
      {action}
    </div>
  );
}
