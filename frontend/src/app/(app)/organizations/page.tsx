'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-store';

export default function OrganizationsPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['orgs'],
    queryFn: () => api<Paginated<any>>('/organizations?limit=50'),
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/organizations', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Organization created');
      qc.invalidateQueries({ queryKey: ['orgs'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">Organizations</h1>
          <p className="text-sm text-muted-foreground">Hard tenant isolation — contacts, contracts, and secrets never cross orgs.</p>
        </div>
        {role === 'SUPER_ADMIN' && <Button onClick={() => setOpen(true)}>New organization</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Slug</TH>
            <TH>Status</TH>
            <TH>Users</TH>
            <TH>Contracts</TH>
          </TR>
        </THead>
        <TBody>
          {data?.items.map((o) => (
            <TR key={o.id}>
              <TD>
                <Link className="text-primary hover:underline" href={`/organizations/${o.id}`}>
                  {o.name}
                </Link>
              </TD>
              <TD className="font-mono text-xs">{o.slug}</TD>
              <TD>
                <Badge className="border-border">{o.status}</Badge>
              </TD>
              <TD>{o._count?.users}</TD>
              <TD>{o._count?.contracts}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create organization">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            create.mutate({
              name: fd.get('name'),
              industry: fd.get('industry'),
              website: fd.get('website'),
              description: fd.get('description'),
            });
          }}
        >
          <Input name="name" placeholder="Name" required />
          <Input name="industry" placeholder="Industry" />
          <Input name="website" placeholder="https://" />
          <Textarea name="description" placeholder="Description" />
          <Button type="submit">Create</Button>
        </form>
      </Dialog>
    </div>
  );
}
