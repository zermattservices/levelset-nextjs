interface BadgeProps {
  children: React.ReactNode;
  variant?: 'brand' | 'muted' | 'success';
  className?: string;
}

const variantStyles = {
  brand: 'bg-brand/10 text-brand border-brand/20',
  muted: 'bg-muted-soft text-muted border-muted-border',
  success: 'bg-success-soft text-success border-success-border',
};

export function Badge({ children, variant = 'brand', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-3 py-1 rounded-full
        text-xs font-medium border
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
