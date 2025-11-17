import React, { useEffect, useRef, useState } from 'react';

const CountUp = ({ end = 0, duration = 1.2, prefix = '', suffix = '' }) => {
  const [value, setValue] = useState(0);
  const animationRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const target = Number(end) || 0;
    const step = (timestamp) => {
      if (!startRef.current) startRef.current = timestamp;
      const progress = Math.min((timestamp - startRef.current) / (duration * 1000), 1);
      setValue(Math.floor(progress * target));
      if (progress < 1) {
        animationRef.current = requestAnimationFrame(step);
      }
    };
    animationRef.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(animationRef.current);
  }, [end, duration]);

  return (
    <span>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

export default CountUp;
