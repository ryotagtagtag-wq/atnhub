import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { twMerge } from 'tailwind-merge';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export const Card = forwardRef<HTMLDivElement, CardProps>(({ className, ...props }, ref) => (
  <div ref={ref} className={twMerge('card', className)} {...props} />
));
Card.displayName = 'Card';

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('mb-4 text-lg font-semibold text-gray-900 dark:text-white', className)}
      {...props}
    />
  ),
);
CardHeader.displayName = 'CardHeader';

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export const CardContent = forwardRef<HTMLDivElement, CardContentProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge('text-sm text-gray-600 dark:text-gray-300', className)}
      {...props}
    />
  ),
);
CardContent.displayName = 'CardContent';

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={twMerge(
        'mt-4 flex items-center gap-2 border-t border-gray-200 pt-4 dark:border-gray-700',
        className,
      )}
      {...props}
    />
  ),
);
CardFooter.displayName = 'CardFooter';
