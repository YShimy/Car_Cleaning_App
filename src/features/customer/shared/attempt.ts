import { toast } from '@/components/ui/toast';
import { RuleError } from '@/store/reducers';

/** Runs a store action and shows a business-rule violation as a plain-language toast. */
export function attempt(action: () => void): boolean {
  try {
    action();
    return true;
  } catch (error) {
    if (!(error instanceof RuleError)) throw error;
    toast.error(error.message);
    return false;
  }
}
