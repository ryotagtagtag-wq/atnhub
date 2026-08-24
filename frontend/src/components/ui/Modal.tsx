import { forwardRef } from 'react';
import type { DialogHTMLAttributes, MouseEventHandler } from 'react';
import { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export interface ModalProps extends DialogHTMLAttributes<HTMLDialogElement> {
  open: boolean;
  onClose: () => void;
  title?: string;
}

export const Modal = forwardRef<HTMLDialogElement, ModalProps>(
  ({ open, onClose, title, className, children, onClick, ...props }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = useId();

    // Keep the native <dialog> element in sync with the controlled `open` prop.
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      if (open && !dialog.open) dialog.showModal();
      if (!open && dialog.open) dialog.close();
    }, [open]);

    // ESC closes the dialog natively, which fires the `close` event.
    useEffect(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;

      dialog.addEventListener('close', onClose);
      return () => dialog.removeEventListener('close', onClose);
    }, [onClose]);

    // Prevent background scrolling while the modal is open.
    useEffect(() => {
      if (!open) return;

      const previousOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = previousOverflow;
      };
    }, [open]);

    const setDialogRef = (node: HTMLDialogElement | null) => {
      dialogRef.current = node;
      if (typeof ref === 'function') ref(node);
      else if (ref) ref.current = node;
    };

    // Clicks on ::backdrop target the <dialog> element itself.
    const handleDialogClick: MouseEventHandler<HTMLDialogElement> = (event) => {
      if (event.target === event.currentTarget) onClose();
      onClick?.(event);
    };

    return (
      <dialog
        ref={setDialogRef}
        aria-labelledby={title ? titleId : undefined}
        className={twMerge(
          clsx(
            'm-auto w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl',
            'backdrop:bg-gray-900/50',
            'dark:border-gray-700 dark:bg-gray-800',
          ),
          className,
        )}
        onClick={handleDialogClick}
        {...props}
      >
        {title && (
          <div className="mb-4 flex items-start justify-between gap-4">
            <h2 id={titleId} className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h2>
            <button
              type="button"
              aria-label="閉じる"
              onClick={() => dialogRef.current?.close()}
              className="-mr-1 -mt-1 rounded-lg p-1 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            >
              <X size={18} aria-hidden />
            </button>
          </div>
        )}
        {children}
      </dialog>
    );
  },
);
Modal.displayName = 'Modal';
