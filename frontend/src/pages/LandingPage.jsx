import { Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Icon } from '../components/icons'
import { BrandLogo } from '../components/logo'

const navLinks = [
  { href: '#product', label: 'Product' },
  { href: '#workflow', label: 'How it works' },
  { href: '#reports', label: 'Reports' },
]

const ageing = [
  { label: 'Not yet due', amount: '2,56,500', share: 50, tone: 'bg-teal-500' },
  { label: '1–30 days', amount: '88,000', share: 17, tone: 'bg-teal-400' },
  { label: '31–60 days', amount: '32,000', share: 6, tone: 'bg-amber-400' },
  { label: '61–90 days', amount: '55,000', share: 11, tone: 'bg-orange-400' },
  { label: '90+ days', amount: '84,000', share: 16, tone: 'bg-rose-400' },
]

const invoices = [
  {
    number: 'INV-2026-0003',
    customer: 'Brightline Media',
    due: '17 Jul 2026',
    amount: '84,000',
    status: 'Overdue',
    tone: 'rose',
  },
  {
    number: 'INV-2026-0002',
    customer: 'Kavya Textiles',
    due: '27 Aug 2026',
    amount: '55,000',
    status: 'Partial',
    tone: 'amber',
  },
  {
    number: 'INV-2026-0006',
    customer: 'Peakline Consulting',
    due: '2 Nov 2026',
    amount: '45,000',
    status: 'Pending',
    tone: 'slate',
  },
]

const problems = [
  {
    title: 'Invoices live in a spreadsheet',
    body: 'Amounts, due dates and part payments are updated by hand, so the total you are owed is only as reliable as the last edit.',
    icon: 'invoices',
  },
  {
    title: 'Follow-ups live in email and chat',
    body: 'Who was called, what they promised and when to chase again ends up in three different threads that nobody can audit.',
    icon: 'mail',
  },
  {
    title: 'Your accounting software shows history, not action',
    body: 'It knows what was invoiced. It does not tell you which invoices are overdue today or which follow-up is past its due date.',
    icon: 'alert',
  },
]

const features = [
  {
    icon: 'invoices',
    title: 'Invoices with real statuses',
    body: 'Pending, partially paid, overdue and paid — computed from due dates and recorded payments, not typed in by hand.',
  },
  {
    icon: 'dashboard',
    title: 'Receivables dashboard',
    body: 'Total outstanding, overdue, due in the next seven days and collected this month, on one screen.',
  },
  {
    icon: 'reports',
    title: 'Invoice ageing',
    body: 'See how long money has been owed: not yet due, 1–30, 31–60, 61–90 and 90+ days.',
  },
  {
    icon: 'clock',
    title: 'Scheduled reminders',
    body: 'Reminders queue up against each invoice, with a daily check that picks up everything due to be sent.',
  },
  {
    icon: 'mail',
    title: 'Reminder templates',
    body: 'Write the message once with placeholders for invoice number, amount and due date. Every reminder is logged.',
  },
  {
    icon: 'tasks',
    title: 'Follow-up tasks',
    body: 'Assign a call or email to a teammate with a due date, then work the queue oldest-first.',
  },
  {
    icon: 'customers',
    title: 'Customer payment history',
    body: 'Open a customer to see every invoice, what they have paid and what is still outstanding.',
  },
  {
    icon: 'download',
    title: 'CSV import and export',
    body: 'Bring customers and invoices in, and take invoices, payments and reports out for your accountant.',
  },
  {
    icon: 'bell',
    title: 'Overdue and expected collections',
    body: 'Prioritise the largest overdue balances and see what you can realistically expect to collect next.',
  },
]

const steps = [
  {
    step: '01',
    title: 'Set up your business and customers',
    body: 'Name the business, pick INR, and add the customers you bill — or import them from a CSV.',
  },
  {
    step: '02',
    title: 'Raise invoices and record payments',
    body: 'Add line items with quantities and rates. Log each payment as it arrives and the balance updates itself.',
  },
  {
    step: '03',
    title: 'Work the daily queue',
    body: 'Open the dashboard, clear overdue follow-ups, send queued reminders, then export the ageing report for review.',
  },
]

const currentYear = new Date().getFullYear()

const statusStyles = {
  rose: 'bg-rose-50 text-rose-700 ring-rose-200',
  amber: 'bg-amber-50 text-amber-800 ring-amber-200',
  slate: 'bg-slate-100 text-slate-700 ring-slate-200',
}

