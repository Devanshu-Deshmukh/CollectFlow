import { useState } from 'react'
import { Link } from 'react-router-dom'
import { api, errorMessage } from '../lib/api'
import { daysBetween, formatDate, todayISO } from '../lib/format'
import { useApi } from '../lib/useApi'
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
export function TasksPage() {
  const { data, loading, error, reload } = useApi('/api/follow-ups')
  const [busy, setBusy] = useState(null)
  const [filter, setFilter] = useState('all')
  const [flash, setFlash] = useState(null)
  const today = todayISO()
  const tasks = data ?? []
  const filtered = tasks.filter((task) => {
    if (!task.dueDate) return filter === 'all'
    const overdue = task.dueDate < today
    if (filter === 'overdue') return overdue
    if (filter === 'today') return task.dueDate === today
    if (filter === 'upcoming') return task.dueDate > today
    return true
  })
  const overdueCount = tasks.filter((task) => task.dueDate && task.dueDate < today).length
  const dueTodayCount = tasks.filter((task) => task.dueDate === today).length
  async function complete(task) {
    setBusy(task.id)
    setFlash(null)
    try {
      await api.patch(`/api/follow-ups/${task.id}`, { status: 'DONE' })
      setFlash(`Task for ${task.customerName} completed.`)
      reload()
    } catch (err) {
      setFlash(errorMessage(err))
    } finally {
      setBusy(null)
    }
  }
  const filters = [
    { value: 'all', label: 'All open', count: tasks.length },
    { value: 'overdue', label: 'Overdue', count: overdueCount },
    { value: 'today', label: 'Due today', count: dueTodayCount },
    {
      value: 'upcoming',
      label: 'Upcoming',
      count: tasks.filter((t) => t.dueDate && t.dueDate > today).length,
    },
  ]
  return (
    <div className="space-y-5">
      <PageHeader
        title="Follow-up tasks"
        description="Assigned collection tasks that are still open, oldest due date first."
      />

      {flash && <Alert tone="success">{flash}</Alert>}
      {error && <Alert tone="error">{error}</Alert>}

      <div className="flex flex-wrap gap-2">
        {filters.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setFilter(option.value)}
            className={cx(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition',
              filter === option.value
                ? 'border-teal-200 bg-teal-50 text-teal-800'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            {option.label}
            <span
              className={cx(
                'rounded-full px-1.5 py-0.5 text-[11px]',
                filter === option.value
                  ? 'bg-teal-100 text-teal-800'
                  : 'bg-slate-100 text-slate-500',
              )}
            >
              {option.count}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingBlock message="Loading tasks…" />
      ) : !data || data.length === 0 ? (
        <EmptyState
          icon="tasks"
          title="No open tasks"
          description="When you log a follow-up of type Task on an invoice, it appears here until it is completed."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="check"
          title="Nothing in this view"
          description="Try another filter to see the rest of your open tasks."
          action={
            <Button variant="secondary" onClick={() => setFilter('all')}>
              Show all open tasks
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const overdue = Boolean(task.dueDate && task.dueDate < today)
            const dueSoon = task.dueDate === today
            const days = task.dueDate ? daysBetween(today, task.dueDate) : null
            return (
              <div
                key={task.id}
                className={cx(
                  'card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between',
                  overdue && 'border-rose-200',
                )}
              >
                <div className="flex min-w-0 items-start gap-3">
                  <span
                    className={cx(
                      'mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                      overdue ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600',
                    )}
                  >
                    <Icon name="tasks" size={17} />
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">{task.notes}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      <Link
                        to={`/invoices/${task.invoiceId}`}
                        className="font-medium text-indigo-600 hover:underline"
                      >
                        {task.invoiceNumber}
                      </Link>{' '}
                      · {task.customerName}
                      {task.assignedToName && <> · assigned to {task.assignedToName}</>}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <StatusBadge status={task.status} />
                      {task.dueDate && (
                        <span
                          className={cx(
                            'text-[11px] font-medium',
                            overdue
                              ? 'text-rose-600'
                              : dueSoon
                                ? 'text-amber-600'
                                : 'text-slate-500',
                          )}
                        >
                          {overdue
                            ? `${Math.abs(days ?? 0)} days overdue`
                            : dueSoon
                              ? 'Due today'
                              : `Due ${formatDate(task.dueDate)}`}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:pl-4">
                  <Link
                    to={`/invoices/${task.invoiceId}`}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Open invoice
                  </Link>
                  <Button size="sm" onClick={() => void complete(task)} loading={busy === task.id}>
                    <Icon name="check" size={14} />
                    Mark done
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
