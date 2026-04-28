import React from 'react';

const MetricCard = ({ title, value, description, icon: Icon, accent }) => (
  <div className="glass-panel group flex flex-col justify-between p-6 sm:p-8 rounded-[2.5rem] transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_40px_80px_-15px_rgba(255,75,42,0.2)] overflow-hidden relative">
    {/* Background Glow */}
    <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-[#FF4B2A]/5 blur-[60px] group-hover:bg-[#FF4B2A]/15 transition-all duration-700" />
    
    <div className="relative z-10 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold uppercase tracking-[0.4em] text-secondary/40 group-hover:text-[#FF4B2A] transition-colors">
          {title}
        </p>
        {Icon && (
          <div className="text-secondary/20 group-hover:text-[#FF4B2A] group-hover:rotate-[15deg] transition-all duration-500">
            <Icon size={24} strokeWidth={2.5} />
          </div>
        )}
      </div>
      
      <div className="flex flex-col gap-2">
        <p className="text-4xl sm:text-5xl font-medium text-primary tracking-tight dark:text-white leading-none">
          {value}
        </p>
        {description && (
          <p className="text-[10px] font-medium uppercase tracking-wide text-secondary/40 mt-2">
            {description}
          </p>
        )}
      </div>
    </div>

    {/* Brand Gradient Bar */}
    <div className="absolute bottom-0 left-0 h-1.5 w-0 brand-gradient transition-all duration-700 group-hover:w-full" />
  </div>
);

export default MetricCard;