// [HOST SHIM] Your __root.tsx already exists — do not copy. Add two nav links: Delivery agents (/delivery-agents) and Support (/support).
import type { QueryClient } from '@tanstack/react-query';
import { createRootRouteWithContext, Link, Outlet } from '@tanstack/react-router';
import { Bike, FileText, LifeBuoy } from 'lucide-react';

const NAV = [
  { to: '/listings', label: 'Listings', icon: FileText },
  { to: '/delivery-agents', label: 'Delivery agents', icon: Bike },
  { to: '/support', label: 'Support', icon: LifeBuoy },
] as const;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: () => (
    <div className="flex min-h-screen">
      <aside className="w-56 shrink-0 border-r border-border bg-card p-3">
        <p className="px-3 py-3 text-lg font-bold tracking-tight">Orqland Admin</p>
        <nav className="space-y-0.5">
          {NAV.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-text-secondary hover:bg-muted/60"
              activeProps={{ className: 'bg-muted font-medium text-foreground' }}
            >
              <n.icon className="size-4" /> {n.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1 p-8">
        <Outlet />
      </main>
    </div>
  ),
});
