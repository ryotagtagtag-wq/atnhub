import { createContext, forwardRef, useContext, useState } from 'react';
import type { ButtonHTMLAttributes, HTMLAttributes } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

interface TabsContextValue {
  value: string;
  setValue: (value: string) => void;
}

const TabsContext = createContext<TabsContextValue | null>(null);

const useTabsContext = (componentName: string): TabsContextValue => {
  const context = useContext(TabsContext);
  if (!context) {
    throw new Error(`<${componentName}> must be used within <Tabs>.`);
  }
  return context;
};

export interface TabsProps extends HTMLAttributes<HTMLDivElement> {
  /** Controlled active tab value. */
  value?: string;
  /** Initial active tab value for uncontrolled usage. */
  defaultValue?: string;
  onValueChange?: (value: string) => void;
}

export const Tabs = forwardRef<HTMLDivElement, TabsProps>(
  ({ value, defaultValue, onValueChange, className, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = useState(defaultValue ?? '');
    const activeValue = value ?? internalValue;

    const setValue = (nextValue: string) => {
      if (value === undefined) setInternalValue(nextValue);
      onValueChange?.(nextValue);
    };

    return (
      <TabsContext.Provider value={{ value: activeValue, setValue }}>
        <div ref={ref} className={className} {...props}>
          {children}
        </div>
      </TabsContext.Provider>
    );
  },
);
Tabs.displayName = 'Tabs';

export type TabsListProps = HTMLAttributes<HTMLDivElement>;

export const TabsList = forwardRef<HTMLDivElement, TabsListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="tablist"
      className={twMerge(
        'inline-flex items-center gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800',
        className,
      )}
      {...props}
    />
  ),
);
TabsList.displayName = 'TabsList';

export interface TabsTriggerProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
}

export const TabsTrigger = forwardRef<HTMLButtonElement, TabsTriggerProps>(
  ({ value, className, children, onClick, ...props }, ref) => {
    const { value: activeValue, setValue } = useTabsContext('TabsTrigger');
    const isActive = value === activeValue;

    return (
      <button
        ref={ref}
        type="button"
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? 'active' : 'inactive'}
        onClick={(event) => {
          setValue(value);
          onClick?.(event);
        }}
        className={twMerge(
          clsx(
            'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
            'disabled:pointer-events-none disabled:opacity-50',
            isActive
              ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white'
              : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100',
          ),
          className,
        )}
        {...props}
      >
        {children}
      </button>
    );
  },
);
TabsTrigger.displayName = 'TabsTrigger';

export interface TabsContentProps extends HTMLAttributes<HTMLDivElement> {
  value: string;
}

export const TabsContent = forwardRef<HTMLDivElement, TabsContentProps>(
  ({ value, className, children, ...props }, ref) => {
    const { value: activeValue } = useTabsContext('TabsContent');
    if (value !== activeValue) return null;

    return (
      <div
        ref={ref}
        role="tabpanel"
        className={twMerge('mt-3 focus-visible:outline-none', className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
TabsContent.displayName = 'TabsContent';
