import { Camera, CarFront, ShieldCheck } from 'lucide-react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BrandMark } from '@/components/app/BrandMark';
import { Button } from '@/components/ui/Button';
import { BRAND } from '@/config/brand';
import { NOUR_ID } from '@/data/generate';
import { endInterviewSession, recordStep, recordTap } from '@/lib/sessionRecorder';
import { useDemoStore } from '@/store/demoStore';
import { useOnboardingDraft } from './draft';

const BENEFITS = [
  {
    icon: CarFront,
    title: 'No queues, no driving',
    text: 'We come to your parking spot on your compound’s wash day.',
  },
  { icon: Camera, title: 'Photos after every wash', text: 'See before and after, every time.' },
  {
    icon: ShieldCheck,
    title: 'Vetted washers approved by your compound',
    text: 'ID-verified, and known to compound security.',
  },
];

export function WelcomePage() {
  const navigate = useNavigate();
  const interviewMode = useDemoStore((s) => s.session.interviewMode);
  useEffect(() => recordStep('1'), []);

  const start = () => {
    recordTap('primary');
    useOnboardingDraft.getState().reset();
    navigate('/customer/onboarding/2');
  };

  const existingAccount = () => {
    endInterviewSession('abandoned');
    const { setPersona, setInterviewMode } = useDemoStore.getState();
    setInterviewMode(false);
    setPersona(NOUR_ID);
    navigate('/customer/home');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-5 pt-10 pb-6">
        <BrandMark size="lg" />
        <h1 className="mt-8 text-3xl leading-tight">{BRAND.tagline}</h1>
        <ul className="mt-8 space-y-5">
          {BENEFITS.map(({ icon: Icon, title, text }) => (
            <li key={title} className="flex gap-3">
              <span className="bg-primary-soft text-primary grid size-11 shrink-0 place-items-center rounded-xl">
                <Icon className="size-6" aria-hidden />
              </span>
              <span>
                <span className="block font-semibold">{title}</span>
                <span className="text-ink-2 block text-sm">{text}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <footer className="space-y-2 px-5 pt-3 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Button block onClick={start}>
          Get started
        </Button>
        <button
          type="button"
          onClick={existingAccount}
          className="text-primary min-h-12 w-full text-center font-medium underline underline-offset-2"
        >
          I already have an account
        </button>
        {interviewMode && (
          <p className="text-ink-2 text-center text-xs">
            This demo records only which screens you used, on this device.
          </p>
        )}
      </footer>
    </div>
  );
}
