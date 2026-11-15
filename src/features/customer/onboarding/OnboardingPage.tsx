import type { ComponentType } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useCustomerContext } from '@/store/hooks';
import { firstIncompleteStep, STEP_ORDER, useOnboardingDraft, type StepId } from './draft';
import { DoneStep } from './StepDone';
import { ReviewStep } from './StepReview';
import { CompoundStep, OtpStep, PhoneStep, UnitStep } from './StepsAccount';
import { CarStep, ParkingStep } from './StepsCar';
import { DayStep, PlanStep } from './StepsPlan';

const STEPS: Record<StepId, ComponentType> = {
  '2': PhoneStep,
  '2b': OtpStep,
  '3': CompoundStep,
  '3b': UnitStep,
  '4': CarStep,
  '4b': ParkingStep,
  '5': PlanStep,
  '6': DayStep,
  '7': ReviewStep,
};

export function OnboardingPage() {
  const { step } = useParams();
  const draft = useOnboardingDraft((s) => s.draft);
  const customer = useCustomerContext();

  if (step === 'done') {
    return customer ? <DoneStep /> : <Navigate to="/customer/welcome" replace />;
  }
  const index = STEP_ORDER.indexOf(step as StepId);
  if (index === -1) return <Navigate to="/customer/welcome" replace />;

  // Do not allow skipping ahead of an unanswered screen (deep link or reload).
  const blocker = firstIncompleteStep(draft);
  const blockerIndex = blocker ? STEP_ORDER.indexOf(blocker) : STEP_ORDER.length;
  // "2b" (the code) is reachable as soon as a phone number is entered.
  const allowed = blocker === '2' ? 1 : blockerIndex;
  if (index > allowed) return <Navigate to={`/customer/onboarding/${blocker}`} replace />;

  const Step = STEPS[step as StepId];
  return <Step />;
}
