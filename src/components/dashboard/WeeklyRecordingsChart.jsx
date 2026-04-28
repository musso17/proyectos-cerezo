import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from 'recharts';

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

const WeeklyRecordingsChart = ({ data }) => (
  <div className="glass-panel col-span-1 flex flex-col gap-3 p-6 sm:p-8 rounded-[2.5rem] transition-all hover:shadow-2xl xl:col-span-2">
    <Header title="Actividad Semanal" subtitle="Tendencia de grabaciones" />
    <ChartContainer>
      {data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRecording" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#FF4B2A" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#FF4B2A" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="0" stroke="rgba(255,75,42,0.05)" vertical={false} />
            <XAxis 
              dataKey="week" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#94A3B8', fontSize: 10, fontWeight: 700 }} 
            />
            <YAxis 
              allowDecimals={false} 
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
              itemStyle={{ color: '#FF4B2A', fontWeight: '900', textTransform: 'uppercase' }}
              labelStyle={{ color: 'rgba(255,255,255,0.4)', fontWeight: '700', marginBottom: '4px' }}
            />
            <Area
              type="monotone"
              dataKey="total"
              stroke="#FF4B2A"
              strokeWidth={4}
              fillOpacity={1}
              fill="url(#colorRecording)"
              animationDuration={1500}
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
