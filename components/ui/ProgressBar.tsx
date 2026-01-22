import React from 'react';

interface ProgressBarProps {
  current: number;
  max: number;
  showLabel?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ current, max, showLabel = false }) => {
  const percentage = Math.min(100, Math.max(0, (current / max) * 100));
  const isOver = current > max;
  
  // Color logic: 
  // < 75%: Calm Blue/Green (Neutral)
  // 75% - 99%: Amber (Warning, but soft)
  // > 100%: Rose (Alert, but flat)
  
  let colorClass = 'bg-calm-blue';
  let bgClass = 'bg-neutral-200';
  
  if (percentage >= 75 && !isOver) {
    colorClass = 'bg-calm-amber';
  } else if (isOver) {
    colorClass = 'bg-calm-rose';
    bgClass = 'bg-red-100';
  }

  return (
    <div className="w-full">
      <div className={`h-2.5 w-full rounded-full ${bgClass} overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${colorClass}`}
          style={{ width: `${isOver ? 100 : percentage}%` }}
        />
      </div>
    </div>
  );
};
