import { useEffect } from 'react'
import { Icon } from './icons'
import { label } from '../lib/format'
export function cx(...values) {
  return values.filter(Boolean).join(' ')
}
const buttonStyles = {
  primary:
    'bg-teal-700 text-white hover:bg-teal-800 focus-visible:ring-teal-300 shadow-sm disabled:bg-teal-300',
  secondary:
    'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 focus-visible:ring-slate-200 disabled:text-slate-400',
  ghost: 'text-slate-600 hover:bg-slate-100 focus-visible:ring-slate-200',
  danger:
    'bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-200 disabled:bg-rose-300',
}
export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed',
        size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm',
        buttonStyles[variant],
        className,
      )}
    >
      {loading && <Spinner size={14} />}
      {children}
    </button>
  )
}
const badgeTones = {
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  sky: 'bg-sky-50 text-sky-700 ring-sky-200',
}
export function Badge({ tone = 'slate', children }) {
  return (
    <span
      className={cx(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        badgeTones[tone],
      )}
    >
      {children}
    </span>
  )
}
const statusTones = {
  PAID: 'emerald',
  SENT: 'emerald',
  DONE: 'emerald',
  PENDING: 'indigo',
  SCHEDULED: 'sky',
  PARTIALLY_PAID: 'amber',
  OPEN: 'amber',
  OVERDUE: 'rose',
  FAILED: 'rose',
  CANCELLED: 'slate',
}
export function StatusBadge({ status }) {
  return <Badge tone={statusTones[status] ?? 'slate'}>{label(status)}</Badge>
}
export function Spinner({ size = 20 }) {
  return (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" className="opacity-20" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
export function LoadingBlock({ message = 'Loading…' }) {
  return (
    <div className="flex items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white py-16 text-sm text-slate-500">
      <Spinner />
      {message}
    </div>
  )
}
export function Field({ label: text, htmlFor, error, hint, className, children }) {
  return (
    <div className={className}>
      <label className="label" htmlFor={htmlFor}>
        {text}
      </label>
      {children}
      {hint && !error && <p className="mt-1 text-xs text-slate-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}
const alertStyles = {
  error: 'border-rose-200 bg-rose-50 text-rose-800',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  info: 'border-sky-200 bg-sky-50 text-sky-800',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}
export function Alert({ tone = 'info', children }) {
  return (
    <div
      className={cx(
        'flex items-start gap-2 rounded-lg border px-3 py-2 text-sm',
        alertStyles[tone],
      )}
    >
      <Icon
        name={
          tone === 'success' ? 'check' : tone === 'error' || tone === 'warning' ? 'alert' : 'clock'
        }
        size={16}
        className="mt-0.5 shrink-0"
      />
      <div className="min-w-0">{children}</div>
    </div>
  )
}
export function PageHeader({ title, description, actions, backTo, onBack }) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-800"
          >
            <Icon name="arrowLeft" size={14} />
            {backTo ?? 'Back'}
          </button>
        )}
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
export function EmptyState({ title, description, action, icon = 'invoices' }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
        <Icon name={icon} size={20} />
      </span>
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {description && <p className="mt-1 max-w-md text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
export function Modal({ open, onClose, title, description, children, footer, wide }) {
  useEffect(() => {
    if (!open) return
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = ''
    }
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cx(
          'relative z-10 flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-xl sm:rounded-2xl',
          wide ? 'sm:max-w-2xl' : 'sm:max-w-lg',
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="flex justify-end gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
export function StatCard({ label: title, value, hint, tone = 'slate', icon }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
        {icon && (
          <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}>
            <Icon name={icon} size={16} />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}
export function Avatar({ name, size = 32 }) {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  const text = parts.map((part) => part[0]?.toUpperCase()).join('')
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full bg-indigo-100 font-semibold text-indigo-700"
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-hidden="true"
    >
      {text}
    </span>
  )
}
