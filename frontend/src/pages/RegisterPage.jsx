import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Field } from '../components/ui'
import { AuthLayout } from './AuthLayout'
export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    businessName: '',
    currency: 'INR',
  })
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }
  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await register({
        name: form.name.trim(),
        email: form.email.trim(),
        password: form.password,
        businessName: form.businessName.trim(),
        currency: form.currency,
      })
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthLayout
      title="Create your workspace"
      subtitle="Set up your business once. Invoices, customers and follow-ups live inside it."
      footer={
        <>
          Already have an account?{' '}
          <Link className="link" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your name" htmlFor="name">
            <input
              id="name"
              className="input"
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Ananya Rao"
            />
          </Field>
          <Field label="Business name" htmlFor="businessName">
            <input
              id="businessName"
              className="input"
              required
              maxLength={160}
              value={form.businessName}
              onChange={(event) => update('businessName', event.target.value)}
              placeholder="Meridian Design Studio"
            />
          </Field>
        </div>

        <Field label="Work email" htmlFor="register-email">
          <input
            id="register-email"
            className="input"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            placeholder="accounts@business.in"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Password" htmlFor="register-password" hint="At least 8 characters">
            <input
              id="register-password"
              className="input"
              type="password"
              required
              minLength={8}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              placeholder="••••••••"
            />
          </Field>
          <Field label="Invoice currency" htmlFor="currency">
            <select
              id="currency"
              className="input"
              value={form.currency}
              onChange={(event) => update('currency', event.target.value)}
            >
              <option value="INR">INR — Indian rupee</option>
              <option value="USD">USD — US dollar</option>
              <option value="EUR">EUR — Euro</option>
              <option value="GBP">GBP — Pound sterling</option>
              <option value="AED">AED — UAE dirham</option>
              <option value="SGD">SGD — Singapore dollar</option>
            </select>
          </Field>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Create workspace
        </Button>
        <p className="text-center text-xs text-slate-400">
          You can add customers and invoices right after signing up.
        </p>
      </form>
    </AuthLayout>
  )
}
