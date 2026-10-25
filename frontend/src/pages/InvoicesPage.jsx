import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { formatDate, money } from '../lib/format'
import { useApi } from '../lib/useApi'
import { useAuth } from '../auth/AuthContext'
import {
  Alert,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatusBadge,
  cx,
} from '../components/ui'
import { Icon } from '../components/icons'
const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PARTIALLY_PAID', label: 'Partially paid' },
  { value: 'OVERDUE', label: 'Overdue' },
  { value: 'PAID', label: 'Paid' },
]
export function InvoicesPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const status = searchParams.get('status') ?? ''
  const customerId = searchParams.get('customer') ?? ''
  const overdueOnly = searchParams.get('overdue') === 'true'
  const query = searchParams.get('q') ?? ''
  const [search, setSearch] = useState(query)
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const customersApi = useApi('/api/customers')
  useEffect(() => {
    if (search === query) return
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams)
      if (search.trim()) next.set('q', search.trim())
      else next.delete('q')
      setSearchParams(next, { replace: true })
    }, 350)
    return () => window.clearTimeout(timer)
  }, [search, query, searchParams, setSearchParams])
  useEffect(() => {
    setSearch(query)
  }, [query])
  const path = useMemo(() => {
    const params = new URLSearchParams()
    if (status) params.set('status', status)
    if (customerId) params.set('customer', customerId)
    if (overdueOnly) params.set('overdue', 'true')
    if (query) params.set('q', query)
    const suffix = params.toString()
    return `/api/invoices${suffix ? `?${suffix}` : ''}`
  }, [status, customerId, overdueOnly, query])
  const { data, loading, error, reload } = useApi(path)
  const currency = session?.business.currency ?? 'INR'
  const filteredOutstanding = (data ?? []).reduce(
    (sum, invoice) => sum + invoice.outstandingAmount,
    0,
  )
  const hasFilters = Boolean(status || customerId || overdueOnly || query)
  const selectedCustomer = customersApi.data?.find((customer) => String(customer.id) === customerId)
  function updateParam(key, value) {
    const next = new URLSearchParams(searchParams)
    if (value) next.set(key, value)
    else next.delete(key)
    setSearchParams(next)
  }
  async function exportCsv() {
    setExporting(true)
    setExportError(null)
    try {
      await api.download('/api/export/invoices.csv', 'collectflow-invoices.csv')
    } catch (err) {
      setExportError(errorMessage(err))
    } finally {
      setExporting(false)
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader
        title="Invoices"
        description="Every invoice, its due date and what is still outstanding."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv} loading={exporting}>
              <Icon name="download" size={16} />
              Export CSV
            </Button>
            <Button onClick={() => navigate('/invoices/new')}>
              <Icon name="plus" size={16} />
              New invoice
            </Button>
          </>
        }
      />

      {exportError && <Alert tone="error">{exportError}</Alert>}

      <div className="card p-4">
        <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_auto]">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
              <Icon name="search" size={16} />
            </span>
            <input
              className="input pl-9"
              placeholder="Search invoice number or customer"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search invoices"
            />
          </div>

          <select
            className="input"
            value={status}
            onChange={(event) => updateParam('status', event.target.value)}
            aria-label="Filter by status"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <select
            className="input"
            value={customerId}
            onChange={(event) => updateParam('customer', event.target.value)}
            aria-label="Filter by customer"
          >
            <option value="">All customers</option>
            {(customersApi.data ?? []).map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => updateParam('overdue', overdueOnly ? '' : 'true')}
              className={cx(
                'inline-flex h-[38px] items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition',
                overdueOnly
                  ? 'border-rose-200 bg-rose-50 text-rose-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
              )}
              aria-pressed={overdueOnly}
            >
              <Icon name="alert" size={15} />
              Overdue only
            </button>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch('')
                  setSearchParams({})
                }}
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        {selectedCustomer && (
          <p className="mt-3 text-xs text-slate-500">
            Showing invoices for{' '}
            <span className="font-medium text-slate-700">{selectedCustomer.name}</span>
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500">
        <span>
          {data?.length ?? 0} invoice{(data?.length ?? 0) === 1 ? '' : 's'}
          {hasFilters ? ' matching filters' : ''}
        </span>
        <span>
          Outstanding in view:{' '}
          <span className="font-semibold text-slate-800">
            {money(filteredOutstanding, currency)}
          </span>
        </span>
      </div>

      {loading ? (
        <LoadingBlock message="Loading invoices…" />
      ) : error ? (
        <div className="space-y-3">
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" onClick={reload}>
            Try again
          </Button>
        </div>
      ) : !data || data.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No invoices match these filters' : 'No invoices yet'}
          description={
            hasFilters
              ? 'Try a different status, customer or search term.'
              : 'Create your first invoice to start tracking what you are owed.'
          }
          action={
            hasFilters ? (
              <Button
                variant="secondary"
                onClick={() => {
                  setSearch('')
                  setSearchParams({})
                }}
              >
                Clear filters
              </Button>
            ) : (
              <Button onClick={() => navigate('/invoices/new')}>
                <Icon name="plus" size={16} />
                Create invoice
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
                  <th className="th">Invoice</th>
                  <th className="th">Customer</th>
                  <th className="th">Issued</th>
                  <th className="th">Due</th>
                  <th className="th text-right">Total</th>
                  <th className="th text-right">Outstanding</th>
                  <th className="th">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="cursor-pointer hover:bg-slate-50/70"
                    onClick={() => navigate(`/invoices/${invoice.id}`)}
                  >
                    <td className="td whitespace-nowrap font-medium text-indigo-600">
                      <Link
                        to={`/invoices/${invoice.id}`}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="td">{invoice.customerName}</td>
                    <td className="td whitespace-nowrap text-slate-500">
                      {formatDate(invoice.issueDate)}
                    </td>
                    <td className="td whitespace-nowrap">
                      <span
                        className={invoice.overdue ? 'font-medium text-rose-600' : 'text-slate-600'}
                      >
                        {formatDate(invoice.dueDate)}
                      </span>
                      {invoice.overdue && (
                        <span className="ml-2 text-[11px] text-rose-500">
                          {invoice.daysOverdue}d late
                        </span>
                      )}
                    </td>
                    <td className="td whitespace-nowrap text-right">
                      {money(invoice.totalAmount, invoice.currency)}
                    </td>
                    <td className="td whitespace-nowrap text-right font-semibold">
                      {money(invoice.outstandingAmount, invoice.currency)}
                    </td>
                    <td className="td">
                      <StatusBadge status={invoice.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
