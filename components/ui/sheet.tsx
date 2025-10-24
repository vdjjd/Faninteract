'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export const SheetContent = React.forwardRef<
  React.ElementRef<typeof Dialog.Content>,
  React.ComponentPropsWithoutRef<typeof Dialog.Content> & {
    side?: 'left' | 'right' | 'top' | 'bottom';
  }
>(({ side = 'right', className, children, ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" />
    <Dialog.Content
      ref={ref}
      className={cn(
        'fixed z-50 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xl transition-all',
        side === 'right' && 'top-0 right-0 h-full w-80',
        side === 'left' && 'top-0 left-0 h-full w-80',
        side === 'top' && 'top-0 left-0 w-full h-1/3',
        side === 'bottom' && 'bottom-0 left-0 w-full h-1/3',
        className
      )}
      {...props}
    >
      <button
        onClick={() => (props as any).onOpenChange?.(false)}
        className="absolute right-3 top-3 rounded-full p-1 hover:bg-black/10"
      >
        <X className="w-5 h-5" />
      </button>
      {children}
    </Dialog.Content>
  </Dialog.Portal>
));
SheetContent.displayName = 'SheetContent';

/* ---------- FIXED ---------- */

export const SheetHeader = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div className={cn('border-b border-gray-200 dark:border-neutral-800 p-4', className)}>
    {children}
  </div>
);

export const SheetTitle = ({
  children,
  className
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h2 className={cn('text-lg font-semibold', className)}>{children}</h2>
);
