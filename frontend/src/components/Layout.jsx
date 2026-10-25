import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Avatar, cx } from './ui'
import { Icon } from './icons'
import { BrandLogo } from './logo'
const navigation = [
  { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { to: '/invoices', label: 'Invoices', icon: 'invoices' },
  { to: '/customers', label: 'Customers', icon: 'customers' },
  { to: '/reminders', label: 'Reminders', icon: 'bell' },
  { to: '/tasks', label: 'Tasks', icon: 'tasks' },
  { to: '/reports', label: 'Reports', icon: 'reports' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]
function Sidebar({ onNavigate }) {
  const { session, logout } = useAuth()
  const navigate = useNavigate()
  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-5 pt-5">
        <BrandLogo subtitle="Receivables" />
      </div>

      <nav className="flex-1 space-y-0.5 px-3">
        {navigation.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cx(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
              )
            }
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-2 rounded-lg px-2 py-2">
          <Avatar name={session?.user.name ?? 'CF'} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{session?.user.name}</p>
            <p className="truncate text-xs text-slate-500">{session?.business.name}</p>
          </div>
          <button
            type="button"
            title="Sign out"
            aria-label="Sign out"
            onClick={() => {
              logout()
              navigate('/login', { replace: true })
            }}
            className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <Icon name="logout" size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}
export function Layout() {
  const { session } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMenuOpen(false)}
          />
          <div className="relative h-full w-72 max-w-[85vw] border-r border-slate-200 bg-white shadow-xl">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMenuOpen(false)}
              className="absolute right-2 top-3 rounded-md p-1.5 text-slate-400 hover:bg-slate-100"
            >
              <Icon name="close" size={18} />
            </button>
            <Sidebar onNavigate={() => setMenuOpen(false)} />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-3 px-4 lg:px-8">
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Open menu"
                onClick={() => setMenuOpen(true)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 lg:hidden"
              >
                <Icon name="menu" size={20} />
              </button>
              <div className="lg:hidden">
                <BrandLogo />
              </div>
              <p className="hidden text-sm font-medium text-slate-700 lg:block">
                {session?.business.name}
              </p>
              <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 sm:inline">
                {session?.role}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="hidden sm:inline">
                Invoicing in{' '}
                <span className="font-medium text-slate-700">{session?.business.currency}</span>
              </span>
              <Avatar name={session?.user.name ?? 'CF'} size={28} />
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
