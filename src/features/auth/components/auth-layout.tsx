import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Gauge, ShieldCheck, TrendingUp, Wrench } from 'lucide-react';
import { Logo } from '@/components/layout/logo';
import { ThemeToggle } from '@/components/layout/theme-toggle';

const HIGHLIGHTS = [
  { icon: TrendingUp, title: 'Know your profit', body: 'Rent in, expenses out, margin per month and per mile.' },
  { icon: Wrench, title: 'Never miss a service', body: 'Mileage and date intervals with alerts before they come due.' },
  { icon: Gauge, title: 'Every mile tracked', body: 'Odometer history, fuel economy and cost per mile.' },
  { icon: ShieldCheck, title: 'Your money stays private', body: 'Maintenance crews see the truck, never the finances.' },
];

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <aside className="relative hidden overflow-hidden bg-[hsl(222_47%_9%)] p-10 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              'radial-gradient(60rem 40rem at 15% 10%, hsl(217 91% 60% / 0.35), transparent 60%), radial-gradient(50rem 40rem at 90% 90%, hsl(199 89% 48% / 0.25), transparent 55%)',
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        <div className="relative flex items-center gap-3">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="text-base font-semibold tracking-tight">FleetOps</p>
            <p className="text-xs text-white/60">Truck Rental & Fleet Management</p>
          </div>
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-semibold leading-tight tracking-tight text-balance">
              Everything about your truck, in one place.
            </h2>
            <p className="text-sm leading-relaxed text-white/70">
              Rental income, maintenance history, mileage, documents and profit — tracked from the
              day you hand over the keys.
            </p>
          </div>

          <ul className="space-y-4">
            {HIGHLIGHTS.map((item, index) => (
              <motion.li
                key={item.title}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.08 * index + 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="flex items-start gap-3"
              >
                <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15">
                  <item.icon className="size-4" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-medium">{item.title}</span>
                  <span className="block text-sm text-white/60">{item.body}</span>
                </span>
              </motion.li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/40">
          © {new Date().getFullYear()} FleetOps · Data encrypted at rest and in transit
        </p>
      </aside>

      {/* Form panel */}
      <main className="flex flex-col bg-background">
        <div className="flex items-center justify-between p-4 lg:justify-end">
          <div className="flex items-center gap-2 lg:hidden">
            <Logo size={28} />
            <span className="text-sm font-semibold">FleetOps</span>
          </div>
          <ThemeToggle />
        </div>

        <div className="flex flex-1 items-center justify-center px-5 pb-16">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="w-full max-w-sm space-y-7"
          >
            <header className="space-y-1.5">
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              <p className="text-sm text-muted-foreground text-balance">{subtitle}</p>
            </header>
            {children}
            {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
          </motion.div>
        </div>
      </main>
    </div>
  );
}
