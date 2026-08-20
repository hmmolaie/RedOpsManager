'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Finding, Paginated } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { isOperator, severityColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function FindingsPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['findings'],
    queryFn: () => api<Paginated<Finding>>('/findings?limit=100'),
  });
  const contracts = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api<Paginated<{ id: string; code: string; title: string }>>('/contracts?limit=50'),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/findings', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Finding recorded');
      qc.invalidateQueries({ queryKey: ['findings'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">Findings</h1>
          <p className="text-sm text-muted-foreground">Evidence can be attached per finding from the API (`POST /findings/:id/evidence`).</p>
        </div>
        {isOperator(role) && <Button onClick={() => setOpen(true)}>New finding</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Title</TH>
            <TH>Severity</TH>
            <TH>Status</TH>
            <TH>Contract</TH>
            <TH>Asset</TH>
          </TR>
        </THead>
        <TBody>
          {data?.items.map((f) => (
            <TR key={f.id}>
              <TD>{f.title}</TD>
              <TD>
                <Badge className={severityColor[f.severity]}>{f.severity}</Badge>
              </TD>
              <TD>{f.status}</TD>
              <TD className="text-muted-foreground">{f.contract?.code}</TD>
              <TD className="text-muted-foreground">{f.asset?.name}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Dialog open={open} onClose={() => setOpen(false)} title="Record finding">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(Object.fromEntries(new FormData(e.currentTarget).entries()));
          }}
        >
          <Select name="contractId" required>
            <option value="">Contract…</option>
            {contracts.data?.items.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} — {c.title}
              </option>
            ))}
          </Select>
          <Input name="title" placeholder="Title" required />
          <Textarea name="description" placeholder="Description" required />
          <Select name="severity" defaultValue="MEDIUM">
            <option>CRITICAL</option>
            <option>HIGH</option>
            <option>MEDIUM</option>
            <option>LOW</option>
            <option>INFO</option>
          </Select>
          <Textarea name="recommendation" placeholder="Recommendation" />
          <Button type="submit">Save</Button>
        </form>
      </Dialog>
    </div>
  );
}
