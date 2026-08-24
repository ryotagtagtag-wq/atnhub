import { forwardRef } from 'react';
import type { OptionHTMLAttributes, SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';
import { twMerge } from 'tailwind-merge';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, multiple, ...props }, ref) => (
    <span className="relative block">
      <select
        ref={ref}
        multiple={multiple}
        className={twMerge('input appearance-none', !multiple && 'pr-9', className)}
        {...props}
      >
        {children}
      </select>
      {!multiple && (
        <ChevronDown
          aria-hidden
          size={16}
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
        />
      )}
    </span>
  ),
);
Select.displayName = 'Select';

export type OptionProps = OptionHTMLAttributes<HTMLOptionElement>;

export const Option = forwardRef<HTMLOptionElement, OptionProps>(
  ({ className, ...props }, ref) => (
    <option ref={ref} className={className} {...props} />
  ),
);
Option.displayName = 'Option';
