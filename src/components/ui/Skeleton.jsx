import React from 'react';
import clsx from 'clsx';

const Skeleton = ({ className }) => (
  <div className={clsx('skeleton', className)} aria-hidden="true" />
);

export default Skeleton;
