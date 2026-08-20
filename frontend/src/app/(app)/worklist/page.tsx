'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Contract, Paginated } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDay, statusColor } from '@/lib/utils';

export default function WorklistPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['worklist'],
    queryFn: () => api<Paginated<Contract>>('/contracts/worklist'),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Pentester worklist</h1>
        <p className="text-sm text-muted-foreground">
          Only contracts assigned to you that are Draft or Active. Terminated and completed engagements disappear automatically.
        </p>
      </div>
      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <THead>
            <TR>
              <TH>Code</TH>
              <TH>Title</TH>
              <TH>Status</TH>
              <TH>Window</TH>
              <TH>Assets</TH>
            </TR>
          </THead>
          <TBody>
            {data?.items.map((c) => (
              <TR key={c.id}>
                <TD className="font-mono text-xs">
                  <Link className="text-primary hover:underline" href={`/contracts/${c.id}`}>
                    {c.code}
                  </Link>
                </TD>
                <TD>{c.title}</TD>
                <TD>
                  <Badge className={statusColor[c.status]}>{c.status}</Badge>
                </TD>
                <TD className="text-muted-foreground">
                  {formatDay(c.startDate)} → {formatDay(c.endDate)}
                </TD>
                <TD>{c._count?.assets ?? 0}</TD>
              </TR>
            ))}
            {data?.items.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  No active work assigned.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      )}
    </div>
  );
}
