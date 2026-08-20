'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { severityColor, statusColor } from '@/lib/utils';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';

export default function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api<any>('/dashboard'),
  });

  if (isLoading || !data) return <p className="text-muted-foreground">Loading dashboard…</p>;
  const k = data.kpis;

  const tiles = [
    { label: 'Worklist', value: k.worklist, href: '/worklist' },
    { label: 'Contracts', value: k.contracts, href: '/contracts' },
    { label: 'Assets', value: k.assets, href: '/contracts' },
    { label: 'Open findings', value: k.findingsOpen, href: '/findings' },
    { label: 'Users', value: k.users, href: '/users' },
    { label: 'Organizations', value: k.organizations, href: '/organizations' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Command dashboard</h1>
        <p className="text-sm text-muted-foreground">Role-aware snapshot of authorized engagement work.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map((t) => (
          <Link key={t.label} href={t.href}>
            <Card className="hover:border-primary/40">
              <CardHeader>
                <CardTitle className="text-muted-foreground">{t.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold">{t.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent activities</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Title</TH>
                  <TH>Status</TH>
                  <TH>Asset</TH>
                </TR>
              </THead>
              <TBody>
                {data.recentActivities?.map((a: any) => (
                  <TR key={a.id}>
                    <TD>{a.title}</TD>
                    <TD>
                      <Badge className={statusColor[a.status]}>{a.status}</Badge>
                    </TD>
                    <TD className="text-muted-foreground">{a.asset?.name}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Recent findings</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <THead>
                <TR>
                  <TH>Title</TH>
                  <TH>Severity</TH>
                </TR>
              </THead>
              <TBody>
                {data.recentFindings?.map((f: any) => (
                  <TR key={f.id}>
                    <TD>{f.title}</TD>
                    <TD>
                      <Badge className={severityColor[f.severity]}>{f.severity}</Badge>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
