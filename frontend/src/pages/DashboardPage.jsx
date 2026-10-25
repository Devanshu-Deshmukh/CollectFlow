import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { api, errorMessage } from '../lib/api'
import { compactMoney, formatDate, money } from '../lib/format'
import { useApi } from '../lib/useApi'
import {
  Alert,
  Button,
  EmptyState,
  LoadingBlock,
  PageHeader,
  StatCard,
  StatusBadge,
} from '../components/ui'
import { Icon } from '../components/icons'
const bucketTones = ['bg-slate-300', 'bg-sky-400', 'bg-amber-400', 'bg-orange-400', 'bg-rose-500']
export function DashboardPage() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const { data, loading, error, reload } = useApi('/api/dashboard')
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState(null)
  async function runReminderCheck() {
    setProcessing(true)
    setNotice(null)
    try {
      const result = await api.post('/api/reminders/process')
      setNotice(
        `${result.remindersSent} reminder${result.remindersSent === 1 ? '' : 's'} sent, ${result.remindersScheduled} newly scheduled.`,
      )
      reload()
    } catch (err) {
      setNotice(errorMessage(err))
    } finally {
      setProcessing(false)
    }
  }
  if (loading) return <LoadingBlock message="Loading your receivables…" />
  if (error || !data) {
    return (
      <div className="space-y-4">
        <PageHeader title="Receivables overview" />
        <Alert tone="error">{error ?? 'Could not load the dashboard'}</Alert>
        <Button variant="secondary" onClick={reload}>
          Try again
        </Button>
      </div>
    )
  }
  const currency = data.currency
  const ageingTotal = data.ageing.reduce((sum, bucket) => sum + bucket.outstanding, 0) || 1
  const maxCollection = Math.max(...data.monthlyCollections.map((month) => month.collected), 1)
  const overdueShare =
    data.totalOutstanding > 0
      ? Math.round((data.overdueOutstanding / data.totalOutstanding) * 100)
      : 0
  return (
    <div className="space-y-6">
      <PageHeader
        title="Receivables overview"
        description={`${session?.business.name} · as of ${formatDate(data.asOf)}`}
        actions={
          <>
            <Button variant="secondary" onClick={runReminderCheck} loading={processing}>
              <Icon name="bell" size={16} />
              Run reminder check
            </Button>
            <Button onClick={() => navigate('/invoices/new')}>
              <Icon name="plus" size={16} />
              New invoice
            </Button>
          </>
        }
      />

      {notice && <Alert tone="info">{notice}</Alert>}

      {data.missedTaskCount > 0 && (
        <Alert tone="warning">
          {data.missedTaskCount} follow-up task{data.missedTaskCount === 1 ? ' is' : 's are'} past
          their due date.{' '}
          <Link to="/tasks" className="font-semibold underline underline-offset-2">
            Review tasks
          </Link>
        </Alert>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total outstanding"
          value={money(data.totalOutstanding, currency)}
          hint={`${data.openInvoiceCount} open invoice${data.openInvoiceCount === 1 ? '' : 's'}`}
          icon="invoices"
          tone="indigo"
        />
        <StatCard
          label="Overdue"
          value={money(data.overdueOutstanding, currency)}
          hint={`${data.overdueCount} invoice${data.overdueCount === 1 ? '' : 's'} · ${overdueShare}% of outstanding`}
          icon="alert"
          tone="rose"
        />
        <StatCard
          label="Due next 7 days"
          value={money(data.dueNext7Days, currency)}
          hint={`${data.remindersDueThisWeek} reminder${data.remindersDueThisWeek === 1 ? '' : 's'} scheduled this week`}
          icon="clock"
          tone="amber"
        />
        <StatCard
          label="Collected this month"
          value={money(data.collectedThisMonth, currency)}
          hint={`${data.paidInvoiceCount} paid of ${data.totalInvoiceCount} invoices`}
          icon="check"
          tone="emerald"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">
                Ageing of outstanding balances
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                How long the money has been owed, based on due dates.
              </p>
            </div>
            <Link
              to="/reports?tab=ageing"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Full report
            </Link>
          </div>
          <div className="mt-5 space-y-4">
            {data.ageing.map((bucket, index) => {
              const share = Math.round((bucket.outstanding / ageingTotal) * 100)
              return (
                <div key={bucket.label}>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="font-medium text-slate-700">{bucket.label}</span>
                    <span className="text-slate-500">
                      <span className="font-semibold text-slate-900">
                        {money(bucket.outstanding, currency)}
                      </span>
                      <span className="ml-2 text-xs">{bucket.invoiceCount} inv.</span>
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`h-full rounded-full ${bucketTones[index]}`}
                      style={{ width: `${Math.max(bucket.outstanding > 0 ? 3 : 0, share)}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-500">
            <span>{data.customerCount} customers</span>
            <span className="font-medium text-slate-700">
              {money(data.totalOutstanding, currency)} outstanding
            </span>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Invoice status</h2>
          <p className="mt-0.5 text-xs text-slate-500">Where every invoice stands today.</p>
          <div className="mt-4 space-y-3">
            {data.statusBreakdown.map((row) => (
              <Link
                key={row.status}
                to={`/invoices?status=${row.status}`}
                className="flex items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-slate-50"
              >
                <span className="flex items-center gap-2">
                  <StatusBadge status={row.status} />
                </span>
                <span className="text-right text-xs text-slate-500">
                  <span className="block text-sm font-semibold text-slate-900">{row.count}</span>
                  {money(row.outstanding, currency)}
                </span>
              </Link>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
            <p className="flex items-center gap-1.5 font-medium text-slate-700">
              <Icon name="tasks" size={14} /> {data.openTaskCount} open follow-up tasks
            </p>
            <p className="mt-1 text-slate-500">{data.missedTaskCount} past due</p>
          </div>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Customers needing attention</h2>
              <p className="mt-0.5 text-xs text-slate-500">Largest overdue balances first.</p>
            </div>
            <Link
              to="/reports?tab=overdue"
              className="text-xs font-medium text-indigo-600 hover:underline"
            >
              Overdue report
            </Link>
          </div>
          {data.topOverdueCustomers.length === 0 ? (
            <EmptyState
              icon="check"
              title="Nothing overdue"
              description="Every open invoice is still within its due date."
            />
          ) : (
            <div className="overflow-x-auto border-t border-slate-100">
              <table className="min-w-full divide-y divide-slate-100">
                <thead className="bg-slate-50/70">
                  <tr>
                    <th className="th">Customer</th>
                    <th className="th">Oldest</th>
                    <th className="th text-right">Invoices</th>
                    <th className="th text-right">Overdue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.topOverdueCustomers.map((customer) => (
                    <tr key={customer.customerId} className="hover:bg-slate-50/60">
                      <td className="td">
                        <Link
                          to={`/invoices?customer=${customer.customerId}`}
                          className="font-medium text-slate-900 hover:text-indigo-600"
                        >
                          {customer.customerName}
                        </Link>
                      </td>
                      <td className="td text-slate-500">{customer.oldestDaysOverdue} days</td>
                      <td className="td text-right">{customer.invoiceCount}</td>
                      <td className="td text-right font-semibold text-rose-600">
                        {money(customer.outstanding, currency)}
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
            <h2 className="text-sm font-semibold text-slate-900">Recent payments</h2>
            <Link to="/invoices" className="text-xs font-medium text-indigo-600 hover:underline">
              All invoices
            </Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {data.recentPayments.map((payment) => (
                <li key={payment.id} className="py-3">
                  <Link
                    to={`/invoices/${payment.invoiceId}`}
                    className="flex items-start justify-between gap-3"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-slate-900">
                        {payment.customerName}
                      </span>
                      <span className="block text-xs text-slate-500">
                        {payment.invoiceNumber} · {formatDate(payment.paymentDate)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-semibold text-emerald-600">
                      {money(payment.amount, currency)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Collections, last six months</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Payments recorded against your invoices.
            </p>
          </div>
          <span className="text-xs text-slate-500">
            Peak {compactMoney(maxCollection, currency)}
          </span>
        </div>
        <div className="mt-6 flex items-end gap-3 sm:gap-6">
          {data.monthlyCollections.map((month) => (
            <div key={month.month} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-28 w-full items-end">
                <div
                  className="w-full rounded-t-md bg-indigo-500/85 transition hover:bg-indigo-600"
                  style={{ height: `${Math.max(2, (month.collected / maxCollection) * 100)}%` }}
                  title={`${month.month}: ${money(month.collected, currency)}`}
                />
              </div>
              <span className="text-[11px] text-slate-500">{month.month}</span>
            </div>
          ))}
        </div>
      </section>

      <p className="pb-2 text-center text-xs text-slate-400">
        Reminder emails go out from the daily job. Run the check above to process today&apos;s queue
        now.
      </p>
    </div>
  )
}
