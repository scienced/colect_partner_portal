import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Add hover shadow effect */
  hover?: boolean;
  /** Add click cursor and border highlight on hover */
  clickable?: boolean;
  /** Padding size */
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingStyles = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
};

/**
 * Card container component.
 *
 * @example
 * // Basic card
 * <Card>
 *   <p>Card content</p>
 * </Card>
 *
 * @example
 * // Clickable card with hover effect
 * <Card hover clickable onClick={handleClick}>
 *   <h3>Click me</h3>
 * </Card>
 *
 * @example
 * // Card with custom padding
 * <Card padding="lg">
 *   <h2>Large padding</h2>
 * </Card>
 */
export const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    { className, hover = false, clickable = false, padding = "md", ...props },
    ref
  ) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white border border-gray-200 rounded-lg",
          paddingStyles[padding],
          hover && "hover:shadow-md transition-shadow",
          clickable && "cursor-pointer hover:border-primary",
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = "Card";

/**
 * Card header section with title and optional actions.
 */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Card title */
  title: string;
  /** Optional subtitle/description */
  subtitle?: string;
  /** Action buttons or elements */
  actions?: ReactNode;
}

export const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
  ({ className, title, subtitle, actions, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "flex items-start justify-between gap-4 pb-4 border-b border-gray-200",
          className
        )}
        {...props}
      >
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    );
  }
);

CardHeader.displayName = "CardHeader";

/**
 * Card content section.
 */
export const CardContent = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return <div ref={ref} className={cn("py-4", className)} {...props} />;
});

CardContent.displayName = "CardContent";

/**
 * Card footer section.
 */
export const CardFooter = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn(
        "flex items-center justify-end gap-3 pt-4 border-t border-gray-200",
        className
      )}
      {...props}
    />
  );
});

CardFooter.displayName = "CardFooter";

/**
 * Feature card for landing pages with icon, title, and description.
 *
 * @example
 * <FeatureCard
 *   icon={<Zap className="w-6 h-6" />}
 *   title="Fast Performance"
 *   description="Optimized for speed and efficiency."
 * />
 */
export interface FeatureCardProps extends HTMLAttributes<HTMLDivElement> {
  /** Icon element */
  icon: ReactNode;
  /** Card title */
  title: string;
  /** Card description */
  description: string;
  /** Optional action button */
  action?: ReactNode;
}

export const FeatureCard = forwardRef<HTMLDivElement, FeatureCardProps>(
  ({ className, icon, title, description, action, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow p-8 border border-gray-200",
          className
        )}
        {...props}
      >
        <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
          <span className="text-primary">{icon}</span>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
        <p className="text-gray-600 mb-4">{description}</p>
        {action}
      </div>
    );
  }
);

FeatureCard.displayName = "FeatureCard";

export default Card;
