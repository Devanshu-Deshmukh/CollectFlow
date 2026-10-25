export function money(amount, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount ?? 0)
}
export function compactMoney(amount, currency = 'INR') {
  const value = amount ?? 0
  if (Math.abs(value) >= 10000000) {
    return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value / 10000000)} Cr`
  }
  if (Math.abs(value) >= 100000) {
    return `${new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 }).format(value / 100000)} L`
  }
  return money(value, currency)
}
export function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date)
}
export function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
export function todayISO() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60000).toISOString().slice(0, 10)
}
export function addDaysISO(days) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  const offset = date.getTimezoneOffset()
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10)
}
export function daysBetween(fromISO, toISO) {
  const from = new Date(`${fromISO}T00:00:00`).getTime()
  const to = new Date(`${toISO}T00:00:00`).getTime()
  return Math.round((to - from) / 86400000)
}
export const STATUS_LABELS = {
  PENDING: 'Pending',
  PARTIALLY_PAID: 'Partially paid',
  PAID: 'Paid',
  OVERDUE: 'Overdue',
  SCHEDULED: 'Scheduled',
  SENT: 'Sent',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
  OPEN: 'Open',
  DONE: 'Done',
  BANK_TRANSFER: 'Bank transfer',
  UPI: 'UPI',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
  CARD: 'Card',
  OTHER: 'Other',
}
export function label(value) {
  if (!value) return '—'
  return STATUS_LABELS[value] ?? value.charAt(0) + value.slice(1).toLowerCase().replaceAll('_', ' ')
}
export function initials(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}
export function triggerDescription(trigger, offset) {
  if (trigger === 'BEFORE_DUE') return `${offset} day${offset === 1 ? '' : 's'} before due`
  if (trigger === 'ON_DUE') return 'On the due date'
  return `${offset} day${offset === 1 ? '' : 's'} after due`
}
export function activityLabel(type) {
  const map = {
    CALL: 'Phone call',
    EMAIL: 'Email',
    WHATSAPP: 'WhatsApp',
    MEETING: 'Meeting',
    NOTE: 'Note',
    TASK: 'Task',
  }
  return map[type] ?? label(type)
}
