import { BrandLogo } from '../components/logo'

export function AuthLayout({ title, subtitle, children, footer }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <div className="relative hidden w-full flex-col justify-between overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:w-[46%]">
        <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-teal-600/30 blur-3xl" />
        <div className="absolute -right-16 bottom-0 h-72 w-72 rounded-full bg-emerald-500/20 blur-3xl" />

        <div className="relative">
          <BrandLogo size="lg" tone="dark" />

          <div className="mt-16 max-w-md">
            <h1 className="text-3xl font-semibold leading-tight tracking-tight">
              Know what you are owed, and what needs attention.
            </h1>
            <p className="mt-4 text-sm leading-relaxed text-slate-300">
              CollectFlow brings invoices, payment follow-ups and ageing into one place so a small
              business can run its collections from a single screen instead of five.
            </p>

            <ul className="mt-10 space-y-4 text-sm">
              {[
                'Track pending, partial, overdue and paid invoices in one ledger.',
                'See ageing and outstanding balances by customer, not by guesswork.',
                'Schedule reminder emails and keep every follow-up in the history.',
                'Plan expected collections from due dates and open balances.',
              ].map((item) => (
                <li key={item} className="flex gap-3 text-slate-200">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                    <svg
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                    >
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="relative text-xs text-slate-400">
          Built for small B2B service businesses. No payment promises, just a clearer view of what
          is due.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center bg-slate-50 px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <div className="mb-8 lg:hidden">
            <BrandLogo />
          </div>

          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h2>
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>

          <div className="mt-6">{children}</div>
          <div className="mt-6 text-sm text-slate-500">{footer}</div>
        </div>
      </div>
    </div>
  )
}
