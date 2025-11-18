'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'destructive';
}

export function Button({
  className,
  variant = 'default',
  ...props
}: ButtonProps) {
  const base =
    'px-4 py-2 rounded-md font-medium focus:outline-none transition-all duration-200 text-sm';
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-400 text-gray-100 hover:bg-gray-800',
    destructive: 'bg-red-600 text-white hover:bg-red-700',
  };

  return <button className={cn(base, variants[variant], className)} {...props} />;
}
