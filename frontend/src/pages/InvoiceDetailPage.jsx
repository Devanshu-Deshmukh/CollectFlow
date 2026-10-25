import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError, errorMessage } from '../lib/api'
import { activityLabel, formatDate, formatDateTime, label, money, todayISO } from '../lib/format'
import { useApi } from '../lib/useApi'
import {
  Alert,
  Button,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
  StatusBadge,
  cx,
} from '../components/ui'
import { Icon } from '../components/icons'
const methods = ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE', 'CARD', 'OTHER']
const activityOptions = [
  { value: 'CALL', label: 'Phone call' },
  { value: 'EMAIL', label: 'Email sent' },
  { value: 'WHATSAPP', label: 'WhatsApp message' },
  { value: 'MEETING', label: 'Meeting' },
  { value: 'NOTE', label: 'Note' },
  { value: 'TASK', label: 'Task / to-do' },
]
function activityTone(type) {
  switch (type) {
    case 'CALL':
      return 'bg-indigo-50 text-indigo-600'
    case 'EMAIL':
      return 'bg-sky-50 text-sky-600'
    case 'WHATSAPP':
      return 'bg-emerald-50 text-emerald-600'
    case 'TASK':
      return 'bg-amber-50 text-amber-600'
    case 'MEETING':
      return 'bg-purple-50 text-purple-600'
    default:
      return 'bg-slate-100 text-slate-600'
  }
}
export function InvoiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const [dialog, setDialog] = useState(null)
  const [flash, setFlash] = useState(null)
  const [busyFollowUp, setBusyFollowUp] = useState(null)
  const invoiceApi = useApi(id ? `/api/invoices/${id}` : null)
  const paymentsApi = useApi(id ? `/api/invoices/${id}/payments` : null)
  const followUpsApi = useApi(id ? `/api/invoices/${id}/follow-ups` : null)
  const remindersApi = useApi(id ? `/api/invoices/${id}/reminders` : null)
  const templatesApi = useApi('/api/reminder-templates')
  const membersApi = useApi('/api/business/members')
  const invoice = invoiceApi.data
  const currency = invoice?.currency ?? session?.business.currency ?? 'INR'
  function reloadAll() {
    invoiceApi.reload()
    paymentsApi.reload()
    followUpsApi.reload()
    remindersApi.reload()
  }
  async function markDone(followUp) {
    setBusyFollowUp(followUp.id)
    try {
      await api.patch(`/api/follow-ups/${followUp.id}`, { status: 'DONE' })
      followUpsApi.reload()
      invoiceApi.reload()
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err) })
    } finally {
      setBusyFollowUp(null)
    }
  }
  if (invoiceApi.loading) return <LoadingBlock message="Loading invoice…" />
  if (invoiceApi.error || !invoice) {
    return (
      <div className="space-y-4">
        <PageHeader title="Invoice" onBack={() => navigate('/invoices')} backTo="Invoices" />
        <Alert tone="error">{invoiceApi.error ?? 'Invoice not found'}</Alert>
        <Button variant="secondary" onClick={() => navigate('/invoices')}>
          Back to invoices
        </Button>
      </div>
    )
  }
  const canRecordPayment = invoice.outstandingAmount > 0
  return (
    <div className="space-y-5">
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-2">
            {invoice.invoiceNumber}
            <StatusBadge status={invoice.status} />
          </span>
        }
        description={
          <>
            {invoice.customerName} · issued {formatDate(invoice.issueDate)} · due{' '}
            {formatDate(invoice.dueDate)}
            {invoice.overdue && (
              <span className="ml-2 font-medium text-rose-600">
                {invoice.daysOverdue} days overdue
              </span>
            )}
          </>
        }
        onBack={() => navigate('/invoices')}
        backTo="Invoices"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog('followup')}>
              <Icon name="tasks" size={16} />
              Log follow-up
            </Button>
            <Button
              variant="secondary"
              onClick={() => setDialog('reminder')}
              disabled={invoice.outstandingAmount === 0}
            >
              <Icon name="bell" size={16} />
              Send reminder
            </Button>
            <Button onClick={() => setDialog('payment')} disabled={!canRecordPayment}>
              <Icon name="plus" size={16} />
              Record payment
            </Button>
          </>
        }
      />

      {flash && <Alert tone={flash.tone}>{flash.text}</Alert>}

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <section className="card overflow-hidden">
            <div className="grid grid-cols-2 divide-x divide-slate-100 border-b border-slate-100 sm:grid-cols-3">
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Total</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {money(invoice.totalAmount, currency)}
                </p>
              </div>
              <div className="p-4">
                <p className="text-xs uppercase tracking-wide text-slate-500">Paid</p>
                <p className="mt-1 text-lg font-semibold text-emerald-600">
                  {money(invoice.amountPaid, currency)}
                </p>
              </div>
              <div className="col-span-2 border-t border-slate-100 p-4 sm:col-span-1 sm:border-t-0">
                <p className="text-xs uppercase tracking-wide text-slate-500">Outstanding</p>
                <p
                  className={cx(
                    'mt-1 text-lg font-semibold',
                    invoice.outstandingAmount > 0 ? 'text-rose-600' : 'text-emerald-600',
                  )}
                >
                  {money(invoice.outstandingAmount, currency)}
                </p>
              </div>
            </div>

            {invoice.notes && (
              <p className="border-b border-slate-100 px-4 py-3 text-sm text-slate-600">
                {invoice.notes}
              </p>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th className="th">Description</th>
                    <th className="th text-right">Qty</th>
                    <th className="th text-right">Unit price</th>
                    <th className="th text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invoice.lines.map((line) => (
                    <tr key={line.id ?? line.description}>
                      <td className="td">{line.description}</td>
                      <td className="td text-right">{line.quantity}</td>
                      <td className="td text-right">{money(line.unitPrice, currency)}</td>
                      <td className="td text-right font-medium">{money(line.amount, currency)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-slate-200 bg-slate-50/60">
                    <td className="td font-medium" colSpan={3}>
                      Invoice total
                    </td>
                    <td className="td text-right font-semibold">
                      {money(invoice.totalAmount, currency)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Payments</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Every payment recorded against this invoice.
                </p>
              </div>
              {canRecordPayment && (
                <Button size="sm" variant="secondary" onClick={() => setDialog('payment')}>
                  <Icon name="plus" size={14} />
                  Add payment
                </Button>
              )}
            </div>
            {paymentsApi.loading ? (
              <p className="px-5 pb-5 text-sm text-slate-500">Loading payments…</p>
            ) : !paymentsApi.data || paymentsApi.data.length === 0 ? (
              <EmptyState
                icon="invoices"
                title="No payments yet"
                description="Payments you record will appear here."
              />
            ) : (
              <div className="overflow-x-auto border-t border-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50/70">
                    <tr>
                      <th className="th">Date</th>
                      <th className="th">Method</th>
                      <th className="th">Reference</th>
                      <th className="th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paymentsApi.data.map((payment) => (
                      <tr key={payment.id}>
                        <td className="td whitespace-nowrap">{formatDate(payment.paymentDate)}</td>
                        <td className="td">{payment.method ? label(payment.method) : '—'}</td>
                        <td className="td text-slate-500">{payment.reference ?? '—'}</td>
                        <td className="td text-right font-semibold text-emerald-600">
                          {money(payment.amount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Follow-up history</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Calls, messages and tasks tied to this invoice.
                </p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => setDialog('followup')}>
                <Icon name="plus" size={14} />
                Log activity
              </Button>
            </div>

            {followUpsApi.loading ? (
              <p className="mt-4 text-sm text-slate-500">Loading history…</p>
            ) : !followUpsApi.data || followUpsApi.data.length === 0 ? (
              <div className="mt-4">
                <EmptyState
                  icon="tasks"
                  title="No follow-ups recorded"
                  description="Log a call or message so the next person knows what has been tried."
                />
              </div>
            ) : (
              <ol className="mt-4 space-y-4">
                {followUpsApi.data.map((followUp) => {
                  const overdueTask =
                    followUp.status === 'OPEN' && followUp.dueDate && followUp.dueDate < todayISO()
                  return (
                    <li key={followUp.id} className="flex gap-3">
                      <span
                        className={cx(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                          activityTone(followUp.activityType),
                        )}
                      >
                        <Icon
                          name={followUp.activityType === 'TASK' ? 'tasks' : 'mail'}
                          size={15}
                        />
                      </span>
                      <div className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50/40 p-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                            {activityLabel(followUp.activityType)}
                          </span>
                          <StatusBadge status={followUp.status} />
                          {overdueTask && (
                            <span className="text-[11px] font-medium text-rose-600">Past due</span>
                          )}
                          <span className="ml-auto text-[11px] text-slate-400">
                            {formatDateTime(followUp.createdAt)}
                          </span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-line text-sm text-slate-700">
                          {followUp.notes}
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
                          {followUp.createdByName && <span>By {followUp.createdByName}</span>}
                          {followUp.assignedToName && (
                            <span>Assigned to {followUp.assignedToName}</span>
                          )}
                          {followUp.dueDate && <span>Due {formatDate(followUp.dueDate)}</span>}
                          {followUp.completedAt && (
                            <span>Completed {formatDateTime(followUp.completedAt)}</span>
                          )}
                          {followUp.status === 'OPEN' && (
                            <button
                              type="button"
                              onClick={() => void markDone(followUp)}
                              disabled={busyFollowUp === followUp.id}
                              className="ml-auto inline-flex items-center gap-1 font-medium text-teal-700 hover:underline disabled:opacity-50"
                            >
                              <Icon name="check" size={13} />
                              Mark done
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Customer</h2>
            <p className="mt-2 text-base font-medium text-slate-900">{invoice.customerName}</p>
            <div className="mt-2 space-y-1.5 text-sm text-slate-600">
              {invoice.customerEmail ? (
                <a
                  href={`mailto:${invoice.customerEmail}`}
                  className="flex items-center gap-2 hover:text-indigo-600"
                >
                  <Icon name="mail" size={15} className="text-slate-400" />
                  {invoice.customerEmail}
                </a>
              ) : (
                <p className="text-xs text-amber-600">
                  No email on file — reminders will be logged only.
                </p>
              )}
              {invoice.customerPhone && <p className="text-slate-500">{invoice.customerPhone}</p>}
            </div>
            <Link
              to={`/invoices?customer=${invoice.customerId}`}
              className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
            >
              All invoices for this customer <Icon name="chevronRight" size={13} />
            </Link>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-900">Reminders</h2>
              <span className="text-xs text-slate-500">{invoice.reminderCount} total</span>
            </div>
            {remindersApi.loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading…</p>
            ) : !remindersApi.data || remindersApi.data.length === 0 ? (
              <div className="mt-3">
                <p className="text-sm text-slate-500">No reminders scheduled for this invoice.</p>
                {invoice.outstandingAmount > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="mt-3"
                    onClick={() => setDialog('reminder')}
                  >
                    Send one now
                  </Button>
                )}
              </div>
            ) : (
              <ul className="mt-3 space-y-3">
                {remindersApi.data.map((reminder) => (
                  <li key={reminder.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="flex items-center justify-between gap-2">
                      <StatusBadge status={reminder.status} />
                      <span className="text-[11px] text-slate-400">
                        {reminder.sentAt
                          ? formatDateTime(reminder.sentAt)
                          : formatDateTime(reminder.scheduledAt)}
                      </span>
                    </div>
                    <p className="mt-1.5 text-xs font-medium text-slate-700">{reminder.subject}</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {reminder.sentAt ? 'Sent' : 'Scheduled'} ·{' '}
                      {reminder.templateName ?? 'Manual reminder'}
                    </p>
                    {reminder.note && (
                      <p className="mt-1 text-[11px] italic text-slate-400">{reminder.note}</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-4 text-[11px] leading-relaxed text-slate-400">
              Scheduled reminders are cancelled automatically when the invoice is fully paid.
            </p>
          </section>

          <section className="card p-5">
            <h2 className="text-sm font-semibold text-slate-900">Invoice metadata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Issued</dt>
                <dd className="text-slate-800">{formatDate(invoice.issueDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Due</dt>
                <dd className="text-slate-800">{formatDate(invoice.dueDate)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Currency</dt>
                <dd className="text-slate-800">{invoice.currency}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-slate-800">{formatDateTime(invoice.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-slate-500">Follow-ups</dt>
                <dd className="text-slate-800">{invoice.followUpCount}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>

      <PaymentModal
        open={dialog === 'payment'}
        onClose={() => setDialog(null)}
        invoice={invoice}
        onSaved={() => {
          setDialog(null)
          setFlash({ tone: 'success', text: 'Payment recorded and the balance updated.' })
          reloadAll()
        }}
      />

      <ReminderModal
        open={dialog === 'reminder'}
        onClose={() => setDialog(null)}
        invoice={invoice}
        templates={templatesApi.data ?? []}
        onSent={(message) => {
          setDialog(null)
          setFlash({ tone: 'success', text: message })
          reloadAll()
        }}
      />

      <FollowUpModal
        open={dialog === 'followup'}
        onClose={() => setDialog(null)}
        invoice={invoice}
        members={membersApi.data ?? []}
        currentUserId={session?.user.id}
        onSaved={() => {
          setDialog(null)
          setFlash({ tone: 'success', text: 'Follow-up logged.' })
          reloadAll()
        }}
      />
    </div>
  )
}
function PaymentModal({ open, onClose, invoice, onSaved }) {
  const [amount, setAmount] = useState('')
  const [paymentDate, setPaymentDate] = useState(todayISO())
  const [method, setMethod] = useState('BANK_TRANSFER')
  const [reference, setReference] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const outstanding = invoice.outstandingAmount
  async function submit(event) {
    event.preventDefault()
    setError(null)
    const value = Number.parseFloat(amount)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a payment amount greater than zero.')
      return
    }
    if (value > outstanding) {
      setError(
        `This is more than the outstanding balance of ${money(outstanding, invoice.currency)}.`,
      )
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/api/invoices/${invoice.id}/payments`, {
        amount: value,
        paymentDate,
        method,
        reference: reference.trim() || null,
        notes: notes.trim() || null,
      })
      setAmount('')
      setReference('')
      setNotes('')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not record the payment')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record payment"
      description={`${invoice.invoiceNumber} · outstanding ${money(outstanding, invoice.currency)}`}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="payment-form" loading={submitting}>
            Save payment
          </Button>
        </>
      }
    >
      <form id="payment-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" htmlFor="payment-amount">
            <input
              id="payment-amount"
              className="input"
              type="number"
              min="0.01"
              step="0.01"
              max={outstanding}
              required
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder={outstanding.toFixed(2)}
            />
          </Field>
          <Field label="Payment date" htmlFor="payment-date">
            <input
              id="payment-date"
              className="input"
              type="date"
              required
              value={paymentDate}
              onChange={(event) => setPaymentDate(event.target.value)}
            />
          </Field>
          <Field label="Method" htmlFor="payment-method">
            <select
              id="payment-method"
              className="input"
              value={method}
              onChange={(event) => setMethod(event.target.value)}
            >
              {methods.map((item) => (
                <option key={item} value={item}>
                  {label(item)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Reference" htmlFor="payment-reference">
            <input
              id="payment-reference"
              className="input"
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="UTR, UPI ref, cheque no."
              maxLength={120}
            />
          </Field>
        </div>
        <Field label="Notes" htmlFor="payment-notes">
          <textarea
            id="payment-notes"
            className="input min-h-[60px]"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={500}
          />
        </Field>
        <button
          type="button"
          className="text-xs font-medium text-teal-700 hover:underline"
          onClick={() => setAmount(String(outstanding))}
        >
          Fill full outstanding amount ({money(outstanding, invoice.currency)})
        </button>
      </form>
    </Modal>
  )
}
function ReminderModal({ open, onClose, invoice, templates, onSent }) {
  const [templateId, setTemplateId] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const activeTemplates = templates.filter((template) => template.active)
  async function send() {
    setError(null)
    setSubmitting(true)
    try {
      const reminder = await api.post(`/api/invoices/${invoice.id}/reminders`, {
        templateId: templateId ? Number(templateId) : null,
      })
      onSent(
        reminder.note
          ? `Reminder logged for ${invoice.customerName}. ${reminder.note}.`
          : `Reminder sent to ${invoice.customerName}.`,
      )
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send the reminder')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Send a payment reminder"
      description={`This sends the reminder now and adds it to the invoice history.`}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" loading={submitting} onClick={() => void send()}>
            <Icon name="mail" size={15} />
            Send reminder
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        {!invoice.customerEmail && (
          <Alert tone="warning">
            {invoice.customerName} has no email address. The reminder will be recorded but cannot be
            emailed.
          </Alert>
        )}
        <Field label="Template" htmlFor="reminder-template">
          <select
            id="reminder-template"
            className="input"
            value={templateId}
            onChange={(event) => setTemplateId(event.target.value)}
          >
            <option value="">General reminder</option>
            {activeTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </Field>
        {templateId && (
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">Subject</p>
            <p className="mt-0.5 text-sm text-slate-800">
              {templates.find((template) => String(template.id) === templateId)?.subject}
            </p>
            <p className="mt-2 text-xs font-semibold text-slate-700">Body</p>
            <pre className="mt-0.5 whitespace-pre-wrap font-sans text-xs text-slate-600">
              {templates.find((template) => String(template.id) === templateId)?.body}
            </pre>
            <p className="mt-2 text-[11px] text-slate-400">
              Placeholders are filled with this invoice&apos;s values at send time.
            </p>
          </div>
        )}
        <p className="text-xs text-slate-500">
          Reminder delivery depends on the SMTP settings configured on the server. When email
          delivery is turned off, the message is logged and marked as logged-only in the history.
        </p>
      </div>
    </Modal>
  )
}
function FollowUpModal({ open, onClose, invoice, members, currentUserId, onSaved }) {
  const [activityType, setActivityType] = useState('CALL')
  const [notes, setNotes] = useState('')
  const [assignedTo, setAssignedTo] = useState(currentUserId ? String(currentUserId) : '')
  const [dueDate, setDueDate] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const isTask = activityType === 'TASK'
  async function submit(event) {
    event.preventDefault()
    setError(null)
    if (!notes.trim()) {
      setError('Add a short note describing what happened or what needs to happen.')
      return
    }
    setSubmitting(true)
    try {
      await api.post(`/api/invoices/${invoice.id}/follow-ups`, {
        activityType,
        notes: notes.trim(),
        assignedToUserId: assignedTo ? Number(assignedTo) : null,
        dueDate: isTask && dueDate ? dueDate : null,
        status: isTask ? 'OPEN' : 'DONE',
      })
      setNotes('')
      setDueDate('')
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the follow-up')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log follow-up"
      description={`${invoice.invoiceNumber} · ${invoice.customerName}`}
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="followup-form" loading={submitting}>
            Save
          </Button>
        </>
      }
    >
      <form id="followup-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Activity" htmlFor="activity-type">
          <select
            id="activity-type"
            className="input"
            value={activityType}
            onChange={(event) => setActivityType(event.target.value)}
          >
            {activityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Notes" htmlFor="followup-notes">
          <textarea
            id="followup-notes"
            className="input min-h-[100px]"
            required
            maxLength={2000}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder="What did the customer say? What happens next?"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Assigned to" htmlFor="assigned-to" hint="Optional">
            <select
              id="assigned-to"
              className="input"
              value={assignedTo}
              onChange={(event) => setAssignedTo(event.target.value)}
            >
              <option value="">Nobody</option>
              {members.map((member) => (
                <option key={member.userId} value={member.userId}>
                  {member.name} ({member.role.toLowerCase()})
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Task due date"
            htmlFor="task-due"
            hint={isTask ? 'Shows in Tasks' : 'Only used for tasks'}
          >
            <input
              id="task-due"
              className="input"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={!isTask}
            />
          </Field>
        </div>
        <p className="text-xs text-slate-500">
          {isTask
            ? 'The task opens in Tasks and is marked done when you complete it.'
            : 'Logged as a completed activity in the invoice history.'}
        </p>
      </form>
    </Modal>
  )
}
