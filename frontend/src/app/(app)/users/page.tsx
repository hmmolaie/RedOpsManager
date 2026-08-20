'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Paginated } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { Badge } from '@/components/ui/card';
import { canWrite } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function UsersPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ['users'],
    queryFn: () => api<Paginated<any>>('/users?limit=100'),
  });
  const orgs = useQuery({
    queryKey: ['orgs'],
    queryFn: () => api<Paginated<any>>('/organizations?limit=50'),
    enabled: role === 'SUPER_ADMIN',
  });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/users', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('User created');
      qc.invalidateQueries({ queryKey: ['users'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">Users & access</h1>
          <p className="text-sm text-muted-foreground">RBAC: SuperAdmin, OrgAdmin, Pentester, Viewer.</p>
        </div>
        {canWrite(role) && <Button onClick={() => setOpen(true)}>Invite user</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Email</TH>
            <TH>Role</TH>
            <TH>Status</TH>
            <TH>Org</TH>
          </TR>
        </THead>
        <TBody>
          {data?.items.map((u) => (
            <TR key={u.id}>
              <TD>
                {u.firstName} {u.lastName}
              </TD>
              <TD>{u.email}</TD>
              <TD>
                <Badge className="border-border">{u.role}</Badge>
              </TD>
              <TD>{u.status}</TD>
              <TD className="text-muted-foreground">{u.organization?.name || '—'}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Dialog open={open} onClose={() => setOpen(false)} title="Create user">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            const raw = Object.fromEntries(fd.entries());
            if (!raw.organizationId) delete raw.organizationId;
            create.mutate(raw);
          }}
        >
          <Input name="firstName" placeholder="First name" required />
          <Input name="lastName" placeholder="Last name" required />
          <Input name="email" type="email" placeholder="Email" required />
          <Input name="password" type="password" placeholder="Password (min 10)" required minLength={10} />
          <Select name="role" defaultValue="PENTESTER">
            {role === 'SUPER_ADMIN' && <option>SUPER_ADMIN</option>}
            <option>ORG_ADMIN</option>
            <option>PENTESTER</option>
            <option>VIEWER</option>
          </Select>
          {role === 'SUPER_ADMIN' && (
            <Select name="organizationId">
              <option value="">Platform (SuperAdmin only)</option>
              {orgs.data?.items.map((o: any) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </Select>
          )}
          <Button type="submit">Create</Button>
        </form>
      </Dialog>
    </div>
  );
}