function NavBar() {
  const { session, loading } = useAuth()
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-6 px-4 sm:px-6">
        <Link to="/" aria-label="CollectFlow home">
          <BrandLogo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          {loading ? (
            <span className="h-9 w-24 animate-pulse rounded-lg bg-slate-100" />
          ) : session ? (
            <>
              <span className="hidden text-xs text-slate-500 sm:block">
                {session.business.name}
              </span>
              <Link
                to="/dashboard"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
              >
                Open dashboard
                <Icon name="reports" size={16} />
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
              >
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

function PreviewCard() {
  return (
    <div className="relative">
      <div className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-to-tr from-teal-200/50 via-slate-100 to-white blur-xl" />
      <div className="card overflow-hidden shadow-lg shadow-slate-900/5">
        <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Receivables overview
            </p>
            <p className="text-sm font-semibold text-slate-900">Meridian Design Studio</p>
          </div>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-[11px] font-medium text-teal-800 ring-1 ring-teal-200">
            as of today
          </span>
        </div>

        <div className="grid grid-cols-2 divide-slate-200 border-b border-slate-200 sm:grid-cols-4 sm:divide-x">
          {[
            { label: 'Outstanding', value: '₹5,15,500', sub: '7 open invoices' },
            { label: 'Overdue', value: '₹2,59,000', sub: '4 invoices' },
            { label: 'Next 7 days', value: '₹64,500', sub: '2 reminders queued' },
            { label: 'Collected', value: '₹75,000', sub: 'this month' },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight text-slate-900">
                {stat.value}
              </p>
              <p className="text-[11px] text-slate-500">{stat.sub}</p>
            </div>
          ))}
        </div>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold text-slate-900">Ageing of outstanding balances</p>
            <div className="mt-3 space-y-2.5">
              {ageing.map((row) => (
                <div key={row.label} className="flex items-center gap-3 text-[11px]">
                  <span className="w-20 shrink-0 text-slate-500">{row.label}</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
                    <span
                      className={`block h-full rounded-full ${row.tone}`}
                      style={{ width: `${Math.max(row.share, 4)}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-right font-medium text-slate-700">
                    ₹{row.amount}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-slate-900">Needs attention</p>
            <ul className="mt-3 space-y-2">
              {invoices.map((invoice) => (
                <li
                  key={invoice.number}
                  className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate text-[12px] font-medium text-slate-900">
                      {invoice.customer}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {invoice.number} · due {invoice.due}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[12px] font-semibold text-slate-900">₹{invoice.amount}</p>
                    <span
                      className={`mt-0.5 inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium ring-1 ${statusStyles[invoice.tone]}`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export function LandingPage() {
  const { session } = useAuth()

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <NavBar />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-teal-100/70 blur-3xl" />
          <div className="pointer-events-none absolute -left-32 top-40 h-72 w-72 rounded-full bg-slate-100 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 lg:pt-20">
            <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-teal-800">
                  <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                  For small Indian B2B service businesses
                </p>
                <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl">
                  Know what you&rsquo;re owed,
                  <span className="text-teal-700"> what needs attention</span>, and which follow-ups
                  are overdue.
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
                  CollectFlow keeps invoices, payments and follow-ups in one place. Instead of
                  reconciling a spreadsheet with your inbox at month end, you open one dashboard and
                  work the list.
                </p>

                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Link
                    to={session ? '/dashboard' : '/register'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-700 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-teal-800"
                  >
                    {session ? 'Open dashboard' : 'Create your account'}
                  </Link>
                  <Link
                    to={session ? '/invoices' : '/login'}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    {session ? 'View invoices' : 'Sign in'}
                  </Link>
                </div>

                {!session && (
                  <p className="mt-4 text-xs text-slate-500">
                    Want to look around first? Sign in to the demo workspace with{' '}
                    <span className="font-medium text-slate-700">demo@collectflow.app</span> /{' '}
                    <span className="font-medium text-slate-700">demo12345</span>.
                  </p>
                )}
              </div>

              <PreviewCard />
            </div>
          </div>
        </section>

        {/* Problem */}
        <section className="border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                The gap
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Receivables usually live in four places at once
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                Each tool holds a piece of the truth. The cost is not the missing invoice — it is
                not knowing which ones are overdue until someone reminds you.
              </p>
            </div>

            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {problems.map((problem) => (
                <div key={problem.title} className="card p-5">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <Icon name={problem.icon} size={18} />
                  </span>
                  <h3 className="mt-3.5 text-sm font-semibold text-slate-900">{problem.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{problem.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Product */}
        <section id="product" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                Product
              </p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                One workspace for the whole collections cycle
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                From raising the invoice to closing the balance — with the history of every call,
                message and reminder kept alongside it.
              </p>
            </div>

            <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="rounded-xl border border-slate-200 bg-white p-5 transition hover:border-teal-300 hover:shadow-sm"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-700">
                    <Icon name={feature.icon} size={18} />
                  </span>
                  <h3 className="mt-3.5 text-sm font-semibold text-slate-900">{feature.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{feature.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="scroll-mt-20 border-y border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  How it works
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  A routine you can keep up with daily
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Three steps to set up, then a short daily pass over the queue: clear the
                  follow-ups that are due, send what is queued, check the numbers.
                </p>
                <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    What we don&rsquo;t claim
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                    CollectFlow does not promise your customers will pay faster. It makes sure you
                    know what is owed, which follow-up is due, and where the money is stuck.
                  </p>
                </div>
              </div>

              <ol className="space-y-4">
                {steps.map((step) => (
                  <li key={step.step} className="card flex gap-4 p-5">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-700 text-xs font-semibold text-white">
                      {step.step}
                    </span>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        {/* Reports */}
        <section id="reports" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
                  Reports
                </p>
                <h2 className="mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Answer the questions your accountant asks
                </h2>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">
                  Every report is built from the invoices and payments you have recorded, so the
                  numbers you present are the numbers in the ledger.
                </p>
                <ul className="mt-6 space-y-3">
                  {[
                    {
                      title: 'Invoice ageing',
                      body: 'Bucket every outstanding rupee by how long it has been owed.',
                    },
                    {
                      title: 'Overdue invoices',
                      body: 'Filter to what is late today, largest balance first, with contact details.',
                    },
                    {
                      title: 'Expected collections',
                      body: 'See what should land in the next few weeks based on due dates.',
                    },
                    {
                      title: 'CSV exports',
                      body: 'Hand invoices and payments to your accountant in a format they can open.',
                    },
                  ].map((item) => (
                    <li key={item.title} className="flex gap-3">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-700">
                        <Icon name="check" size={12} />
                      </span>
                      <p className="text-sm leading-relaxed text-slate-600">
                        <span className="font-medium text-slate-900">{item.title}.</span>{' '}
                        {item.body}
                      </p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="card overflow-hidden">
                <div className="border-b border-slate-200 px-5 py-3">
                  <p className="text-sm font-semibold text-slate-900">Ageing summary</p>
                  <p className="text-[11px] text-slate-500">Based on due dates and payments</p>
                </div>
                <div className="space-y-4 px-5 py-5">
                  {ageing.map((row) => (
                    <div key={row.label}>
                      <div className="flex items-baseline justify-between text-xs">
                        <span className="font-medium text-slate-700">{row.label}</span>
                        <span className="text-slate-500">₹{row.amount}</span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${row.tone}`}
                          style={{ width: `${Math.max(row.share, 4)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
                  <span className="text-xs font-medium text-slate-600">Total outstanding</span>
                  <span className="text-sm font-semibold text-slate-900">₹5,15,500</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
          <div className="relative overflow-hidden rounded-2xl bg-slate-900 px-6 py-12 text-center sm:px-12">
            <div className="pointer-events-none absolute -left-20 -top-24 h-72 w-72 rounded-full bg-teal-500/25 blur-3xl" />
            <div className="pointer-events-none absolute -right-16 bottom-0 h-64 w-64 rounded-full bg-teal-400/10 blur-3xl" />
            <div className="relative">
              <h2 className="mx-auto max-w-2xl text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Start with a clean view of your receivables
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300">
                Set up your business, add the invoices that are open today, and let the dashboard
                tell you what to chase.
              </p>
              <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
                <Link
                  to={session ? '/dashboard' : '/register'}
                  className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-100"
                >
                  {session ? 'Open dashboard' : 'Create your account'}
                </Link>
                <Link
                  to={session ? '/reports' : '/login'}
                  className="inline-flex items-center justify-center rounded-lg border border-white/25 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {session ? 'See reports' : 'Sign in'}
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-center md:justify-between">
          <div>
            <BrandLogo subtitle="Receivables" />
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-slate-500">
              A receivables workspace for small B2B service businesses in India. Invoices, payments,
              reminders and follow-ups in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-slate-600">
            <a href="#product" className="hover:text-teal-700">
              Product
            </a>
            <a href="#workflow" className="hover:text-teal-700">
              How it works
            </a>
            <a href="#reports" className="hover:text-teal-700">
              Reports
            </a>
            <Link to="/login" className="hover:text-teal-700">
              Sign in
            </Link>
            <Link to="/register" className="hover:text-teal-700">
              Create account
            </Link>
          </div>
        </div>
        <div className="border-t border-slate-100">
          <p className="mx-auto max-w-6xl px-4 py-4 text-[11px] text-slate-500 sm:px-6">
            © {currentYear} CollectFlow
          </p>
        </div>
      </footer>
    </div>
  )
}
