import React from 'react';
import clsx from 'clsx';

const variantColor = {
  info: '#4f46e5',
  success: '#0f766e',
  warning: '#b45309',
  neutral: '#475569',
};

const Badge = ({ variant = 'info', withDot = false, children, className }) => {
  return (
    <span
      data-variant={variant}
      data-dot={withDot ? 'true' : 'false'}
      className={clsx('badge-dot glass-pill', className)}
      style={{ color: variantColor[variant] || variantColor.info }}
    >
      {children}
    </span>
  );
};

export default Badge;
