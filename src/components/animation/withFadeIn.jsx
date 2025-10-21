"use client";

import React from 'react';
import clsx from 'clsx';

const withFadeIn = (Component, options = {}) => {
  const { className = '' } = options;
  return function FadeInWrapper(props) {
    return (
      <div className={clsx('animate-fade-up', className)}>
        <Component {...props} />
      </div>
    );
  };
};

export default withFadeIn;
