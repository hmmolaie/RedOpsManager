'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type { Paginated } from '@/lib/types';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDate } from '@/lib/utils';

export default function AuditPage() {
  const { data } = useQuery({
    queryKey: ['audit'],
    queryFn: () => api<Paginated<any>>('/audit-logs?limit=100'),
  });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Audit log</h1>
        <p className="text-sm text-muted-foreground">Immutable trail of authentication, mutations, and job dispatch.</p>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>When</TH>
            <TH>Actor</TH>
            <TH>Action</TH>
            <TH>Entity</TH>
          </TR>
        </THead>
        <TBody>
          {data?.items.map((row) => (
            <TR key={row.id}>
              <TD className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</TD>
              <TD className="text-xs">{row.actor?.email || 'system'}</TD>
              <TD className="font-mono text-xs">{row.action}</TD>
              <TD className="text-xs">
                {row.entityType} {row.entityId ? `· ${row.entityId.slice(0, 8)}` : ''}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
