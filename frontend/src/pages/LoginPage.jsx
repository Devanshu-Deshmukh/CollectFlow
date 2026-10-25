import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Alert, Button, Field } from '../components/ui'
import { AuthLayout } from './AuthLayout'
export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  async function onSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(email.trim(), password)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in')
    } finally {
      setSubmitting(false)
    }
  }
  return (
    <AuthLayout
      title="Sign in"
      subtitle="Use your business account to open the receivables workspace."
      footer={
        <>
          New here?{' '}
          <Link className="link" to="/register">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && <Alert tone="error">{error}</Alert>}

        <Field label="Email address" htmlFor="email">
          <input
            id="email"
            className="input"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@business.in"
          />
        </Field>

        <Field label="Password" htmlFor="password">
          <input
            id="password"
            className="input"
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="••••••••"
          />
        </Field>

        <Button type="submit" className="w-full" loading={submitting}>
          Sign in
        </Button>
      </form>

      <div className="mt-5 rounded-xl border border-indigo-100 bg-indigo-50/60 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
          Demo workspace
        </p>
        <p className="mt-1 text-xs text-indigo-900/80">
          Meridian Design Studio is preloaded with invoices, payments and follow-ups.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <code className="rounded bg-white px-2 py-1 text-[11px] text-slate-700">
            demo@collectflow.app / demo12345
          </code>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => {
              setEmail('demo@collectflow.app')
              setPassword('demo12345')
            }}
          >
            Fill demo login
          </Button>
        </div>
      </div>
    </AuthLayout>
  )
}
