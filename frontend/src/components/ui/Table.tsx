import { forwardRef } from 'react';
import type {
  HTMLAttributes,
  TableHTMLAttributes,
  TdHTMLAttributes,
  ThHTMLAttributes,
} from 'react';
import { twMerge } from 'tailwind-merge';

export type TableProps = TableHTMLAttributes<HTMLTableElement>;

export const Table = forwardRef<HTMLTableElement, TableProps>(
  ({ className, ...props }, ref) => (
    <table ref={ref} className={twMerge('w-full text-sm', className)} {...props} />
  ),
);
Table.displayName = 'Table';

export type TheadProps = HTMLAttributes<HTMLTableSectionElement>;

export const Thead = forwardRef<HTMLTableSectionElement, TheadProps>(
  ({ className, ...props }, ref) => (
    <thead
      ref={ref}
      className={twMerge('border-b border-gray-200 dark:border-gray-700', className)}
      {...props}
    />
  ),
);
Thead.displayName = 'Thead';

export type TbodyProps = HTMLAttributes<HTMLTableSectionElement>;

export const Tbody = forwardRef<HTMLTableSectionElement, TbodyProps>(
  ({ className, ...props }, ref) => (
    <tbody
      ref={ref}
      className={twMerge('divide-y divide-gray-200 dark:divide-gray-700', className)}
      {...props}
    />
  ),
);
Tbody.displayName = 'Tbody';

export type TrProps = HTMLAttributes<HTMLTableRowElement>;

export const Tr = forwardRef<HTMLTableRowElement, TrProps>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={twMerge(
        'transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50',
        className,
      )}
      {...props}
    />
  ),
);
Tr.displayName = 'Tr';

export type ThProps = ThHTMLAttributes<HTMLTableCellElement>;

export const Th = forwardRef<HTMLTableCellElement, ThProps>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={twMerge(
        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400',
        className,
      )}
      {...props}
    />
  ),
);
Th.displayName = 'Th';

export type TdProps = TdHTMLAttributes<HTMLTableCellElement>;

export const Td = forwardRef<HTMLTableCellElement, TdProps>(
  ({ className, ...props }, ref) => (
    <td
      ref={ref}
      className={twMerge('px-4 py-3 align-middle text-gray-700 dark:text-gray-300', className)}
      {...props}
    />
  ),
);
Td.displayName = 'Td';
