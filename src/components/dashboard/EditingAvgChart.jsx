import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-sm sm:text-lg font-semibold text-primary">{title}</h2>
    <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.32em] text-secondary/60">
      {subtitle}
    </p>
  </div>
);

const ChartContainer = ({ children }) => (
  <div className="h-48 sm:h-64 rounded-2xl border border-[#E5E7EB] bg-white p-3 sm:p-5 shadow-[inset_0_1px_0_rgba(229,231,235,0.6)] dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#CBD5F5] bg-[#F9FAFF] p-6 text-xs text-secondary dark:border-[#2B2D31] dark:bg-[#1B1C20] dark:text-white/50">
    {message}
  </div>
);

const EditingAvgChart = ({ data }) => (
  <div className="glass-panel col-span-1 flex flex-col gap-3 p-4 sm:gap-4 sm:p-6 transition-all">
    <Header title="Promedio de edición" subtitle="Días por tipo" />
    <ChartContainer>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis
              dataKey="type"
              tick={{ fill: '#6B7280', fontSize: 10 }}
              interval={0}
              angle={-45}
              textAnchor="end"
              height={50}
            />
            <YAxis tick={{ fill: '#6B7280', fontSize: 10 }} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid rgba(209,213,219,0.7)',
                fontSize: '12px'
              }}
              formatter={(value) => [`${value} días`, 'Promedio']}
            />
            <Bar dataKey="avgDays" fill="#6C63FF" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="Sin datos de entrega" />
      )}
    </ChartContainer>
  </div>
);

export default EditingAvgChart;
