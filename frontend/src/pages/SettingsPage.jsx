import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { api, errorMessage } from '../lib/api'
import { useApi } from '../lib/useApi'
import { Alert, Avatar, Badge, Button, Field, LoadingBlock, PageHeader } from '../components/ui'
import { Icon } from '../components/icons'
export function SettingsPage() {
  const { session, updateBusiness } = useAuth()
  const businessApi = useApi('/api/business')
  const membersApi = useApi('/api/business/members')
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '', currency: 'INR' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const [busyDownload, setBusyDownload] = useState(null)
  const [importing, setImporting] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importError, setImportError] = useState(null)
  const customersInput = useRef(null)
  const invoicesInput = useRef(null)
  useEffect(() => {
    if (!businessApi.data) return
    setForm({
      name: businessApi.data.name,
      email: businessApi.data.email ?? '',
      phone: businessApi.data.phone ?? '',
      address: businessApi.data.address ?? '',
      currency: businessApi.data.currency,
    })
  }, [businessApi.data])
  async function saveProfile(event) {
    event.preventDefault()
    setError(null)
    setSaved(false)
    setSaving(true)
    try {
      const updated = await api.put('/api/business', {
        name: form.name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        address: form.address.trim() || null,
        currency: form.currency,
      })
      updateBusiness(updated)
      setSaved(true)
      businessApi.reload()
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }
  async function download(path, filename) {
    setBusyDownload(path)
    setImportError(null)
    try {
      await api.download(path, filename)
    } catch (err) {
      setImportError(errorMessage(err))
    } finally {
      setBusyDownload(null)
    }
  }
  async function importFile(kind, file) {
    if (!file) return
    setImporting(kind)
    setImportError(null)
    setImportResult(null)
    try {
      const result = await api.upload(`/api/import/${kind}`, file)
      setImportResult({ kind, result })
    } catch (err) {
      setImportError(errorMessage(err))
    } finally {
      setImporting(null)
      if (customersInput.current) customersInput.current.value = ''
      if (invoicesInput.current) invoicesInput.current.value = ''
    }
  }
  return (
    <div className="space-y-5">
      <PageHeader title="Settings" description="Business details, team access and your data." />

      <div className="grid gap-5 lg:grid-cols-3">
        <section className="card p-5 lg:col-span-2">
          <h2 className="text-sm font-semibold text-slate-900">Business profile</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Used in reminders, reports and the invoice currency for new invoices.
          </p>

          {businessApi.loading ? (
            <div className="mt-4">
              <LoadingBlock message="Loading profile…" />
            </div>
          ) : (
            <form onSubmit={saveProfile} className="mt-4 space-y-4">
              {error && <Alert tone="error">{error}</Alert>}
              {saved && <Alert tone="success">Business profile updated.</Alert>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Business name" htmlFor="business-name">
                  <input
                    id="business-name"
                    className="input"
                    required
                    maxLength={160}
                    value={form.name}
                    onChange={(event) => setForm({ ...form, name: event.target.value })}
                  />
                </Field>
                <Field label="Invoice currency" htmlFor="business-currency">
                  <select
                    id="business-currency"
                    className="input"
                    value={form.currency}
                    onChange={(event) => setForm({ ...form, currency: event.target.value })}
                  >
                    <option value="INR">INR — Indian rupee</option>
                    <option value="USD">USD — US dollar</option>
                    <option value="EUR">EUR — Euro</option>
                    <option value="GBP">GBP — Pound sterling</option>
                    <option value="AED">AED — UAE dirham</option>
                    <option value="SGD">SGD — Singapore dollar</option>
                  </select>
                </Field>
                <Field label="Billing email" htmlFor="business-email">
                  <input
                    id="business-email"
                    className="input"
                    type="email"
                    value={form.email}
                    onChange={(event) => setForm({ ...form, email: event.target.value })}
                    placeholder="accounts@business.in"
                  />
                </Field>
                <Field label="Phone" htmlFor="business-phone">
                  <input
                    id="business-phone"
                    className="input"
                    value={form.phone}
                    onChange={(event) => setForm({ ...form, phone: event.target.value })}
                    placeholder="+91 98450 00000"
                  />
                </Field>
                <Field label="Address" htmlFor="business-address" className="sm:col-span-2">
                  <textarea
                    id="business-address"
                    className="input min-h-[70px]"
                    maxLength={500}
                    value={form.address}
                    onChange={(event) => setForm({ ...form, address: event.target.value })}
                  />
                </Field>
              </div>

              <Button type="submit" loading={saving}>
                Save changes
              </Button>
            </form>
          )}
        </section>

        <section className="card p-5">
          <h2 className="text-sm font-semibold text-slate-900">Workspace</h2>
          <div className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Signed in as</span>
              <span className="truncate text-slate-800">{session?.user.email}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-slate-500">Your role</span>
              <Badge tone="indigo">{session?.role}</Badge>
            </div>
          </div>

          <h3 className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Team
          </h3>
          <ul className="mt-2 divide-y divide-slate-100">
            {(membersApi.data ?? []).map((member) => (
              <li key={member.userId} className="flex items-center gap-3 py-2.5">
                <Avatar name={member.name} size={30} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-800">{member.name}</p>
                  <p className="truncate text-xs text-slate-500">{member.email}</p>
                </div>
                <Badge tone={member.role === 'OWNER' ? 'indigo' : 'slate'}>
                  {member.role.toLowerCase()}
                </Badge>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-slate-400">
            Follow-up tasks can be assigned to any member of this workspace.
          </p>
        </section>
      </div>

      <section className="card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">Import &amp; export</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Move customers and invoices in and out of CollectFlow as CSV. Dates use yyyy-MM-dd.
            </p>
          </div>
          <Badge tone="slate">CSV</Badge>
        </div>

        {importError && (
          <div className="mt-3">
            <Alert tone="error">{importError}</Alert>
          </div>
        )}

        {importResult && (
          <div className="mt-3 space-y-2">
            <Alert tone={importResult.result.errors.length > 0 ? 'warning' : 'success'}>
              Imported {importResult.result.imported} {importResult.kind},{' '}
              {importResult.result.skipped} skipped.
              {importResult.result.errors.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs">
                  {importResult.result.errors.slice(0, 8).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                  {importResult.result.errors.length > 8 && (
                    <li>…and {importResult.result.errors.length - 8} more</li>
                  )}
                </ul>
              )}
            </Alert>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-900">Customers</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Columns: Name, Email, Phone, Company, Notes. Existing name + email pairs are skipped.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void download('/api/export/customers.csv', 'collectflow-customers.csv')
                }
                loading={busyDownload === '/api/export/customers.csv'}
              >
                <Icon name="download" size={14} />
                Export customers
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => customersInput.current?.click()}
                loading={importing === 'customers'}
              >
                <Icon name="upload" size={14} />
                Import customers
              </Button>
              <input
                ref={customersInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void importFile('customers', event.target.files?.[0])}
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 p-4">
            <p className="text-sm font-medium text-slate-900">Invoices</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Columns: InvoiceNumber, CustomerName, CustomerEmail, IssueDate, DueDate, Description,
              Quantity, UnitPrice, Notes. Repeat the invoice number for multiple lines.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="secondary"
                onClick={() =>
                  void download('/api/export/invoices.csv', 'collectflow-invoices.csv')
                }
                loading={busyDownload === '/api/export/invoices.csv'}
              >
                <Icon name="download" size={14} />
                Export invoices
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => invoicesInput.current?.click()}
                loading={importing === 'invoices'}
              >
                <Icon name="upload" size={14} />
                Import invoices
              </Button>
              <input
                ref={invoicesInput}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(event) => void importFile('invoices', event.target.files?.[0])}
              />
            </div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-400">
          Tip: export first to get a file in the expected column order, then edit it in a
          spreadsheet.
        </p>
      </section>

      <section className="card p-5">
        <h2 className="text-sm font-semibold text-slate-900">Reminder delivery</h2>
        <div className="mt-3 space-y-2 text-sm text-slate-600">
          <p>
            Reminders are scheduled from your active templates and processed by the daily job at
            08:00 server time. You can also run the queue on demand from Reminders or the dashboard.
          </p>
          <p>
            Emails use the SMTP settings configured on the server. When email delivery is turned
            off, reminders are logged and marked as logged-only in the history, so you can still see
            what would have been sent.
          </p>
        </div>
      </section>
    </div>
  )
}
