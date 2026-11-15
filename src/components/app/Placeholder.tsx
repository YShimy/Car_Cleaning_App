import { Construction } from 'lucide-react';
import { EmptyState } from '../ui/EmptyState';

export function Placeholder({ title }: { title: string }) {
  return (
    <div>
      <h1 className="text-2xl">{title}</h1>
      <EmptyState icon={Construction} title="This screen is being built." />
    </div>
  );
}
