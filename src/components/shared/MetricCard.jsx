import React from 'react';

const MetricCard = ({ title, value, description, icon: Icon, accent }) => (
  <div className="glass-panel flex flex-col justify-between gap-2 p-3 transition-all hover:-translate-y-0.5 hover:shadow-lg sm:gap-4 sm:p-6">
    <div className="flex items-start justify-between">
      <div className="min-w-0">
        <p className="text-[10px] sm:text-xs uppercase tracking-[0.2em] sm:tracking-[0.28em] text-secondary/60 truncate">
          {title}
        </p>
        <p className="mt-1 sm:mt-3 text-xl sm:text-3xl font-bold text-primary truncate">{value}</p>
      </div>
      {Icon && (
        <div className={`hidden sm:flex rounded-lg border px-3 py-3 ${accent}`}>
          <Icon size={22} />
        </div>
      )}
    </div>
    {description && (
      <p className="mt-2 text-[10px] sm:text-xs text-secondary/70 line-clamp-1">
        {description}
      </p>
    )}
  </div>
);

export default MetricCard;