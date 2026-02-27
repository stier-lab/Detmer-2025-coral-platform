import { HTMLAttributes, forwardRef } from 'react';
import clsx from 'clsx';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'flat' | 'interactive' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', padding = 'md', children, ...props }, ref) => {
    const variants = {
      default: 'bg-gradient-to-br from-white to-sand-warm/50 border border-border-light/80 shadow-sm',
      flat: 'bg-white border border-border-light',
      interactive: clsx(
        'bg-gradient-to-br from-white to-sand-warm/50',
        'border border-border-light/80',
        'shadow-sm hover:shadow-lg',
        'hover:border-ocean-light/30',
        'hover:-translate-y-1',
        'transition-all duration-300 ease-out',
        'cursor-pointer group'
      ),
      glass: clsx(
        'bg-white/70 backdrop-blur-md',
        'border border-white/50',
        'shadow-lg shadow-ocean-deep/5'
      ),
      elevated: clsx(
        'bg-gradient-to-br from-white via-white to-ocean-light/5',
        'border border-border-medium/50',
        'shadow-md hover:shadow-xl',
        'transition-shadow duration-300'
      ),
    };

    const paddings = {
      none: '',
      sm: 'p-3',
      md: 'p-5',
      lg: 'p-6',
      xl: 'p-8',
    };

    return (
      <div
        ref={ref}
        className={clsx('rounded-2xl relative overflow-hidden', variants[variant], paddings[padding], className)}
        {...props}
      >
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  withDivider?: boolean;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, children, withDivider = false, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'mb-4',
        withDivider && 'pb-4 border-b border-border-light/50',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: 'h1' | 'h2' | 'h3' | 'h4';
  withIcon?: React.ReactNode;
}

export const CardTitle = forwardRef<HTMLHeadingElement, CardTitleProps>(
  ({ className, as: Component = 'h3', children, withIcon, ...props }, ref) => (
    <div className="flex items-center gap-3">
      {withIcon && (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ocean-light/10 to-reef-green/10 flex items-center justify-center text-ocean-mid flex-shrink-0">
          {withIcon}
        </div>
      )}
      <Component
        ref={ref}
        className={clsx('text-lg font-display font-semibold text-ocean-deep tracking-tight', className)}
        {...props}
      >
        {children}
      </Component>
    </div>
  )
);

CardTitle.displayName = 'CardTitle';

// New: Card description component
type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export const CardDescription = forwardRef<HTMLParagraphElement, CardDescriptionProps>(
  ({ className, children, ...props }, ref) => (
    <p
      ref={ref}
      className={clsx('text-sm text-text-secondary font-body mt-1', className)}
      {...props}
    >
      {children}
    </p>
  )
);

CardDescription.displayName = 'CardDescription';

// New: Card footer for actions
type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export const CardFooter = forwardRef<HTMLDivElement, CardFooterProps>(
  ({ className, children, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        'mt-6 pt-4 border-t border-border-light/50',
        'flex items-center justify-end gap-3',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
