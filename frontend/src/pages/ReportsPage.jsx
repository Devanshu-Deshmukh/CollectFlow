import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, errorMessage } from '../lib/api'
import { formatDate, money } from '../lib/format'
import { useApi } from '../lib/useApi'
import {
  Alert,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
  cx,
} from '../components/ui'
import { Icon } from '../components/icons'
import { useState } from 'react'
const tabs = [
  { value: 'ageing', label: 'Ageing' },
  { value: 'overdue', label: 'Overdue invoices' },
  { value: 'expected', label: 'Expected collections' },
]
export function ReportsPage() {
  const { session } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = tabs.find((item) => item.value === searchParams.get('tab'))?.value ?? 'ageing'
  const currency = session?.business.currency ?? 'INR'
  const [exporting, setExporting] = useState(false)
  const [exportError, setExportError] = useState(null)
  const ageing = useApi(tab === 'ageing' ? '/api/reports/ageing' : null)
  const overdue = useApi(tab === 'overdue' ? '/api/reports/overdue' : null)
  const expected = useApi(tab === 'expected' ? '/api/reports/expected-collections' : null)
  const active = tab === 'ageing' ? ageing : tab === 'overdue' ? overdue : expected
  const asOf = active.data?.asOf ?? null
  function setTab(next) {
    setSearchParams({ tab: next })
  }
  async function exportInvoices() {
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
        title="Reports"
        description={
          asOf
            ? `Based on invoices and payments as of ${formatDate(asOf)}.`
            : 'Receivables analysis.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={() => void exportInvoices()} loading={exporting}>
              <Icon name="download" size={16} />
              Export invoices
            </Button>
            <Button variant="secondary" onClick={active.reload}>
              <Icon name="clock" size={16} />
              Refresh
            </Button>
          </>
        }
      />

      {exportError && <Alert tone="error">{exportError}</Alert>}

      <div className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => setTab(item.value)}
            className={cx(
              'rounded-lg border px-3 py-1.5 text-sm font-medium transition',
              tab === item.value
                ? 'border-teal-200 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {active.loading ? (
        <LoadingBlock message="Building report…" />
      ) : active.error ? (
        <div className="space-y-3">
          <Alert tone="error">{active.error}</Alert>
          <Button variant="secondary" onClick={active.reload}>
            Try again
          </Button>
        </div>
      ) : tab === 'ageing' && ageing.data ? (
        <AgeingView report={ageing.data} currency={currency} />
      ) : tab === 'overdue' && overdue.data ? (
        <OverdueView report={overdue.data} currency={currency} />
      ) : tab === 'expected' && expected.data ? (
        <ExpectedView report={expected.data} currency={currency} />
      ) : null}
    </div>
  )
}
function AgeingView({ report, currency }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard
          label="Total outstanding"
          value={money(report.totalOutstanding, currency)}
          tone="indigo"
          icon="invoices"
        />
        {report.summary.map((bucket) => (
          <StatCard
            key={bucket.label}
            label={bucket.label}
            value={money(bucket.outstanding, currency)}
            hint={`${bucket.invoiceCount} invoice${bucket.invoiceCount === 1 ? '' : 's'}`}
            tone={
              bucket.label === 'Not yet due'
                ? 'slate'
                : bucket.label === '90+ days'
                  ? 'rose'
                  : 'amber'
            }
          />
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Outstanding by customer and age</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Days are counted from the invoice due date. Invoices not yet due sit in the first
            column.
          </p>
        </div>
        {report.rows.length === 0 ? (
          <EmptyState
            icon="check"
            title="No outstanding invoices"
            description="Everything has been collected."
          />
        ) : (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">Customer</th>
                  <th className="th text-right">Not yet due</th>
                  <th className="th text-right">1–30 days</th>
                  <th className="th text-right">31–60 days</th>
                  <th className="th text-right">61–90 days</th>
                  <th className="th text-right">90+ days</th>
                  <th className="th text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.rows.map((row) => (
                  <tr key={row.customerId} className="hover:bg-slate-50/60">
                    <td className="td font-medium text-slate-900">
                      <Link
                        to={`/invoices?customer=${row.customerId}`}
                        className="hover:text-indigo-600"
                      >
                        {row.customerName}
                      </Link>
                    </td>
                    <td className="td text-right">{money(row.notYetDue, currency)}</td>
                    <td className="td text-right">{money(row.days1To30, currency)}</td>
                    <td className="td text-right">{money(row.days31To60, currency)}</td>
                    <td className="td text-right">{money(row.days61To90, currency)}</td>
                    <td
                      className={cx(
                        'td text-right',
                        row.days90Plus > 0 && 'font-medium text-rose-600',
                      )}
                    >
                      {money(row.days90Plus, currency)}
                    </td>
                    <td className="td text-right font-semibold">{money(row.total, currency)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
function OverdueView({ report, currency }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total overdue"
          value={money(report.totalOverdue, currency)}
          hint={`${report.invoiceCount} invoice${report.invoiceCount === 1 ? '' : 's'}`}
          tone="rose"
          icon="alert"
        />
        <StatCard
          label="Customers with overdue invoices"
          value={report.byCustomer.length}
          hint="Grouped below by balance"
          icon="customers"
        />
        <StatCard
          label="Oldest debt"
          value={`${report.byCustomer.reduce((max, row) => Math.max(max, row.oldestDaysOverdue), 0)} days`}
          hint="Measured from the due date"
          tone="amber"
          icon="clock"
        />
      </div>

      {report.invoices.length === 0 ? (
        <EmptyState
          icon="check"
          title="No overdue invoices"
          description="Every invoice is within its payment terms."
        />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="card overflow-hidden">
              <div className="px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">By customer</h2>
              </div>
              <table className="min-w-full divide-y divide-slate-100 border-t border-slate-100">
                <thead className="bg-slate-50/80">
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th text-right">Invoices</th>
                    <th className="th text-right">Oldest</th>
                    <th className="th text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.byCustomer.map((row) => (
                    <tr key={row.customerId}>
                      <td className="td font-medium text-slate-900">
                        <Link
                          to={`/invoices?customer=${row.customerId}`}
                          className="hover:text-indigo-600"
                        >
                          {row.customerName}
                        </Link>
                      </td>
                      <td className="td text-right">{row.invoiceCount}</td>
                      <td className="td text-right">{row.oldestDaysOverdue} days</td>
                      <td className="td text-right font-semibold text-rose-600">
                        {money(row.overdueAmount, currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="card overflow-hidden">
              <div className="px-5 py-4">
                <h2 className="text-sm font-semibold text-slate-900">Overdue invoices</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Open the invoice to record a payment or follow up.
                </p>
              </div>
              <div className="max-h-[420px] overflow-y-auto border-t border-slate-100">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="sticky top-0 bg-slate-50/95 backdrop-blur">
                    <tr>
                      <th className="th">Invoice</th>
                      <th className="th">Customer</th>
                      <th className="th text-right">Late</th>
                      <th className="th text-right">Outstanding</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.invoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className="td whitespace-nowrap">
                          <Link
                            to={`/invoices/${invoice.id}`}
                            className="font-medium text-indigo-600 hover:underline"
                          >
                            {invoice.invoiceNumber}
                          </Link>
                          <div className="mt-0.5">
                            <StatusBadge status={invoice.status} />
                          </div>
                        </td>
                        <td className="td">{invoice.customerName}</td>
                        <td className="td text-right text-rose-600">{invoice.daysOverdue}d</td>
                        <td className="td text-right font-semibold">
                          {money(invoice.outstandingAmount, currency)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
function ExpectedView({ report, currency }) {
  return (
    <div className="space-y-4">
      <Alert tone="info">
        These figures are outstanding balances grouped by their due dates. They are not a forecast
        of how much customers will actually pay.
      </Alert>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Total open receivables"
          value={money(report.totalExpected, currency)}
          hint="All outstanding balances"
          tone="indigo"
          icon="invoices"
        />
        <StatCard
          label="Already past due"
          value={money(report.windows.find((w) => w.label === 'Overdue')?.amount ?? 0, currency)}
          hint={`${report.windows.find((w) => w.label === 'Overdue')?.invoiceCount ?? 0} invoices`}
          tone="rose"
          icon="alert"
        />
        <StatCard
          label="Due within 30 days"
          value={money(
            report.windows
              .filter((w) => w.label === 'Due this week' || w.label === 'Next 30 days')
              .reduce((sum, w) => sum + w.amount, 0),
            currency,
          )}
          hint="Expected from upcoming due dates"
          tone="emerald"
          icon="clock"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {report.windows.map((window) => (
          <div key={window.label} className="card p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {window.label}
              </p>
              <span className="text-[11px] text-slate-400">
                {window.from && window.to
                  ? `${formatDate(window.from)} – ${formatDate(window.to)}`
                  : window.from
                    ? `From ${formatDate(window.from)}`
                    : window.to
                      ? `Up to ${formatDate(window.to)}`
                      : '—'}
              </span>
            </div>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {money(window.amount, currency)}
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              {window.invoiceCount} invoice{window.invoiceCount === 1 ? '' : 's'} in this window
            </p>
          </div>
        ))}
      </div>

      <div className="card overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Largest open customer balances</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Useful for prioritising collection conversations.
          </p>
        </div>
        {report.largestExposures.length === 0 ? (
          <EmptyState
            icon="check"
            title="No open balances"
            description="Every invoice has been paid."
          />
        ) : (
          <div className="overflow-x-auto border-t border-slate-100">
            <table className="min-w-full divide-y divide-slate-100">
              <thead className="bg-slate-50/80">
                <tr>
                  <th className="th">Customer</th>
                  <th className="th text-right">Invoices</th>
                  <th className="th text-right">Oldest overdue</th>
                  <th className="th text-right">Outstanding</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {report.largestExposures.map((exposure) => (
                  <tr key={exposure.customerId}>
                    <td className="td font-medium text-slate-900">
                      <Link
                        to={`/invoices?customer=${exposure.customerId}`}
                        className="hover:text-indigo-600"
                      >
                        {exposure.customerName}
                      </Link>
                    </td>
                    <td className="td text-right">{exposure.invoiceCount}</td>
                    <td className="td text-right">
                      {exposure.oldestDaysOverdue > 0 ? `${exposure.oldestDaysOverdue} days` : '—'}
                    </td>
                    <td className="td text-right font-semibold">
                      {money(exposure.outstanding, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
