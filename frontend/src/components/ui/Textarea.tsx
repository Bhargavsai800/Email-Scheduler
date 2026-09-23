import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className = '',
  id,
  rows = 4,
  ...props
}) => {
  const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full space-y-1.5">
      {label && (
        <label htmlFor={textareaId} className="block text-xs font-medium text-slate-300">
          {label}
        </label>
      )}

      <textarea
        id={textareaId}
        rows={rows}
        className={`w-full bg-slate-950/80 border ${
          error
            ? 'border-rose-500/80 focus:border-rose-500 focus:ring-rose-500/20'
            : 'border-slate-800 focus:border-indigo-500 focus:ring-indigo-500/20'
        } rounded-xl px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 transition resize-y ${className}`}
        {...props}
      />

      {error ? (
        <p className="text-xs text-rose-400 mt-1">{error}</p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
