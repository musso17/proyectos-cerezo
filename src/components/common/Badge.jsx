"use client";

import React from 'react';
import clsx from 'clsx';

const BADGE_BASE_CLASS =
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition-colors duration-150';

const VARIANTS = {
  neutral: 'bg-slate-200 text-slate-800',
  grabacion: 'bg-blue-100 text-blue-800',
  edicion: 'bg-green-100 text-green-800',
};

const Badge = ({ variant = 'neutral', className = '', children }) => {
  const tone = VARIANTS[variant] || VARIANTS.neutral;
  return <span className={clsx(BADGE_BASE_CLASS, tone, className)}>{children}</span>;
};

export default Badge;
