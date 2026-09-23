import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'emerald';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  icon,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-950 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

  const variantStyles = {
    primary:
      'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/20 focus:ring-indigo-500 border border-indigo-500/30',
    secondary:
      'bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 focus:ring-slate-600',
    outline:
      'bg-transparent hover:bg-slate-800/80 text-slate-300 hover:text-white border border-slate-700 focus:ring-slate-500',
    ghost:
      'bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-slate-100 focus:ring-slate-600',
    danger:
      'bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 focus:ring-rose-500',
    emerald:
      'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 focus:ring-emerald-500 border border-emerald-500/30',
  };

  const sizeStyles = {
    sm: 'text-xs px-3 py-1.5 space-x-1.5',
    md: 'text-sm px-4 py-2 space-x-2',
    lg: 'text-base px-6 py-3 space-x-2.5',
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin shrink-0" />
      ) : icon ? (
        <span className="shrink-0">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};
