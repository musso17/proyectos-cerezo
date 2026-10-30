import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

export const SectionCard = ({ title, description, action, children, className = '' }) => (
  <section className={`glass-panel flex flex-col gap-4 rounded-xl p-5 sm:p-6 ${className}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-lg font-semibold tracking-tight text-primary dark:text-white">{title}</h3>
        {description && <p className="mt-0.5 text-sm text-secondary dark:text-white/60">{description}</p>}
      </div>
      {action}
    </div>
    {children}
  </section>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-xl border-2 border-dashed border-border/60 bg-slate-50/50 p-6 text-sm font-medium text-secondary dark:bg-white/[0.02] dark:text-white/60">
    {message}
  </div>
);

const axisTick = { fill: 'var(--chart-axis)', fontSize: 12 };

const ChartTooltip = ({ active, payload, label, formatValue }) => {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 text-sm shadow-lg dark:border-white/10 dark:bg-[#16171D]">
      <p className="font-semibold text-primary dark:text-white">{label}</p>
      <p className="text-secondary dark:text-white/70">{formatValue(item.value, item.payload)}</p>
    </div>
  );
};

// Barras de una sola serie: color de datos (no el rojo de alertas), barras
// finas con el extremo redondeado y tooltip al pasar el mouse.
export const SingleSeriesBarChart = ({ data, xKey, yKey, emptyMessage, formatValue = (v) => v, allowDecimals = false }) => (
  <div className="mt-2 h-56 sm:h-64">
    {data.length > 0 ? (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
          <CartesianGrid stroke="var(--chart-grid)" vertical={false} />
          <XAxis dataKey={xKey} axisLine={false} tickLine={false} tick={axisTick} interval={0} />
          <YAxis allowDecimals={allowDecimals} axisLine={false} tickLine={false} tick={axisTick} width={40} />
          <RechartsTooltip
            cursor={{ fill: 'var(--chart-cursor)' }}
            content={<ChartTooltip formatValue={formatValue} />}
          />
          <Bar dataKey={yKey} fill="var(--chart-series-1)" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <EmptyState message={emptyMessage} />
    )}
  </div>
);
