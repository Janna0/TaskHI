'use client';
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'w-full rounded-md border px-3 py-2 text-sm bg-white text-[#334155] placeholder:text-[#94a3b8] transition-colors',
        'focus:outline-none focus:ring-2 focus:ring-[#6366f1]/20 focus:border-[#6366f1]',
        'disabled:bg-[#f8fafc] disabled:cursor-not-allowed disabled:opacity-50',
        error
          ? 'border-[#dc2626] focus:ring-[#dc2626]/20 focus:border-[#dc2626]'
          : 'border-[#e2e8f0]',
        className
      )}
      {...props}
    />
  )
);
Input.displayName = 'Input';
