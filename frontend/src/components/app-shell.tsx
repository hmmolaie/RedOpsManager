'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  Bell,
  Building2,
  FileText,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Radar,
  ScrollText,
  Server,
  Shield,
  Sparkles,
  Users,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-store';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/worklist', label: 'Worklist', icon: ListChecks },
  { href: '/contracts', label: 'Contracts', icon: FileText },
  { href: '/findings', label: 'Findings', icon: Shield },
  { href: '/agents', label: 'Execution Arms', icon: Server },
  { href: '/ai', label: 'AI Config', icon: Sparkles },
  { href: '/users', label: 'Users', icon: Users, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
  { href: '/organizations', label: 'Organizations', icon: Building2 },
  { href: '/tools', label: 'Tool Templates', icon: Wrench },
  { href: '/reports', label: 'Reports', icon: ScrollText },
  { href: '/audit', label: 'Audit Log', icon: Activity, roles: ['SUPER_ADMIN', 'ORG_ADMIN'] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, accessToken, clear } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => setReady(true), []);
  useEffect(() => {
    if (ready && !accessToken) router.replace('/login');
  }, [ready, accessToken, router]);

  const notes = useQuery({
    queryKey: ['notifications'],
    queryFn: () => api<Array<{ id: string; readAt: string | null }>>('/notifications?unread=true'),
    enabled: Boolean(accessToken),
    refetchInterval: 20000,
  });

  if (!ready || !accessToken || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Loading…</div>;
  }

  const nav = NAV.filter((n) => !n.roles || n.roles.includes(user.role));

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 flex-col border-r border-border bg-card/80 backdrop-blur">
        <div className="flex items-center gap-2 px-5 py-5">
          <Radar className="h-5 w-5 text-primary" />
          <div>
            <div className="text-sm font-semibold tracking-wide">RedOps</div>
            <div className="text-[11px] text-muted-foreground">Manager</div>
          </div>
        </div>
        <nav className="flex-1 space-y-0.5 px-3">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground hover:bg-secondary hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          Authorized operations only
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-card/60 px-6 py-3 backdrop-blur">
          <div className="text-sm text-muted-foreground">
            {user.organization?.name || 'Platform'} · {user.role.replace('_', ' ')}
          </div>
          <div className="flex items-center gap-3">
            <Link href="/notifications" className="relative rounded-md p-2 hover:bg-secondary">
              <Bell className="h-4 w-4" />
              {(notes.data?.length ?? 0) > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Link>
            <div className="text-right text-xs">
              <div className="font-medium text-foreground">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-muted-foreground">{user.email}</div>
            </div>
            <button
              onClick={() => {
                clear();
                router.replace('/login');
              }}
              className="rounded-md p-2 hover:bg-secondary"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
