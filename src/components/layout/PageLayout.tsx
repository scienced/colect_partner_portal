import { type ReactNode, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/**
 * Main page layout with header, optional sidebar, and content area.
 *
 * @example
 * // Full layout with sidebar
 * <PageLayout
 *   header={<Header />}
 *   sidebar={<Sidebar />}
 * >
 *   <main>Page content</main>
 * </PageLayout>
 *
 * @example
 * // Simple layout without sidebar
 * <PageLayout header={<Header />}>
 *   <main>Page content</main>
 * </PageLayout>
 */
export interface PageLayoutProps extends HTMLAttributes<HTMLDivElement> {
  /** Header content */
  header?: ReactNode;
  /** Sidebar content */
  sidebar?: ReactNode;
  /** Sidebar width class (default: w-60) */
  sidebarWidth?: string;
  /** Main content */
  children: ReactNode;
}

export function PageLayout({
  className,
  header,
  sidebar,
  sidebarWidth = "w-60",
  children,
  ...props
}: PageLayoutProps) {
  return (
    <div
      className={cn("min-h-screen bg-gray-50 flex flex-col", className)}
      {...props}
    >
      {/* Header */}
      {header}

      {/* Body */}
      <div className="flex-1 flex">
        {/* Sidebar */}
        {sidebar && (
          <aside
            className={cn(
              "bg-white border-r border-gray-200 flex-shrink-0 flex flex-col",
              sidebarWidth
            )}
          >
            {sidebar}
          </aside>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

/**
 * Standard header component for pages.
 *
 * @example
 * <Header
 *   logo={<Logo />}
 *   navigation={<NavLinks />}
 *   actions={<UserMenu />}
 * />
 */
export interface HeaderProps extends HTMLAttributes<HTMLElement> {
  /** Logo or brand element */
  logo?: ReactNode;
  /** Navigation links */
  navigation?: ReactNode;
  /** Action buttons (e.g., user menu) */
  actions?: ReactNode;
  /** Max width class for content */
  maxWidth?: string;
}

export function Header({
  className,
  logo,
  navigation,
  actions,
  maxWidth = "max-w-7xl",
  ...props
}: HeaderProps) {
  return (
    <header
      className={cn("bg-white border-b border-gray-200 px-6 py-4", className)}
      {...props}
    >
      <div
        className={cn(
          "mx-auto flex items-center justify-between",
          maxWidth
        )}
      >
        {/* Logo */}
        {logo && <div className="flex-shrink-0">{logo}</div>}

        {/* Navigation */}
        {navigation && (
          <nav className="flex items-center gap-1">{navigation}</nav>
        )}

        {/* Actions */}
        {actions && <div className="flex items-center gap-3">{actions}</div>}
      </div>
    </header>
  );
}

/**
 * Navigation link for use in Header.
 *
 * @example
 * <NavLink href="/dashboard" active={pathname === '/dashboard'}>
 *   Dashboard
 * </NavLink>
 */
export interface NavLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  /** Link URL */
  href: string;
  /** Whether this link is currently active */
  active?: boolean;
  /** Link text */
  children: ReactNode;
}

export function NavLink({
  className,
  href,
  active = false,
  children,
  ...props
}: NavLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "px-4 py-2 rounded-md font-medium transition-colors",
        active
          ? "bg-primary text-white"
          : "text-gray-700 hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {children}
    </a>
  );
}

/**
 * Sidebar component with header, navigation, and footer sections.
 *
 * @example
 * <Sidebar
 *   header={<h2>Navigation</h2>}
 *   footer={<UserInfo />}
 * >
 *   <SidebarLink href="/sources" icon={<Folder />}>Sources</SidebarLink>
 *   <SidebarLink href="/flows" icon={<GitBranch />}>Flows</SidebarLink>
 * </Sidebar>
 */
export interface SidebarProps extends HTMLAttributes<HTMLDivElement> {
  /** Sidebar header content */
  header?: ReactNode;
  /** Sidebar footer content */
  footer?: ReactNode;
  /** Navigation links */
  children: ReactNode;
}

export function Sidebar({
  className,
  header,
  footer,
  children,
  ...props
}: SidebarProps) {
  return (
    <div className={cn("flex flex-col h-full", className)} {...props}>
      {/* Header */}
      {header && (
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          {header}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-auto">{children}</nav>

      {/* Footer */}
      {footer && (
        <div className="p-4 border-t border-gray-200 flex-shrink-0">
          {footer}
        </div>
      )}
    </div>
  );
}

/**
 * Sidebar navigation link.
 *
 * @example
 * <SidebarLink
 *   href="/sources"
 *   icon={<Folder className="w-5 h-5" />}
 *   active={pathname === '/sources'}
 * >
 *   Sources
 * </SidebarLink>
 */
export interface SidebarLinkProps extends HTMLAttributes<HTMLAnchorElement> {
  /** Link URL */
  href: string;
  /** Icon element */
  icon?: ReactNode;
  /** Whether this link is active */
  active?: boolean;
  /** Link text */
  children: ReactNode;
}

export function SidebarLink({
  className,
  href,
  icon,
  active = false,
  children,
  ...props
}: SidebarLinkProps) {
  return (
    <a
      href={href}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-colors",
        active
          ? "bg-primary/10 text-primary font-medium"
          : "text-gray-600 hover:bg-gray-100",
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
    </a>
  );
}

/**
 * Content wrapper with max width and padding.
 *
 * @example
 * <ContentContainer>
 *   <h1>Page Title</h1>
 *   <p>Content goes here</p>
 * </ContentContainer>
 */
export interface ContentContainerProps extends HTMLAttributes<HTMLDivElement> {
  /** Max width class */
  maxWidth?: string;
  /** Padding class */
  padding?: string;
  children: ReactNode;
}

export function ContentContainer({
  className,
  maxWidth = "max-w-7xl",
  padding = "p-6",
  children,
  ...props
}: ContentContainerProps) {
  return (
    <div className={cn(maxWidth, "mx-auto", padding, className)} {...props}>
      {children}
    </div>
  );
}

export default PageLayout;
