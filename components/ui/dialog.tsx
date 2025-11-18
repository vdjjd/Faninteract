"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;

export const DialogContent = ({
  children,
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>) => {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay
        className={cn('fixed', 'inset-0', 'bg-black/70', 'backdrop-blur-sm', 'z-40')}
      />

      <DialogPrimitive.Content
        {...props}
        className={cn(
          "fixed z-50 top-1/2 left-1/2 w-full max-w-md -translate-x-1/2 -translate-y-1/2",
          "rounded-xl bg-neutral-900 border border-white/10 shadow-2xl",
          "p-6 focus:outline-none",
          className
        )}
      >
        {children}

        {/* Close button */}
        <DialogPrimitive.Close asChild>
          <button className={cn('absolute', 'top-4', 'right-4', 'p-1', 'rounded-full', 'hover:bg-white/10')}>
            <X className={cn('w-5', 'h-5', 'text-white')} />
          </button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
};

export const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("mb-3 text-center", className)} {...props} />
);

export const DialogTitle = ({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>) => (
  <DialogPrimitive.Title
    className={cn("text-xl font-semibold text-sky-300", className)}
    {...props}
  />
);
