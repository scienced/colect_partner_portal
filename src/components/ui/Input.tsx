import {
  forwardRef,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type SelectHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/**
 * Base input styles used across all form elements.
 */
const baseInputStyles =
  "w-full px-3 py-2 border rounded-md transition-colors focus:outline-none focus:ring-2 focus:border-transparent";

const stateStyles = {
  default: "border-gray-300 focus:ring-primary",
  error: "border-red-300 bg-red-50 focus:ring-red-500",
  disabled: "bg-gray-100 cursor-not-allowed opacity-60",
};

/**
 * Text input component.
 *
 * @example
 * // Basic input
 * <Input placeholder="Enter your name" />
 *
 * @example
 * // With label and error
 * <Input
 *   label="Email"
 *   type="email"
 *   error="Please enter a valid email"
 *   placeholder="you@example.com"
 * />
 *
 * @example
 * // With helper text
 * <Input
 *   label="Password"
 *   type="password"
 *   helperText="Must be at least 8 characters"
 * />
 */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Input label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text below input */
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, disabled, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          disabled={disabled}
          className={cn(
            baseInputStyles,
            error ? stateStyles.error : stateStyles.default,
            disabled && stateStyles.disabled,
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

/**
 * Textarea component for multi-line input.
 *
 * @example
 * <Textarea
 *   label="Description"
 *   placeholder="Enter a description..."
 *   rows={4}
 * />
 */
export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  /** Textarea label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { className, label, error, helperText, disabled, id, rows = 4, ...props },
    ref
  ) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={textareaId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          disabled={disabled}
          rows={rows}
          className={cn(
            baseInputStyles,
            "resize-none",
            error ? stateStyles.error : stateStyles.default,
            disabled && stateStyles.disabled,
            className
          )}
          {...props}
        />
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

/**
 * Select dropdown component.
 *
 * @example
 * <Select label="Country">
 *   <option value="">Select a country</option>
 *   <option value="us">United States</option>
 *   <option value="uk">United Kingdom</option>
 * </Select>
 */
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  /** Select label */
  label?: string;
  /** Error message */
  error?: string;
  /** Helper text */
  helperText?: string;
  /** Select options */
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, helperText, disabled, id, children, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          disabled={disabled}
          className={cn(
            baseInputStyles,
            "bg-white",
            error ? stateStyles.error : stateStyles.default,
            disabled && stateStyles.disabled,
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-gray-500 mt-1">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

/**
 * Checkbox component.
 *
 * @example
 * <Checkbox
 *   label="I agree to the terms"
 *   checked={agreed}
 *   onChange={(e) => setAgreed(e.target.checked)}
 * />
 */
export interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  /** Checkbox label */
  label: string;
  /** Description below label */
  description?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, disabled, id, ...props }, ref) => {
    const checkboxId = id || label.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          disabled={disabled}
          className={cn(
            "w-4 h-4 mt-0.5 rounded border-gray-300 text-primary focus:ring-primary",
            disabled && "opacity-60 cursor-not-allowed",
            className
          )}
          {...props}
        />
        <div>
          <label
            htmlFor={checkboxId}
            className={cn(
              "text-sm font-medium text-gray-700",
              disabled && "opacity-60"
            )}
          >
            {label}
          </label>
          {description && (
            <p className="text-sm text-gray-500">{description}</p>
          )}
        </div>
      </div>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Input;
