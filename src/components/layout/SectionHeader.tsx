import { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Section header with title, subtitle, and action buttons.
 *
 * @example
 * // Basic usage
 * <SectionHeader
 *   title="Sources"
 *   subtitle="5 sources"
 * />
 *
 * @example
 * // With actions
 * <SectionHeader
 *   title="Sources"
 *   subtitle="Manage your data sources"
 *   actions={
 *     <>
 *       <Button variant="secondary">Import</Button>
 *       <Button variant="primary" icon={<Plus />}>Add Source</Button>
 *     </>
 *   }
 * />
 *
 * @example
 * // With count badge
 * <SectionHeader
 *   title="Sources"
 *   count={sources.length}
 *   actions={<Button>Add Source</Button>}
 * />
 */
export interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Section title */
  title: string;
  /** Subtitle or description */
  subtitle?: string;
  /** Item count (shown as "X items") */
  count?: number;
  /** Custom count label (e.g., "sources" instead of "items") */
  countLabel?: string;
  /** Action buttons */
  actions?: ReactNode;
}

export function SectionHeader({
  className,
  title,
  subtitle,
  count,
  countLabel = "item",
  actions,
  ...props
}: SectionHeaderProps) {
  // Generate subtitle from count if not provided
  const displaySubtitle =
    subtitle ??
    (count !== undefined
      ? `${count} ${countLabel}${count !== 1 ? "s" : ""}`
      : undefined);

  return (
    <div
      className={cn("flex items-center justify-between mb-6", className)}
      {...props}
    >
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
        {displaySubtitle && (
          <p className="text-sm text-gray-600 mt-1">{displaySubtitle}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

/**
 * Page header with title, breadcrumb, and actions.
 * Larger than SectionHeader, used at the top of pages.
 *
 * @example
 * <PageHeader
 *   title="Project Details"
 *   breadcrumb={
 *     <Breadcrumb>
 *       <BreadcrumbItem href="/projects">Projects</BreadcrumbItem>
 *       <BreadcrumbItem>My Project</BreadcrumbItem>
 *     </Breadcrumb>
 *   }
 *   actions={<Button>Edit Project</Button>}
 * />
 */
export interface PageHeaderProps extends HTMLAttributes<HTMLDivElement> {
  /** Page title */
  title: string;
  /** Optional description */
  description?: string;
  /** Breadcrumb navigation */
  breadcrumb?: ReactNode;
  /** Action buttons */
  actions?: ReactNode;
}

export function PageHeader({
  className,
  title,
  description,
  breadcrumb,
  actions,
  ...props
}: PageHeaderProps) {
  return (
    <div className={cn("mb-8", className)} {...props}>
      {breadcrumb && <div className="mb-2">{breadcrumb}</div>}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          {description && (
            <p className="text-gray-600 mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * Simple divider with optional label.
 *
 * @example
 * <Divider />
 *
 * @example
 * <Divider label="or" />
 */
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Optional label in the center */
  label?: string;
}

export function Divider({ className, label, ...props }: DividerProps) {
  if (label) {
    return (
      <div
        className={cn("flex items-center gap-4 my-6", className)}
        {...props}
      >
        <div className="flex-1 border-t border-gray-200" />
        <span className="text-sm text-gray-500">{label}</span>
        <div className="flex-1 border-t border-gray-200" />
      </div>
    );
  }

  return (
    <div
      className={cn("border-t border-gray-200 my-6", className)}
      {...props}
    />
  );
}

/**
 * Empty state placeholder for when there's no data.
 *
 * @example
 * <EmptyState
 *   icon={<FolderOpen className="w-8 h-8" />}
 *   title="No sources yet"
 *   description="Get started by creating your first source."
 *   action={<Button>Create Source</Button>}
 * />
 */
export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /** Icon element */
  icon?: ReactNode;
  /** Empty state title */
  title: string;
  /** Description text */
  description?: string;
  /** Action button */
  action?: ReactNode;
}

export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn("text-center py-12", className)}
      {...props}
    >
      {icon && (
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-gray-400">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-500 mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action}
    </div>
  );
}

/**
 * Status badge for displaying item states.
 *
 * @example
 * <StatusBadge status="active">Active</StatusBadge>
 * <StatusBadge status="warning">Pending</StatusBadge>
 * <StatusBadge status="error">Failed</StatusBadge>
 */
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  /** Status type */
  status: "success" | "warning" | "error" | "info" | "neutral";
  children: ReactNode;
}

const statusStyles = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  error: "bg-red-100 text-red-700",
  info: "bg-blue-100 text-blue-700",
  neutral: "bg-gray-100 text-gray-700",
};

export function StatusBadge({
  className,
  status,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs font-medium rounded-full",
        statusStyles[status],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}

export default SectionHeader;
