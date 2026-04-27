import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

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

const WeeklyRecordingsChart = ({ data }) => (
  <div className="glass-panel col-span-1 flex flex-col gap-3 p-4 sm:gap-4 sm:p-6 transition-all xl:col-span-2">
    <Header title="Grabaciones por semana" subtitle="Tendencia semanal" />
    <ChartContainer>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorRecording" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4C8EF7" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#4C8EF7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" vertical={false} />
            <XAxis dataKey="week" tick={{ fill: '#6B7280', fontSize: 10 }} />
            <YAxis allowDecimals={false} tick={{ fill: '#6B7280', fontSize: 10 }} />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid rgba(209,213,219,0.7)',
                boxShadow: '0 10px 24px rgba(15,23,42,0.08)',
                fontSize: '12px'
              }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#4C8EF7"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorRecording)"
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="Aún no hay grabaciones registradas" />
      )}
    </ChartContainer>
  </div>
);

export default WeeklyRecordingsChart;
