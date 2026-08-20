'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { canWrite, statusColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function AgentsPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['agents'], queryFn: () => api<any[]>('/agents') });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/agents', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Execution arm saved — credentials encrypted at rest');
      qc.invalidateQueries({ queryKey: ['agents'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: (id: string) => api(`/agents/${id}/test`, { method: 'POST' }),
    onSuccess: () => toast.success('Connection test queued'),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">Execution arms</h1>
          <p className="text-sm text-muted-foreground">
            Remote agents (SSH, API key, bearer, custom headers, or the built-in simulator). Secrets are AES-256-GCM encrypted.
          </p>
        </div>
        {canWrite(role) && <Button onClick={() => setOpen(true)}>New arm</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Type</TH>
            <TH>Host</TH>
            <TH>Status</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {data?.map((a) => (
            <TR key={a.id}>
              <TD>{a.name}</TD>
              <TD className="font-mono text-xs">{a.connectionType}</TD>
              <TD>{a.host || '—'}</TD>
              <TD>
                <Badge className={statusColor[a.status] || 'border-border'}>{a.status}</Badge>
              </TD>
              <TD>
                <Button size="sm" variant="outline" onClick={() => test.mutate(a.id)}>
                  Test
                </Button>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Dialog open={open} onClose={() => setOpen(false)} title="Define execution arm">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            create.mutate({
              name: fd.get('name'),
              description: fd.get('description'),
              connectionType: fd.get('connectionType'),
              host: fd.get('host') || undefined,
              port: fd.get('port') ? Number(fd.get('port')) : undefined,
              credentials: {
                username: String(fd.get('username') || '') || undefined,
                password: String(fd.get('password') || '') || undefined,
                apiKey: String(fd.get('apiKey') || '') || undefined,
                token: String(fd.get('token') || '') || undefined,
                baseUrl: String(fd.get('baseUrl') || '') || undefined,
              },
            });
          }}
        >
          <Input name="name" placeholder="Name" required />
          <Textarea name="description" placeholder="Description" />
          <Select name="connectionType" defaultValue="SIMULATOR">
            <option>SIMULATOR</option>
            <option>SSH_PASSWORD</option>
            <option>SSH_KEY</option>
            <option>API_KEY</option>
            <option>BEARER_TOKEN</option>
            <option>CUSTOM_HEADERS</option>
            <option>HTTP</option>
          </Select>
          <Input name="host" placeholder="Host / URL" />
          <Input name="port" type="number" placeholder="Port" />
          <Input name="username" placeholder="SSH username" />
          <Input name="password" type="password" placeholder="Password" />
          <Input name="apiKey" placeholder="API key" />
          <Input name="token" placeholder="Bearer token" />
          <Input name="baseUrl" placeholder="Agent base URL" />
          <Button type="submit">Save</Button>
        </form>
      </Dialog>
    </div>
  );
}
