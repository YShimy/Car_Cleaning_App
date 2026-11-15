import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataTable } from '@/components/ui/DataTable';
import { PLAN_ORDER, PLANS } from '@/config/business';
import { formatDateNumeric, formatEGP } from '@/lib/format';
import { SUB_STATUS } from '@/config/status';
import { useDemoStore } from '@/store/demoStore';
import type { SubscriptionStatus } from '@/types/domain';
import { AdminPage, Chip, FilterSelect } from './shared';

export function CustomersPage() {
  const navigate = useNavigate();
  const customers = useDemoStore((s) => s.customers);
  const subscriptions = useDemoStore((s) => s.subscriptions);
  const compounds = useDemoStore((s) => s.compounds);
  const [compoundId, setCompoundId] = useState('all');
  const [plan, setPlan] = useState('all');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const subsByCustomer = new Map<string, typeof subscriptions>();
    for (const s of subscriptions)
      subsByCustomer.set(s.customerId, [...(subsByCustomer.get(s.customerId) ?? []), s]);
    return customers
      .map((customer) => {
        const subs = subsByCustomer.get(customer.id) ?? [];
        // Show the most relevant subscription: a live one if there is one.
        const main = subs.find((s) => s.status === 'active') ?? subs[0];
        return {
          customer,
          main,
          cars: subs.length,
          monthly: subs
            .filter((s) => s.status === 'active')
            .reduce((sum, s) => sum + s.monthlyPrice, 0),
          compound: compounds.find((c) => c.id === customer.compoundId)!,
        };
      })
      .filter(
        (r) =>
          (compoundId === 'all' || r.customer.compoundId === compoundId) &&
          (plan === 'all' || r.main?.plan === plan) &&
          (status === 'all' || r.main?.status === status),
      );
  }, [customers, subscriptions, compounds, compoundId, plan, status]);

  return (
    <AdminPage title="Customers" subtitle={`${rows.length} of ${customers.length} customers`}>
      <DataTable
        rows={rows}
        rowKey={(r) => r.customer.id}
        searchText={(r) => `${r.customer.name} ${r.customer.unit} ${r.customer.phone}`}
        searchPlaceholder="Search name, home or phone"
        onRowClick={(r) => navigate(`/admin/customers/${r.customer.id}`)}
        initialSort={{ key: 'joined', dir: 'desc' }}
        filters={
          <>
            <FilterSelect label="Compound" value={compoundId} onChange={setCompoundId}>
              <option value="all">All compounds</option>
              {compounds.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Plan" value={plan} onChange={setPlan}>
              <option value="all">All plans</option>
              {PLAN_ORDER.map((p) => (
                <option key={p} value={p}>
                  {PLANS[p].name}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="all">All statuses</option>
              {(Object.keys(SUB_STATUS) as SubscriptionStatus[]).map((s) => (
                <option key={s} value={s}>
                  {SUB_STATUS[s].label}
                </option>
              ))}
            </FilterSelect>
          </>
        }
        columns={[
          {
            key: 'name',
            header: 'Customer',
            cell: (r) => <span className="font-medium">{r.customer.name}</span>,
            sortValue: (r) => r.customer.name,
          },
          {
            key: 'compound',
            header: 'Compound',
            cell: (r) => r.compound.name,
            sortValue: (r) => r.compound.name,
          },
          { key: 'unit', header: 'Home', cell: (r) => r.customer.unit },
          {
            key: 'plan',
            header: 'Plan',
            cell: (r) => (r.main ? PLANS[r.main.plan].name : '—'),
            sortValue: (r) => r.main?.plan ?? '',
          },
          {
            key: 'cars',
            header: 'Cars',
            cell: (r) => r.cars,
            sortValue: (r) => r.cars,
            align: 'right',
          },
          {
            key: 'status',
            header: 'Status',
            cell: (r) => (r.main ? <Chip def={SUB_STATUS[r.main.status]} /> : '—'),
            sortValue: (r) => r.main?.status ?? '',
          },
          {
            key: 'monthly',
            header: 'Monthly',
            cell: (r) => formatEGP(r.monthly),
            sortValue: (r) => r.monthly,
            align: 'right',
          },
          {
            key: 'joined',
            header: 'Joined',
            cell: (r) => formatDateNumeric(r.customer.joinedAt),
            sortValue: (r) => r.customer.joinedAt,
          },
        ]}
      />
    </AdminPage>
  );
}
