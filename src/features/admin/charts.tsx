import type { ReactNode } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/Card';

/*
 * Every chart here shows ONE series, so each uses the single brand hue and
 * no legend (the title names the series). Grid and axes are recessive;
 * values are available on hover and in a screen-reader table.
 */
const SERIES = '#0e5e8c';
const GRID = '#e5e7eb';
const TICK = { fill: '#5b6370', fontSize: 12 };
const TOOLTIP = {
  contentStyle: {
    borderRadius: 10,
    border: '1px solid #e5e7eb',
    boxShadow: '0 2px 8px rgb(16 24 40 / 0.08)',
    fontSize: 13,
  },
  labelStyle: { color: '#111827', fontWeight: 600 },
  cursor: { fill: '#0e5e8c', fillOpacity: 0.06, stroke: '#c9ced6' },
} as const;

type Row = Record<string, string | number>;
type Format = (value: number) => string;

function ChartCard({
  title,
  note,
  rows,
  labelKey,
  valueKey,
  valueLabel,
  format,
  children,
}: {
  title: string;
  note?: string;
  rows: Row[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  format: Format;
  children: ReactNode;
}) {
  return (
    <Card>
      <h2 className="font-semibold">{title}</h2>
      {note && <p className="text-ink-2 text-xs">{note}</p>}
      <div className="mt-3 h-56" aria-hidden>
        {children}
      </div>
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">{labelKey}</th>
            <th scope="col">{valueLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={String(r[labelKey])}>
              <th scope="row">{r[labelKey]}</th>
              <td>{format(Number(r[valueKey]))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

interface ChartProps {
  title: string;
  note?: string;
  rows: Row[];
  labelKey: string;
  valueKey: string;
  valueLabel: string;
  format?: Format;
  tickFormat?: Format;
}

const plain: Format = (v) => v.toLocaleString('en-US');

export function LineChartCard({ format = plain, tickFormat = plain, ...p }: ChartProps) {
  return (
    <ChartCard {...p} format={format}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={p.rows} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey={p.labelKey} tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} />
          <YAxis
            tick={TICK}
            tickLine={false}
            axisLine={false}
            width={44}
            tickFormatter={tickFormat}
          />
          <Tooltip {...TOOLTIP} formatter={(v) => [format(Number(v)), p.valueLabel]} />
          <Line
            type="monotone"
            dataKey={p.valueKey}
            stroke={SERIES}
            strokeWidth={2}
            dot={{ r: 4, fill: SERIES, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

export function BarChartCard({
  format = plain,
  tickFormat = plain,
  horizontal,
  ...p
}: ChartProps & { horizontal?: boolean }) {
  return (
    <ChartCard {...p} format={format}>
      <ResponsiveContainer width="100%" height="100%">
        {horizontal ? (
          <BarChart
            data={p.rows}
            layout="vertical"
            margin={{ top: 0, right: 16, bottom: 0, left: 0 }}
            barCategoryGap={4}
          >
            <CartesianGrid stroke={GRID} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK}
              tickLine={false}
              axisLine={false}
              tickFormatter={tickFormat}
            />
            <YAxis
              type="category"
              dataKey={p.labelKey}
              tick={TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              width={132}
              interval={0}
            />
            <Tooltip {...TOOLTIP} formatter={(v) => [format(Number(v)), p.valueLabel]} />
            <Bar
              dataKey={p.valueKey}
              fill={SERIES}
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        ) : (
          <BarChart
            data={p.rows}
            margin={{ top: 8, right: 8, bottom: 0, left: 0 }}
            barCategoryGap="22%"
          >
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis
              dataKey={p.labelKey}
              tick={TICK}
              tickLine={false}
              axisLine={{ stroke: GRID }}
              interval="preserveStartEnd"
              minTickGap={16}
            />
            <YAxis
              tick={TICK}
              tickLine={false}
              axisLine={false}
              width={44}
              tickFormatter={tickFormat}
            />
            <Tooltip {...TOOLTIP} formatter={(v) => [format(Number(v)), p.valueLabel]} />
            <Bar
              dataKey={p.valueKey}
              fill={SERIES}
              radius={[4, 4, 0, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        )}
      </ResponsiveContainer>
    </ChartCard>
  );
}
