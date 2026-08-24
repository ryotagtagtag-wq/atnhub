import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

export type BadgeVariant = 'default' | 'secondary' | 'success' | 'destructive' | 'outline';

const badgeVariants: Record<BadgeVariant, string> = {
  default: 'bg-primary text-white',
  secondary: 'badge-gray',
  success: 'badge-success',
  destructive: 'badge-danger',
  outline:
    'border border-gray-300 bg-transparent text-gray-700 dark:border-gray-600 dark:text-gray-300',
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={clsx('badge', badgeVariants[variant], className)}
      {...props}
    />
  ),
);
Badge.displayName = 'Badge';
