import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { Layout } from './components/Layout'
import { Spinner } from './components/ui'
import { DashboardPage } from './pages/DashboardPage'
import { CustomersPage } from './pages/CustomersPage'
import { InvoiceDetailPage } from './pages/InvoiceDetailPage'
import { InvoicesPage } from './pages/InvoicesPage'
import { LandingPage } from './pages/LandingPage'
import { LoginPage } from './pages/LoginPage'
import { NewInvoicePage } from './pages/NewInvoicePage'
import { RegisterPage } from './pages/RegisterPage'
import { RemindersPage } from './pages/RemindersPage'
import { ReportsPage } from './pages/ReportsPage'
import { SettingsPage } from './pages/SettingsPage'
import { TasksPage } from './pages/TasksPage'
function FullScreenLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center gap-3 bg-slate-50 text-sm text-slate-500">
      <Spinner />
      Loading CollectFlow…
    </div>
  )
}
function Protected() {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace />
  return <Layout />
}
function PublicOnly({ children }) {
  const { session, loading } = useAuth()
  if (loading) return <FullScreenLoader />
  if (session) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnly>
              <LoginPage />
            </PublicOnly>
          }
        />
        <Route
          path="/register"
          element={
            <PublicOnly>
              <RegisterPage />
            </PublicOnly>
          }
        />
        <Route element={<Protected />}>
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="invoices/new" element={<NewInvoicePage />} />
          <Route path="invoices/:id" element={<InvoiceDetailPage />} />
          <Route path="customers" element={<CustomersPage />} />
          <Route path="reminders" element={<RemindersPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
