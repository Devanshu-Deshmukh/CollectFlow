import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, ApiError } from '../lib/api'
import { addDaysISO, money, todayISO } from '../lib/format'
import { useApi } from '../lib/useApi'
import { Alert, Button, Field, LoadingBlock, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'
let lineKey = 1
const newLine = () => ({ key: lineKey++, description: '', quantity: '1', unitPrice: '' })
export function NewInvoicePage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const customersApi = useApi('/api/customers')
  const nextNumberApi = useApi('/api/invoices/next-number')
  const [customerId, setCustomerId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [issueDate, setIssueDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState(addDaysISO(30))
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([newLine()])
  const [error, setError] = useState(null)
  const [fieldErrors, setFieldErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  useEffect(() => {
    if (nextNumberApi.data && !invoiceNumber) {
      setInvoiceNumber(nextNumberApi.data.invoiceNumber)
    }
  }, [nextNumberApi.data, invoiceNumber])
  useEffect(() => {
    if (!customerId && customersApi.data && customersApi.data.length === 1) {
      setCustomerId(String(customersApi.data[0].id))
    }
  }, [customersApi.data, customerId])
  const currency = session?.business.currency ?? 'INR'
  const computedLines = lines.map((line) => {
    const quantity = Number.parseFloat(line.quantity)
    const unitPrice = Number.parseFloat(line.unitPrice)
    const amount =
      Number.isFinite(quantity) && Number.isFinite(unitPrice) ? quantity * unitPrice : 0
    return { ...line, amount }
  })
  const total = computedLines.reduce((sum, line) => sum + line.amount, 0)
  function updateLine(key, patch) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)))
  }
  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setFieldErrors({})
    if (!customerId) {
      setError('Choose the customer this invoice belongs to.')
      return
    }
    const payloadLines = computedLines
      .filter((line) => line.description.trim() && line.unitPrice.trim())
      .map((line) => ({
        description: line.description.trim(),
        quantity: Number.parseFloat(line.quantity) || 0,
        unitPrice: Number.parseFloat(line.unitPrice) || 0,
      }))
    if (payloadLines.length === 0) {
      setError('Add at least one line item with a description and amount.')
      return
    }
    if (payloadLines.some((line) => line.quantity <= 0 || line.unitPrice <= 0)) {
      setError('Each line needs a quantity and a unit price greater than zero.')
      return
    }
    setSubmitting(true)
    try {
      const created = await api.post('/api/invoices', {
        customerId: Number(customerId),
        invoiceNumber: invoiceNumber.trim() || null,
        issueDate,
        dueDate,
        notes: notes.trim() || null,
        lines: payloadLines,
      })
      navigate(`/invoices/${created.id}`, { replace: true })
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message)
        setFieldErrors(err.fieldErrors ?? {})
      } else {
        setError('Could not create the invoice')
      }
    } finally {
      setSubmitting(false)
    }
  }
  if (customersApi.loading) return <LoadingBlock message="Preparing the invoice form…" />
  return (
    <div className="space-y-5">
      <PageHeader
        title="New invoice"
        description="Record an invoice and its due date so it appears in receivables immediately."
        onBack={() => navigate('/invoices')}
        backTo="Invoices"
      />

      {customersApi.error && <Alert tone="error">{customersApi.error}</Alert>}

      {!customersApi.data || customersApi.data.length === 0 ? (
        <div className="card p-6">
          <Alert tone="warning">
            Add a customer before creating an invoice.{' '}
            <Link to="/customers" className="font-semibold underline underline-offset-2">
              Go to customers
            </Link>
          </Alert>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="grid items-start gap-5 lg:grid-cols-3">
          <div className="space-y-5 lg:col-span-2">
            {error && <Alert tone="error">{error}</Alert>}

            <section className="card p-5">
              <h2 className="text-sm font-semibold text-slate-900">Invoice details</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <Field label="Customer" htmlFor="customer" className="sm:col-span-2">
                  <select
                    id="customer"
                    className="input"
                    value={customerId}
                    onChange={(event) => setCustomerId(event.target.value)}
                    required
                  >
                    <option value="">Select a customer</option>
                    {(customersApi.data ?? []).map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                        {customer.outstanding > 0
                          ? ` · ${money(customer.outstanding, currency)} outstanding`
                          : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field
                  label="Invoice number"
                  htmlFor="invoiceNumber"
                  error={fieldErrors.invoiceNumber}
                >
                  <input
                    id="invoiceNumber"
                    className="input"
                    value={invoiceNumber}
                    maxLength={40}
                    onChange={(event) => setInvoiceNumber(event.target.value)}
                    placeholder="Auto-generated"
                  />
                </Field>

                <div className="hidden sm:block" />

                <Field label="Issue date" htmlFor="issueDate" error={fieldErrors.issueDate}>
                  <input
                    id="issueDate"
                    className="input"
                    type="date"
                    value={issueDate}
                    onChange={(event) => setIssueDate(event.target.value)}
                    required
                  />
                </Field>

                <Field label="Due date" htmlFor="dueDate" error={fieldErrors.dueDate}>
                  <input
                    id="dueDate"
                    className="input"
                    type="date"
                    value={dueDate}
                    min={issueDate}
                    onChange={(event) => setDueDate(event.target.value)}
                    required
                  />
                </Field>

                <Field label="Notes (optional)" htmlFor="notes" className="sm:col-span-2">
                  <textarea
                    id="notes"
                    className="input min-h-[70px]"
                    value={notes}
                    maxLength={1000}
                    onChange={(event) => setNotes(event.target.value)}
                    placeholder="Purchase order reference, scope summary, payment terms…"
                  />
                </Field>
              </div>
            </section>

            <section className="card p-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Line items</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    What the customer is being billed for.
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setLines((c) => [...c, newLine()])}
                >
                  <Icon name="plus" size={14} />
                  Add line
                </Button>
              </div>

              {fieldErrors.lines && (
                <p className="mt-3 text-xs text-rose-600">{fieldErrors.lines}</p>
              )}

              <div className="mt-4 space-y-3">
                <div className="hidden grid-cols-[1fr_88px_130px_110px_32px] gap-2 text-[11px] font-medium uppercase tracking-wide text-slate-400 sm:grid">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Unit price</span>
                  <span className="text-right">Amount</span>
                  <span />
                </div>
                {computedLines.map((line, index) => (
                  <div
                    key={line.key}
                    className="grid gap-2 rounded-lg border border-slate-200 p-2 sm:grid-cols-[1fr_88px_130px_110px_32px] sm:items-center sm:border-0 sm:p-0"
                  >
                    <input
                      className="input"
                      value={line.description}
                      onChange={(event) =>
                        updateLine(line.key, { description: event.target.value })
                      }
                      placeholder={`Item ${index + 1} description`}
                      aria-label="Line description"
                      maxLength={300}
                    />
                    <input
                      className="input"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={line.quantity}
                      onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                      aria-label="Quantity"
                    />
                    <input
                      className="input"
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                      placeholder="0.00"
                      aria-label="Unit price"
                    />
                    <span className="px-1 text-right text-sm font-medium text-slate-700 sm:px-0">
                      {money(line.amount, currency)}
                    </span>
                    <button
                      type="button"
                      aria-label="Remove line"
                      onClick={() =>
                        setLines((current) =>
                          current.length > 1 ? current.filter((l) => l.key !== line.key) : current,
                        )
                      }
                      className="justify-self-end rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-40"
                      disabled={lines.length === 1}
                    >
                      <Icon name="close" size={15} />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <aside className="card sticky top-20 p-5">
            <h2 className="text-sm font-semibold text-slate-900">Summary</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Line items</dt>
                <dd className="text-slate-900">
                  {computedLines.filter((line) => line.amount > 0).length}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="text-slate-900">{money(total, currency)}</dd>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-3 text-base">
                <dt className="font-medium text-slate-900">Total</dt>
                <dd className="font-semibold text-slate-900">{money(total, currency)}</dd>
              </div>
            </dl>
            <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
              Reminder emails are scheduled automatically from your active templates once the
              invoice is created.
            </p>
            <Button type="submit" className="mt-4 w-full" loading={submitting}>
              Create invoice
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 w-full"
              onClick={() => navigate('/invoices')}
            >
              Cancel
            </Button>
          </aside>
        </form>
      )}
    </div>
  )
}
