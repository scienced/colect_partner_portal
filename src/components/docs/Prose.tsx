import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Info, AlertTriangle, Lightbulb, ShieldCheck } from "lucide-react"

/**
 * Typography primitives for the /docs pages. Bespoke, not @tailwindcss/typography
 * — so we can shape the visual hierarchy precisely (endpoint blocks, callouts,
 * method badges) and keep the dependency surface lean.
 */

export function H1({ children }: { children: ReactNode }) {
  return (
    <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight mb-3">
      {children}
    </h1>
  )
}

export function Lede({ children }: { children: ReactNode }) {
  return (
    <p className="text-lg text-gray-600 leading-relaxed mb-12 max-w-2xl">
      {children}
    </p>
  )
}

export function H2({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-20 text-2xl font-semibold text-gray-900 tracking-tight mt-16 mb-4 pb-2 border-b border-gray-200"
    >
      {children}
    </h2>
  )
}

export function H3({ id, children }: { id?: string; children: ReactNode }) {
  return (
    <h3
      id={id}
      className="scroll-mt-20 text-lg font-semibold text-gray-900 mt-8 mb-3"
    >
      {children}
    </h3>
  )
}

export function P({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[15px] text-gray-700 leading-relaxed mb-4", className)}>
      {children}
    </p>
  )
}

export function A({
  href,
  children,
  external,
}: {
  href: string
  children: ReactNode
  external?: boolean
}) {
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary"
    >
      {children}
    </a>
  )
}

export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="font-mono text-[0.9em] bg-gray-100 text-gray-900 px-1.5 py-0.5 rounded">
      {children}
    </code>
  )
}

/**
 * Code block. Use either as `<Pre>{`code text`}</Pre>` (string) or with a
 * `language` for label/tinting (purely cosmetic — no syntax highlighting).
 */
export function Pre({
  children,
  language,
}: {
  children: ReactNode
  language?: string
}) {
  return (
    <div className="my-5 rounded-lg overflow-hidden border border-gray-800">
      {language && (
        <div className="flex items-center justify-between bg-gray-800 text-gray-300 text-xs font-medium px-4 py-2">
          <span className="uppercase tracking-wide">{language}</span>
        </div>
      )}
      <pre className="bg-gray-900 text-gray-100 font-mono text-[13.5px] leading-relaxed p-4 overflow-x-auto whitespace-pre">
        <code>{children}</code>
      </pre>
    </div>
  )
}

export function Ul({ children }: { children: ReactNode }) {
  return (
    <ul className="list-disc pl-6 my-4 space-y-2 text-[15px] text-gray-700 leading-relaxed marker:text-gray-400">
      {children}
    </ul>
  )
}

export function Ol({ children }: { children: ReactNode }) {
  return (
    <ol className="list-decimal pl-6 my-4 space-y-3 text-[15px] text-gray-700 leading-relaxed marker:text-gray-500 marker:font-semibold">
      {children}
    </ol>
  )
}

export function Li({ children }: { children: ReactNode }) {
  return <li className="leading-relaxed">{children}</li>
}

type CalloutType = "info" | "warn" | "tip" | "trust"

const calloutStyles: Record<
  CalloutType,
  { container: string; icon: ReactNode; title: string }
> = {
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-900",
    icon: <Info className="w-5 h-5 text-blue-700 flex-shrink-0 mt-0.5" />,
    title: "text-blue-900",
  },
  warn: {
    container: "border-amber-200 bg-amber-50 text-amber-900",
    icon: <AlertTriangle className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" />,
    title: "text-amber-900",
  },
  tip: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-900",
    icon: <Lightbulb className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" />,
    title: "text-emerald-900",
  },
  trust: {
    container: "border-primary/30 bg-primary/5 text-gray-900",
    icon: <ShieldCheck className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />,
    title: "text-gray-900",
  },
}

