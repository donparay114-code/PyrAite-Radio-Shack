import React from 'react';
import { cn } from '@/lib/utils';

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  intensity?: 'light' | 'medium' | 'heavy';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
}

export const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  (
    { className, intensity = 'medium', padding = 'md', hover = false, children, ...props },
    ref
  ) => {
    const intensityStyles = {
      light: 'glass-light',
      medium: 'glass',
      heavy: 'glass-heavy',
    };

    const paddingStyles = {
      none: '',
      sm: 'p-4',
      md: 'p-6',
      lg: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl',
          intensityStyles[intensity],
          paddingStyles[padding],
          hover && 'transition-all hover:translate-y-[-4px] hover:shadow-xl',
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

GlassCard.displayName = 'GlassCard';
