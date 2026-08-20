'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Contract, Paginated } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { canWrite, formatDay, statusColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function ContractsPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api<Paginated<Contract>>('/contracts?limit=50'),
  });
  const orgs = useQuery({
    queryKey: ['orgs'],
    queryFn: () => api<Paginated<{ id: string; name: string }>>('/organizations?limit=50'),
    enabled: role === 'SUPER_ADMIN',
  });

  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/contracts', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Contract created');
      qc.invalidateQueries({ queryKey: ['contracts'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Contracts</h1>
          <p className="text-sm text-muted-foreground">Engagements scoped to your organization (or all orgs for SuperAdmin).</p>
        </div>
        {canWrite(role) && <Button onClick={() => setOpen(true)}>New contract</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Code</TH>
            <TH>Title</TH>
            <TH>Org</TH>
            <TH>Status</TH>
            <TH>Window</TH>
            <TH>Findings</TH>
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
              <TD className="text-muted-foreground">{c.organization?.name}</TD>
              <TD>
                <Badge className={statusColor[c.status]}>{c.status}</Badge>
              </TD>
              <TD className="text-muted-foreground">
                {formatDay(c.startDate)} → {formatDay(c.endDate)}
              </TD>
              <TD>{c._count?.findings ?? 0}</TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <Dialog open={open} onClose={() => setOpen(false)} title="Create contract">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            create.mutate({
              code: fd.get('code'),
              title: fd.get('title'),
              description: fd.get('description'),
              startDate: fd.get('startDate'),
              endDate: fd.get('endDate'),
              amount: Number(fd.get('amount')),
              currency: fd.get('currency') || 'USD',
              organizationId: fd.get('organizationId') || undefined,
            });
          }}
        >
          {role === 'SUPER_ADMIN' && (
            <div>
              <Label>Organization</Label>
              <Select name="organizationId" required>
                <option value="">Select…</option>
                {orgs.data?.items.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </Select>
            </div>
          )}
          <div>
            <Label>Code</Label>
            <Input name="code" required placeholder="ACME-PT-2026-002" />
          </div>
          <div>
            <Label>Title</Label>
            <Input name="title" required />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea name="description" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start</Label>
              <Input name="startDate" type="date" required />
            </div>
            <div>
              <Label>End</Label>
              <Input name="endDate" type="date" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount</Label>
              <Input name="amount" type="number" min={0} required />
            </div>
            <div>
              <Label>Currency</Label>
              <Input name="currency" defaultValue="USD" />
            </div>
          </div>
          <Button type="submit" disabled={create.isPending}>
            Create
          </Button>
        </form>
      </Dialog>
    </div>
  );
}
