import React from 'react';

const MetricCard = ({ title, value, description, icon: Icon, accent }) => (
  <div className="glass-panel flex flex-col justify-between gap-4 p-4 transition-all hover:-translate-y-1 hover:shadow-[0_18px_32px_rgba(15,23,42,0.12)] sm:p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.28em] text-secondary/60">
          {title}
        </p>
        <p className="mt-3 text-3xl font-semibold text-primary">{value}</p>
      </div>
      {Icon && <div className={`rounded-lg border px-3 py-3 ${accent}`}>
        <Icon size={22} />
      </div>}
    </div>
    {description && <p className="mt-4 text-xs text-secondary/80">{description}</p>}
  </div>
);

export default MetricCard;