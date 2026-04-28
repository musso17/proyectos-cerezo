import { useCallback } from 'react';

export const useCalendarDnD = (projects, updateProject) => {
  const handleDayDragOver = useCallback(
    () => (event) => {
      // Logic for other drag types could go here
    },
    []
  );

  const handleDayDrop = useCallback(
    () => (event) => {
      // Logic for other drag types could go here
    },
    []
  );

  return {
    handleDayDragOver,
    handleDayDrop,
  };
};

export default useCalendarDnD;
