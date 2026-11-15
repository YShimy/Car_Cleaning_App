import { useMemo } from 'react';
import type { Car, Compound, Customer, Subscription } from '@/types/domain';
import { useDemoStore } from './demoStore';

export interface CustomerContext {
  customer: Customer;
  compound: Compound;
  cars: Car[];
  /** Subscriptions that are not cancelled, oldest first. */
  subscriptions: Subscription[];
  /** The first car's subscription; drives the plan summary. */
  primary: Subscription | undefined;
}

/** The logged-in customer persona and everything that belongs to them. */
export function useCustomerContext(): CustomerContext | null {
  const customerId = useDemoStore((s) => s.session.customerId);
  const customers = useDemoStore((s) => s.customers);
  const compounds = useDemoStore((s) => s.compounds);
  const cars = useDemoStore((s) => s.cars);
  const subscriptions = useDemoStore((s) => s.subscriptions);
  return useMemo(() => {
    const customer = customers.find((c) => c.id === customerId);
    if (!customer) return null;
    const subs = subscriptions.filter(
      (s) => s.customerId === customer.id && s.status !== 'cancelled',
    );
    return {
      customer,
      compound: compounds.find((c) => c.id === customer.compoundId)!,
      cars: cars.filter((c) => c.customerId === customer.id),
      subscriptions: subs,
      primary: subs[0],
    };
  }, [customerId, customers, compounds, cars, subscriptions]);
}

/** Like useCustomerContext, for screens rendered only when a customer is logged in. */
export function useCustomer(): CustomerContext {
  const ctx = useCustomerContext();
  if (!ctx) throw new Error('No customer is logged in');
  return ctx;
}
