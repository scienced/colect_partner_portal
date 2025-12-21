import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Button variant style */
  variant?: "primary" | "secondary" | "danger" | "ghost";
  /** Button size */
  size?: "sm" | "md" | "lg";
  /** Show loading spinner */
  loading?: boolean;
  /** Icon to show before text */
  icon?: ReactNode;
  /** Icon to show after text */
  iconAfter?: ReactNode;
}

const variantStyles = {
  primary: "bg-primary text-white hover:bg-opacity-90",
  secondary: "border border-gray-300 text-gray-700 hover:bg-gray-50 bg-white",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "text-gray-700 hover:bg-gray-100",
};

const sizeStyles = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2",
  lg: "px-6 py-3 text-lg",
};

/**
 * Button component with variants and loading state.
 *
 * @example
 * // Primary button
 * <Button variant="primary">Save Changes</Button>
 *
 * @example
 * // With loading state
 * <Button variant="primary" loading={isSaving}>
 *   {isSaving ? "Saving..." : "Save"}
 * </Button>
 *
 * @example
 * // With icon
 * <Button variant="secondary" icon={<Plus className="w-4 h-4" />}>
 *   Add Item
 * </Button>
 *
 * @example
 * // Danger button
 * <Button variant="danger" onClick={handleDelete}>
 *   Delete
 * </Button>
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      loading = false,
      icon,
      iconAfter,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          // Base styles
          "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors",
          // Focus ring
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          // Disabled state
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Variant styles
          variantStyles[variant],
          // Size styles
          sizeStyles[size],
          className
        )}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : icon ? (
          icon
        ) : null}
        {children}
        {iconAfter && !loading && iconAfter}
      </button>
    );
  }
);

Button.displayName = "Button";

/**
 * Icon-only button for actions like edit, delete, etc.
 *
 * @example
 * <IconButton
 *   icon={<Trash2 className="w-4 h-4" />}
 *   variant="danger"
 *   onClick={handleDelete}
 *   aria-label="Delete item"
 * />
 */
export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Icon to display */
  icon: ReactNode;
  /** Color variant */
  variant?: "default" | "primary" | "danger" | "success";
  /** Button size */
  size?: "sm" | "md" | "lg";
}

const iconVariantStyles = {
  default: "text-gray-400 hover:text-gray-600 hover:bg-gray-100",
  primary: "text-gray-400 hover:text-primary hover:bg-primary/10",
  danger: "text-gray-400 hover:text-red-600 hover:bg-red-50",
  success: "text-gray-400 hover:text-green-600 hover:bg-green-50",
};

const iconSizeStyles = {
  sm: "p-1",
  md: "p-2",
  lg: "p-3",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    { className, icon, variant = "default", size = "md", disabled, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        className={cn(
          "rounded transition-colors",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          "disabled:opacity-50 disabled:cursor-not-allowed",
          iconVariantStyles[variant],
          iconSizeStyles[size],
          className
        )}
        disabled={disabled}
        {...props}
      >
        {icon}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export default Button;
