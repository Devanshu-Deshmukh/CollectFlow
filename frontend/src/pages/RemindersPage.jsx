import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, ApiError, errorMessage } from '../lib/api'
import { formatDateTime, triggerDescription } from '../lib/format'
import { useApi } from '../lib/useApi'
import {
  Alert,
  Badge,
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
const statusFilters = [
  { value: 'ALL', label: 'All reminders' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'SENT', label: 'Sent' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
]
export function RemindersPage() {
  const [tab, setTab] = useState('schedule')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [flash, setFlash] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const reminders = useApi('/api/reminders')
  const templates = useApi('/api/reminder-templates')
  const filteredReminders = (reminders.data ?? []).filter(
    (reminder) => statusFilter === 'ALL' || reminder.status === statusFilter,
  )
  const scheduledCount = (reminders.data ?? []).filter(
    (reminder) => reminder.status === 'SCHEDULED',
  ).length
  async function runDue() {
    setProcessing(true)
    setFlash(null)
    try {
      const result = await api.post('/api/reminders/process')
      setFlash({
        tone: 'success',
        text: `Checked the queue: ${result.remindersSent} reminder${result.remindersSent === 1 ? '' : 's'} sent, ${result.remindersScheduled} newly scheduled.`,
      })
      reminders.reload()
      templates.reload()
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err) })
    } finally {
      setProcessing(false)
    }
  }
  async function toggleTemplate(template) {
    setFlash(null)
    try {
      await api.put(`/api/reminder-templates/${template.id}`, {
        name: template.name,
        triggerType: template.triggerType,
        offsetDays: template.offsetDays,
        subject: template.subject,
        body: template.body,
        active: !template.active,
      })
      templates.reload()
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err) })
    }
  }
  async function confirmDelete() {
    if (!deleting) return
    setDeleteBusy(true)
    try {
      await api.delete(`/api/reminder-templates/${deleting.id}`)
      setDeleting(null)
      templates.reload()
      reminders.reload()
    } catch (err) {
      setFlash({ tone: 'error', text: errorMessage(err) })
    } finally {
      setDeleteBusy(false)
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reminders"
        description="Scheduled payment reminders and the templates that generate them."
        actions={
          <>
            <Button variant="secondary" onClick={() => void runDue()} loading={processing}>
              <Icon name="clock" size={16} />
              Run due reminders
            </Button>
            <Button onClick={() => setEditing('new')}>
              <Icon name="plus" size={16} />
              New template
            </Button>
          </>
        }
      />

      {flash && <Alert tone={flash.tone}>{flash.text}</Alert>}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('schedule')}
          className={cx(
            'rounded-lg border px-3 py-1.5 text-sm font-medium',
            tab === 'schedule'
              ? 'border-teal-200 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          Schedule &amp; history
          <span className="ml-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-600">
            {reminders.data?.length ?? 0}
          </span>
        </button>
        <button
          type="button"
          onClick={() => setTab('templates')}
          className={cx(
            'rounded-lg border px-3 py-1.5 text-sm font-medium',
            tab === 'templates'
              ? 'border-teal-200 bg-teal-50 text-teal-800'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
          )}
        >
          Templates
          <span className="ml-2 rounded-full bg-white/70 px-1.5 py-0.5 text-[11px] text-slate-600">
            {templates.data?.length ?? 0}
          </span>
        </button>
      </div>

      {tab === 'schedule' ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              {scheduledCount} reminder{scheduledCount === 1 ? '' : 's'} waiting to be sent. The
              daily job runs at 08:00 server time; use “Run due reminders” to process the queue now.
            </p>
            <select
              className="input w-auto"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              aria-label="Filter reminders by status"
            >
              {statusFilters.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {reminders.loading ? (
            <LoadingBlock message="Loading reminders…" />
          ) : reminders.error ? (
            <Alert tone="error">{reminders.error}</Alert>
          ) : filteredReminders.length === 0 ? (
            <EmptyState
              icon="bell"
              title="No reminders in this view"
              description="Reminders are created automatically for new invoices from your active templates."
            />
          ) : (
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="th">When</th>
                      <th className="th">Invoice</th>
                      <th className="th">Customer</th>
                      <th className="th">Template</th>
                      <th className="th">Status</th>
                      <th className="th">Subject</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredReminders.map((reminder) => (
                      <tr key={reminder.id} className="hover:bg-slate-50/60">
                        <td className="td whitespace-nowrap text-slate-500">
                          {reminder.sentAt
                            ? `Sent ${formatDateTime(reminder.sentAt)}`
                            : `Scheduled ${formatDateTime(reminder.scheduledAt)}`}
                        </td>
                        <td className="td whitespace-nowrap">
                          <Link
                            to={`/invoices/${reminder.invoiceId}`}
                            className="font-medium text-indigo-600"
                          >
                            {reminder.invoiceNumber}
                          </Link>
                        </td>
                        <td className="td">
                          <p className="text-slate-800">{reminder.customerName}</p>
                          <p className="text-xs text-slate-400">
                            {reminder.recipientEmail ?? 'No email on file'}
                          </p>
                        </td>
                        <td className="td text-slate-500">{reminder.templateName ?? 'Manual'}</td>
                        <td className="td">
                          <StatusBadge status={reminder.status} />
                          {reminder.note && (
                            <p className="mt-1 max-w-[180px] text-[11px] text-slate-400">
                              {reminder.note}
                            </p>
                          )}
                        </td>
                        <td className="td text-slate-600">{reminder.subject}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Templates define when a reminder is scheduled and what it says. Placeholders:{' '}
            <code className="rounded bg-slate-100 px-1">{'{{customerName}}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{{invoiceNumber}}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{{amount}}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{{dueDate}}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{{daysOverdue}}'}</code>{' '}
            <code className="rounded bg-slate-100 px-1">{'{{businessName}}'}</code>
          </p>

          {templates.loading ? (
            <LoadingBlock message="Loading templates…" />
          ) : templates.error ? (
            <Alert tone="error">{templates.error}</Alert>
          ) : !templates.data || templates.data.length === 0 ? (
            <EmptyState
              icon="bell"
              title="No reminder templates"
              description="Create a template so reminders are scheduled automatically for new invoices."
              action={
                <Button onClick={() => setEditing('new')}>
                  <Icon name="plus" size={16} />
                  New template
                </Button>
              }
            />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {templates.data.map((template) => (
                <div key={template.id} className="card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-sm font-semibold text-slate-900">{template.name}</h2>
                        <Badge tone={template.active ? 'emerald' : 'slate'}>
                          {template.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-slate-500">
                        {triggerDescription(template.triggerType, template.offsetDays)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setEditing(template)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggleTemplate(template)}
                        className="rounded-md px-2 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50"
                      >
                        {template.active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleting(template)}
                        className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        aria-label={`Delete ${template.name}`}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3">
                    <p className="text-xs font-medium text-slate-700">{template.subject}</p>
                    <pre className="mt-1.5 max-h-28 overflow-hidden whitespace-pre-wrap font-sans text-xs text-slate-500">
                      {template.body}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <TemplateModal
        open={editing !== null}
        template={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          templates.reload()
          reminders.reload()
        }}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete reminder template"
        description="Reminders already scheduled from this template keep their content."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deleteBusy}>
              Delete template
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Delete <span className="font-semibold text-slate-900">{deleting?.name}</span>?
        </p>
      </Modal>
    </div>
  )
}
function TemplateModal({ open, template, onClose, onSaved }) {
  const [form, setForm] = useState({
    name: '',
    triggerType: 'BEFORE_DUE',
    offsetDays: '3',
    subject: '',
    body: '',
    active: true,
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      template
        ? {
            name: template.name,
            triggerType: template.triggerType,
            offsetDays: String(template.offsetDays),
            subject: template.subject,
            body: template.body,
            active: template.active,
          }
        : {
            name: '',
            triggerType: 'BEFORE_DUE',
            offsetDays: '3',
            subject: 'Invoice {{invoiceNumber}} is due on {{dueDate}}',
            body: 'Hello {{customerName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for {{amount}} is due on {{dueDate}}.\n\nThank you,\n{{businessName}}',
            active: true,
          },
    )
  }, [open, template])
  const preview = form.body
    .replaceAll('{{customerName}}', 'Northstar Logistics')
    .replaceAll('{{invoiceNumber}}', 'INV-2026-0001')
    .replaceAll('{{amount}}', '₹1,18,000.00')
    .replaceAll('{{dueDate}}', '31 Oct 2026')
    .replaceAll('{{issueDate}}', '1 Oct 2026')
    .replaceAll('{{daysOverdue}}', '7')
    .replaceAll('{{businessName}}', 'Meridian Design Studio')
    .replaceAll('{{currency}}', 'INR')
  async function submit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        triggerType: form.triggerType,
        offsetDays: Number.parseInt(form.offsetDays, 10) || 0,
        subject: form.subject,
        body: form.body,
        active: form.active,
      }
      if (template) {
        await api.put(`/api/reminder-templates/${template.id}`, payload)
      } else {
        await api.post('/api/reminder-templates', payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the template')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={template ? 'Edit reminder template' : 'New reminder template'}
      description="Choose when the reminder goes out and write the message."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="template-form" loading={submitting}>
            {template ? 'Save template' : 'Create template'}
          </Button>
        </>
      }
    >
      <form id="template-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Template name" htmlFor="template-name">
          <input
            id="template-name"
            className="input"
            required
            maxLength={120}
            value={form.name}
            onChange={(event) => setForm({ ...form, name: event.target.value })}
            placeholder="Overdue follow-up"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Send" htmlFor="template-trigger">
            <select
              id="template-trigger"
              className="input"
              value={form.triggerType}
              onChange={(event) => setForm({ ...form, triggerType: event.target.value })}
            >
              <option value="BEFORE_DUE">Before the due date</option>
              <option value="ON_DUE">On the due date</option>
              <option value="AFTER_DUE">After the due date</option>
            </select>
          </Field>
          <Field
            label="Days"
            htmlFor="template-offset"
            hint={
              form.triggerType === 'ON_DUE' ? 'Not used when sending on the due date' : undefined
            }
          >
            <input
              id="template-offset"
              className="input"
              type="number"
              min="0"
              max="365"
              value={form.offsetDays}
              onChange={(event) => setForm({ ...form, offsetDays: event.target.value })}
              disabled={form.triggerType === 'ON_DUE'}
            />
          </Field>
        </div>

        <Field label="Subject" htmlFor="template-subject">
          <input
            id="template-subject"
            className="input"
            required
            maxLength={250}
            value={form.subject}
            onChange={(event) => setForm({ ...form, subject: event.target.value })}
          />
        </Field>

        <Field label="Body" htmlFor="template-body">
          <textarea
            id="template-body"
            className="input min-h-[160px] font-mono text-xs"
            required
            value={form.body}
            onChange={(event) => setForm({ ...form, body: event.target.value })}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            checked={form.active}
            onChange={(event) => setForm({ ...form, active: event.target.checked })}
          />
          Active — schedule this reminder for new invoices
        </label>

        <div>
          <p className="label">Preview</p>
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-semibold text-slate-700">
              {form.subject
                .replaceAll('{{customerName}}', 'Northstar Logistics')
                .replaceAll('{{invoiceNumber}}', 'INV-2026-0001')
                .replaceAll('{{amount}}', '₹1,18,000.00')
                .replaceAll('{{dueDate}}', '31 Oct 2026')
                .replaceAll('{{daysOverdue}}', '7')
                .replaceAll('{{businessName}}', 'Meridian Design Studio')}
            </p>
            <pre className="mt-1.5 whitespace-pre-wrap font-sans text-xs text-slate-500">
              {preview}
            </pre>
          </div>
        </div>
      </form>
    </Modal>
  )
}
