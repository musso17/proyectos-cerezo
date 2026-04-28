import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

const Header = ({ title, subtitle }) => (
  <div>
    <h2 className="text-xl font-semibold text-primary tracking-tight dark:text-white">{title}</h2>
    <div className="flex items-center gap-2 mt-1">
      <div className="h-1 w-6 rounded-full bg-accent" />
      <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-secondary/40">
        {subtitle}
      </p>
    </div>
  </div>
);

const ChartContainer = ({ children }) => (
  <div className="h-56 sm:h-72 mt-4">
    {children}
  </div>
);

const EmptyState = ({ message }) => (
  <div className="flex h-full items-center justify-center rounded-[2rem] border-2 border-dashed border-border/40 bg-slate-50/50 p-6 text-xs font-medium text-secondary/40 uppercase tracking-wide">
    {message}
  </div>
);

const EditingAvgChart = ({ data }) => (
  <div className="glass-panel col-span-1 flex flex-col gap-3 p-6 sm:p-8 rounded-[2.5rem] transition-all hover:shadow-2xl">
    <Header title="Tiempos" subtitle="Promedio días por tipo" />
    <ChartContainer>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,75,42,0.05)" vertical={false} />
            <XAxis
              dataKey="type"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }}
              interval={0}
            />
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} 
            />
            <RechartsTooltip
              contentStyle={{
                backgroundColor: '#16171D',
                borderRadius: '24px',
                border: '1px solid rgba(255,75,42,0.1)',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                fontSize: '11px',
                color: '#fff',
                padding: '12px 16px'
              }}
              cursor={{ fill: 'rgba(255,75,42,0.05)' }}
            />
            <Bar dataKey="avgDays" fill="#FF4B2A" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyState message="Sin datos de entrega" />
      )}
    </ChartContainer>
  </div>
);

export default EditingAvgChart;
