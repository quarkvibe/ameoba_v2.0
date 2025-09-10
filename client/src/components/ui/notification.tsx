import * as React from "react";
import { cn } from "@/lib/utils";

interface NotificationProps extends React.HTMLAttributes<HTMLDivElement> {
  type?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  description?: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
}

const Notification = React.forwardRef<HTMLDivElement, NotificationProps>(
  ({ 
    className, 
    type = 'info', 
    title, 
    description, 
    children, 
    onClose, 
    autoClose = true, 
    duration = 5000,
    ...props 
  }, ref) => {
    React.useEffect(() => {
      if (autoClose && onClose) {
        const timer = setTimeout(onClose, duration);
        return () => clearTimeout(timer);
      }
    }, [autoClose, duration, onClose]);

    const getTypeStyles = () => {
      switch (type) {
        case 'success':
          return 'bg-accent border-accent/20 text-accent-foreground';
        case 'warning':
          return 'bg-yellow-500 border-yellow-500/20 text-background';
        case 'error':
          return 'bg-destructive border-destructive/20 text-destructive-foreground';
        default:
          return 'bg-primary border-primary/20 text-primary-foreground';
      }
    };

    const getIcon = () => {
      switch (type) {
        case 'success':
          return 'fas fa-check-circle';
        case 'warning':
          return 'fas fa-exclamation-triangle';
        case 'error':
          return 'fas fa-times-circle';
        default:
          return 'fas fa-info-circle';
      }
    };

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg border p-4 shadow-lg transition-all duration-300 animate-in slide-in-from-top-2",
          getTypeStyles(),
          className
        )}
        {...props}
        data-testid={`notification-${type}`}
      >
        <div className="flex items-start gap-3">
          <i className={`${getIcon()} text-sm mt-0.5`}></i>
          <div className="flex-1 min-w-0">
            {title && (
              <h4 className="text-sm font-semibold leading-none tracking-tight mb-1">
                {title}
              </h4>
            )}
            {description && (
              <p className="text-sm opacity-90 leading-relaxed">
                {description}
              </p>
            )}
            {children}
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="opacity-70 hover:opacity-100 transition-opacity"
              data-testid="notification-close"
            >
              <i className="fas fa-times text-xs"></i>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Notification.displayName = "Notification";

export { Notification };
export type { NotificationProps };
