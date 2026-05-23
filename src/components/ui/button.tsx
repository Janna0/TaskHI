'use client';
import { forwardRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6366f1] focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        primary:   'bg-[#6366f1] hover:bg-[#4f46e5] active:bg-[#4338ca] text-white',
        secondary: 'bg-[#f1f5f9] hover:bg-[#e2e8f0] active:bg-[#cbd5e1] text-[#334155]',
        ghost:     'bg-transparent hover:bg-[#f1f5f9] active:bg-[#e2e8f0] text-[#334155]',
        danger:    'bg-[#dc2626] hover:bg-red-700 active:bg-red-800 text-white',
        link:      'bg-transparent underline text-[#6366f1] hover:text-[#4f46e5] p-0 h-auto',
      },
      size: {
        xs: 'h-6 px-2 text-xs',
        sm: 'h-7 px-3 text-sm',
        md: 'h-8 px-4 text-sm',
        lg: 'h-10 px-5 text-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, disabled, children, ...props }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    >
      {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
      {children}
    </button>
  )
);
Button.displayName = 'Button';
