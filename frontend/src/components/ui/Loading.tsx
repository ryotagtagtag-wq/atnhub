import { forwardRef } from 'react';
import type { HTMLAttributes, SVGAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface SpinnerProps extends SVGAttributes<SVGSVGElement> {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const spinnerSizes = {
  sm: 'size-4',
  md: 'size-6',
  lg: 'size-8',
} as const;

export const Spinner = forwardRef<SVGSVGElement, SpinnerProps>(
  ({ className, size = 'md', label = '読み込み中', ...props }, ref) => (
    <span role="status" aria-label={label} className="inline-flex">
      <svg
        ref={ref}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={clsx('animate-spin text-current', spinnerSizes[size], className)}
        {...props}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
          className="opacity-25"
        />
        <path
          fill="currentColor"
          className="opacity-75"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
    </span>
  ),
);
Spinner.displayName = 'Spinner';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden="true"
      className={twMerge('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  ),
);
Skeleton.displayName = 'Skeleton';
