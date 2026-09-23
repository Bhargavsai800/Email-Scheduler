import React from 'react';

export interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'indigo' | 'emerald' | 'amber' | 'rose' | 'sky';
  size?: 'sm' | 'md';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    default: 'bg-slate-800 text-slate-300 border-slate-700',
    indigo: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
    sky: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
  };

  const dotStyles = {
    default: 'bg-slate-400',
    indigo: 'bg-indigo-400 animate-pulse',
    emerald: 'bg-emerald-400',
    amber: 'bg-amber-400 animate-ping',
    rose: 'bg-rose-400',
    sky: 'bg-sky-400',
  };

  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 space-x-1 font-medium',
    md: 'text-xs px-2.5 py-1 space-x-1.5 font-medium',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotStyles[variant]}`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
