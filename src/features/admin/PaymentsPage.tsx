import { useMemo, useState } from 'react';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/ui/KpiCard';
import { PAYMENT_METHOD_LABEL } from '@/config/business';
import { formatDateNumeric, formatEGP } from '@/lib/format';
import { PAYMENT_STATUS } from '@/config/status';
import { useDemoStore } from '@/store/demoStore';
import type { Payment, PaymentMethod } from '@/types/domain';
import { AdminPage, Chip, FilterSelect, TextLink } from './shared';

const sum = (list: Payment[]) => list.reduce((total, p) => total + p.amount, 0);

export function PaymentsPage() {
  const payments = useDemoStore((s) => s.payments);
  const customers = useDemoStore((s) => s.customers);
  const [status, setStatus] = useState('all');
  const [method, setMethod] = useState('all');

  const rows = useMemo(() => {
    const names = new Map(customers.map((c) => [c.id, c.name]));
    return payments
      .filter(
        (p) =>
          (status === 'all' || p.status === status) && (method === 'all' || p.method === method),
      )
      .map((p) => ({ ...p, customerName: names.get(p.customerId) ?? '' }));
  }, [payments, customers, status, method]);
  const of = (s: Payment['status']) => rows.filter((p) => p.status === s);

  return (
    <AdminPage title="Payments" subtitle={`${rows.length} payments in view (last 3 months)`}>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KpiCard
          label="Collected"
          value={formatEGP(sum(of('paid')))}
          hint={`${of('paid').length} payments`}
        />
        <KpiCard
          label="Due"
          value={formatEGP(sum(of('due')))}
          hint={`${of('due').length} payments`}
        />
        <KpiCard
          label="Overdue"
          value={formatEGP(sum(of('overdue')))}
          hint={`${of('overdue').length} payments`}
        />
        <KpiCard
          label="Refunded"
          value={formatEGP(sum(of('refunded')))}
          hint={`${of('refunded').length} payments`}
        />
      </div>
      <DataTable
        rows={rows}
        rowKey={(p) => p.id}
        searchText={(p) => `${p.customerName} ${p.description}`}
        searchPlaceholder="Search customer or description"
        initialSort={{ key: 'date', dir: 'desc' }}
        rowClassName={(p) => (p.status === 'overdue' ? 'bg-danger-soft' : undefined)}
        filters={
          <>
            <FilterSelect label="Status" value={status} onChange={setStatus}>
              <option value="all">All statuses</option>
              {(Object.keys(PAYMENT_STATUS) as Payment['status'][]).map((s) => (
                <option key={s} value={s}>
                  {PAYMENT_STATUS[s].label}
                </option>
              ))}
            </FilterSelect>
            <FilterSelect label="Method" value={method} onChange={setMethod}>
              <option value="all">All methods</option>
              {(Object.keys(PAYMENT_METHOD_LABEL) as PaymentMethod[]).map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </FilterSelect>
          </>
        }
        columns={[
          {
            key: 'date',
            header: 'Date',
            cell: (p) => formatDateNumeric(p.date),
            sortValue: (p) => p.date,
          },
          {
            key: 'customer',
            header: 'Customer',
            cell: (p) => (
              <TextLink to={`/admin/customers/${p.customerId}`}>{p.customerName}</TextLink>
            ),
            sortValue: (p) => p.customerName,
          },
          { key: 'description', header: 'Description', cell: (p) => p.description },
          {
            key: 'method',
            header: 'Method',
            cell: (p) => PAYMENT_METHOD_LABEL[p.method],
            sortValue: (p) => p.method,
          },
          {
            key: 'status',
            header: 'Status',
            cell: (p) => <Chip def={PAYMENT_STATUS[p.status]} />,
            sortValue: (p) => p.status,
          },
          {
            key: 'amount',
            header: 'Amount',
            cell: (p) => formatEGP(p.amount),
            sortValue: (p) => p.amount,
            align: 'right',
          },
        ]}
      />
    </AdminPage>
  );
}