export function Callout({
  type = "info",
  title,
  children,
}: {
  type?: CalloutType
  title?: string
  children: ReactNode
}) {
  const s = calloutStyles[type]
  return (
    <div className={cn("my-6 rounded-lg border p-4 flex gap-3", s.container)}>
      {s.icon}
      <div className="text-[15px] leading-relaxed">
        {title && <div className={cn("font-semibold mb-1", s.title)}>{title}</div>}
        {children}
      </div>
    </div>
  )
}

/** HTTP method badge. */
export function Method({ method }: { method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH" }) {
  const colors: Record<typeof method, string> = {
    GET: "bg-emerald-100 text-emerald-800 border-emerald-200",
    POST: "bg-indigo-100 text-indigo-800 border-indigo-200",
    DELETE: "bg-red-100 text-red-800 border-red-200",
    PUT: "bg-amber-100 text-amber-800 border-amber-200",
    PATCH: "bg-amber-100 text-amber-800 border-amber-200",
  }
  return (
    <span
      className={cn(
        "inline-flex items-center font-mono text-xs font-bold px-2 py-1 rounded border tracking-wide",
        colors[method]
      )}
    >
      {method}
    </span>
  )
}

/**
 * Endpoint reference block. Each endpoint gets its own visually distinct card
 * with method badge, path, description, and example.
 */
export function Endpoint({
  id,
  method,
  path,
  children,
}: {
  id: string
  method: "GET" | "POST" | "DELETE" | "PUT" | "PATCH"
  path: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      className="scroll-mt-20 my-8 rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden"
    >
      <header className="flex items-center gap-3 px-5 py-3 border-b border-gray-200 bg-gray-50">
        <Method method={method} />
        <code className="font-mono text-[15px] text-gray-900 break-all">{path}</code>
      </header>
      <div className="px-5 py-5">{children}</div>
    </section>
  )
}

/** Small two-column param table for endpoint query strings. */
export function ParamTable({
  rows,
}: {
  rows: { name: string; type: string; required?: boolean; description: ReactNode }[]
}) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-[14px] border-collapse">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-medium">Name</th>
            <th className="py-2 pr-4 font-medium">Type</th>
            <th className="py-2 font-medium">Description</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-gray-100 align-top">
              <td className="py-2.5 pr-4 font-mono text-gray-900">
                {r.name}
                {r.required && <span className="text-red-600 ml-1">*</span>}
              </td>
              <td className="py-2.5 pr-4 text-gray-600 font-mono text-[13px]">{r.type}</td>
              <td className="py-2.5 text-gray-700 leading-relaxed">{r.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-500 mt-1">
        <span className="text-red-600">*</span> required
      </p>
    </div>
  )
}

/** Compact horizontal table for things like error codes. */
export function StatusTable({
  rows,
}: {
  rows: { status: string; code: string; meaning: string }[]
}) {
  return (
    <div className="my-4 overflow-x-auto">
      <table className="w-full text-[14px] border-collapse">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-200">
            <th className="py-2 pr-4 font-medium">Status</th>
            <th className="py-2 pr-4 font-medium">Code</th>
            <th className="py-2 font-medium">When</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.status} className="border-b border-gray-100">
              <td className="py-2.5 pr-4 font-mono font-semibold text-gray-900">{r.status}</td>
              <td className="py-2.5 pr-4 font-mono text-gray-700">{r.code}</td>
              <td className="py-2.5 text-gray-700">{r.meaning}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** A row of "card" links — used on the docs index. */
export function CardGrid({ children }: { children: ReactNode }) {
  return <div className="grid sm:grid-cols-2 gap-4 my-8">{children}</div>
}

export function CardLink({
  href,
  icon,
  title,
  description,
}: {
  href: string
  icon: ReactNode
  title: string
  description: ReactNode
}) {
  return (
    <a
      href={href}
      className="block p-5 rounded-lg border border-gray-200 bg-white hover:border-primary hover:shadow-sm transition"
    >
      <div className="text-primary mb-2">{icon}</div>
      <div className="font-semibold text-gray-900">{title}</div>
      <p className="text-sm text-gray-600 mt-1 leading-relaxed">{description}</p>
    </a>
  )
}
