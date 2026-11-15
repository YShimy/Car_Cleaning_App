import {
  Building2,
  ChevronRight,
  HardHat,
  LayoutDashboard,
  RotateCcw,
  Smartphone,
  UserPlus,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/toast';
import { BRAND } from '@/config/brand';
import { NOUR_ID } from '@/data/generate';
import { startInterviewSession } from '@/lib/sessionRecorder';
import { useDemoStore } from '@/store/demoStore';
import type { Role } from '@/types/domain';

const VIEWS: { role: Role; to: string; title: string; text: string; icon: typeof Smartphone }[] = [
  {
    role: 'customer',
    to: '/customer/home',
    title: 'Customer app',
    text: 'For residents: see your next wash, photos and plan.',
    icon: Smartphone,
  },
  {
    role: 'washer',
    to: '/washer/today',
    title: 'Washer app',
    text: 'For washers: today’s route, step by step.',
    icon: HardHat,
  },
  {
    role: 'admin',
    to: '/admin',
    title: 'Operations dashboard',
    text: 'For the operations team: all compounds at a glance.',
    icon: LayoutDashboard,
  },
  {
    role: 'manager',
    to: '/manager',
    title: 'Compound manager portal',
    text: 'For compound management: who enters, when, and how residents rate it.',
    icon: Building2,
  },
];

export function LauncherPage() {
  const navigate = useNavigate();
  const presentationMode = useDemoStore((s) => s.session.presentationMode);
  const { setRole, setPersona, setInterviewMode, resetDemo } = useDemoStore.getState();

  const open = (role: Role) => {
    setInterviewMode(false);
    if (role === 'customer') setPersona(NOUR_ID);
    else setRole(role);
  };

  const startInterview = () => {
    setPersona(null);
    setInterviewMode(true);
    startInterviewSession();
    navigate('/customer/welcome');
  };

  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 py-10 md:py-16">
      <BrandMark size="lg" />
      <h1 className="mt-6 max-w-xl text-3xl leading-tight">{BRAND.tagline}</h1>
      <p className="text-ink-2 mt-2">Choose a view to explore.</p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {VIEWS.map(({ role, to, title, text, icon: Icon }) => (
          <Link
            key={role}
            to={to}
            onClick={() => open(role)}
            className="rounded-card border-border bg-surface shadow-card hover:border-primary group flex items-start gap-3 border p-4 transition-colors"
          >
            <span className="bg-primary-soft text-primary grid size-11 shrink-0 place-items-center rounded-xl">
              <Icon className="size-6" aria-hidden />
            </span>
            <span className="flex-1">
              <span className="block text-lg font-semibold">{title}</span>
              <span className="text-ink-2 block text-sm">{text}</span>
            </span>
            <ChevronRight
              className="text-ink-2 group-hover:text-primary mt-1 size-5 shrink-0"
              aria-hidden
            />
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={startInterview}>
          <UserPlus className="size-5" aria-hidden />
          Start as a new customer
        </Button>
        {!presentationMode && (
          <Button
            variant="secondary"
            onClick={() => {
              resetDemo();
              toast.success('Demo data reset');
            }}
          >
            <RotateCcw className="size-5" aria-hidden />
            Reset demo data
          </Button>
        )}
      </div>

      <p className="text-ink-2 mt-auto pt-10 text-sm">Interactive demo with fictional data.</p>
    </main>
  );
}
