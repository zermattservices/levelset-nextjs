'use client';

import { ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

const variantStyles = {
  primary:
    'bg-brand text-white hover:bg-brand-hover shadow-sm hover:shadow-md active:shadow-sm',
  secondary:
    'bg-neutral-soft text-text-primary hover:bg-neutral-border',
  outline:
    'border-2 border-brand text-brand hover:bg-brand hover:text-white',
  ghost:
    'text-text-secondary hover:text-brand hover:bg-brand/5',
};

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-brand/40 focus:ring-offset-2
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${className}
        `}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
