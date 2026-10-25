import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError, errorMessage } from '../lib/api'
import { money } from '../lib/format'
import { useApi } from '../lib/useApi'
import {
  Alert,
  Avatar,
  Button,
  EmptyState,
  Field,
  LoadingBlock,
  Modal,
  PageHeader,
} from '../components/ui'
import { Icon } from '../components/icons'
const emptyForm = { name: '', email: '', phone: '', company: '', notes: '' }
export function CustomersPage() {
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [deleteError, setDeleteError] = useState(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(search.trim()), 350)
    return () => window.clearTimeout(timer)
  }, [search])
  const { data, loading, error, reload } = useApi(
    `/api/customers${query ? `?q=${encodeURIComponent(query)}` : ''}`,
  )
  const currency = session?.business.currency ?? 'INR'
  const totalOutstanding = (data ?? []).reduce((sum, customer) => sum + customer.outstanding, 0)
  async function confirmDelete() {
    if (!deleting) return
    setDeletingBusy(true)
    setDeleteError(null)
    try {
      await api.delete(`/api/customers/${deleting.id}`)
      setDeleting(null)
      reload()
    } catch (err) {
      setDeleteError(errorMessage(err))
    } finally {
      setDeletingBusy(false)
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Customers"
        description="The businesses you invoice, with their current outstanding balance."
        actions={
          <Button onClick={() => setEditing('new')}>
            <Icon name="plus" size={16} />
            Add customer
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
        <div className="relative max-w-md">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
            <Icon name="search" size={16} />
          </span>
          <input
            className="input pl-9"
            placeholder="Search by name, company or email"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label="Search customers"
          />
        </div>
        <p className="text-xs text-slate-500">
          {data?.length ?? 0} customer{(data?.length ?? 0) === 1 ? '' : 's'} ·{' '}
          <span className="font-semibold text-slate-800">{money(totalOutstanding, currency)}</span>{' '}
          outstanding
        </p>
      </div>

      {loading ? (
        <LoadingBlock message="Loading customers…" />
      ) : error ? (
        <div className="space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="customers"
          title={query ? 'No customers match that search' : 'No customers yet'}
          description={
            query
              ? 'Try a shorter search term.'
              : 'Add the businesses you invoice. Invoices are always linked to a customer.'
          }
          action={
            query ? (
              <Button variant="secondary" onClick={() => setSearch('')}>
                Clear search
              </Button>
            ) : (
              <Button onClick={() => setEditing('new')}>
                <Icon name="plus" size={16} />
                Add your first customer
              </Button>
            )
          }
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">Customer</th>
                  <th className="th">Contact</th>
                  <th className="th text-right">Invoices</th>
                  <th className="th text-right">Overdue</th>
                  <th className="th text-right">Outstanding</th>
                  <th className="th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/60">
                    <td className="td">
                      <div className="flex items-center gap-3">
                        <Avatar name={customer.name} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">{customer.name}</p>
                          {customer.company && customer.company !== customer.name && (
                            <p className="truncate text-xs text-slate-500">{customer.company}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="td">
                      <p className="text-sm text-slate-700">{customer.email ?? '—'}</p>
                      {customer.phone && <p className="text-xs text-slate-500">{customer.phone}</p>}
                    </td>
                    <td className="td text-right">{customer.invoiceCount}</td>
                    <td className="td text-right">
                      {customer.overdueCount > 0 ? (
                        <span className="font-medium text-rose-600">{customer.overdueCount}</span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>
                    <td className="td text-right font-semibold">
                      {money(customer.outstanding, currency)}
                    </td>
                    <td className="td">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          to={`/invoices?customer=${customer.id}`}
                          className="rounded-md px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                        >
                          Invoices
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditing(customer)}
                          className="rounded-md px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setDeleteError(null)
                            setDeleting(customer)
                          }}
                          className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          aria-label={`Delete ${customer.name}`}
                        >
                          <Icon name="close" size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <CustomerModal
        open={editing !== null}
        customer={editing === 'new' ? null : editing}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null)
          reload()
        }}
      />

      <Modal
        open={deleting !== null}
        onClose={() => setDeleting(null)}
        title="Delete customer"
        description="Customers with invoices cannot be deleted, to keep the history intact."
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={() => void confirmDelete()} loading={deletingBusy}>
              Delete customer
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          {deleteError && <Alert tone="error">{deleteError}</Alert>}
          <p className="text-sm text-slate-600">
            Delete <span className="font-semibold text-slate-900">{deleting?.name}</span>? This
            cannot be undone.
          </p>
          <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
            <Avatar name={deleting?.name ?? ''} size={26} />
            {deleting?.email ?? 'No email on file'}
          </div>
        </div>
      </Modal>
    </div>
  )
}
function CustomerModal({ open, customer, onClose, onSaved }) {
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    if (!open) return
    setError(null)
    setForm(
      customer
        ? {
            name: customer.name,
            email: customer.email ?? '',
            phone: customer.phone ?? '',
            company: customer.company ?? '',
            notes: customer.notes ?? '',
          }
        : emptyForm,
    )
  }, [open, customer])
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }
  async function submit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const payload = {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        notes: form.notes.trim() || null,
      }
      if (customer) {
        await api.put(`/api/customers/${customer.id}`, payload)
      } else {
        await api.post('/api/customers', payload)
      }
      onSaved()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the customer')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={customer ? 'Edit customer' : 'Add customer'}
      description="Contact details are used on reminders and when you follow up."
      footer={
        <>
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form="customer-form" loading={submitting}>
            {customer ? 'Save changes' : 'Add customer'}
          </Button>
        </>
      }
    >
      <form id="customer-form" onSubmit={submit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}
        <Field label="Customer name" htmlFor="customer-name">
          <input
            id="customer-name"
            className="input"
            required
            maxLength={160}
            value={form.name}
            onChange={(event) => update('name', event.target.value)}
            placeholder="Northstar Logistics"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Email" htmlFor="customer-email">
            <input
              id="customer-email"
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              placeholder="accounts@customer.in"
            />
          </Field>
          <Field label="Phone" htmlFor="customer-phone">
            <input
              id="customer-phone"
              className="input"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              placeholder="+91 98450 00000"
            />
          </Field>
        </div>
        <Field label="Company" htmlFor="customer-company" hint="Shown under the customer name">
          <input
            id="customer-company"
            className="input"
            value={form.company}
            onChange={(event) => update('company', event.target.value)}
            placeholder="Northstar Logistics Pvt Ltd"
          />
        </Field>
        <Field label="Notes" htmlFor="customer-notes">
          <textarea
            id="customer-notes"
            className="input min-h-[70px]"
            value={form.notes}
            onChange={(event) => update('notes', event.target.value)}
            maxLength={1000}
            placeholder="Payment terms, AP contact, anything worth remembering."
          />
        </Field>
      </form>
    </Modal>
  )
}
