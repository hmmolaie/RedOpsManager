'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { canWrite } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['org', id], queryFn: () => api<any>(`/organizations/${id}`) });
  const add = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api(`/organizations/${id}/contacts`, { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Contact added');
      qc.invalidateQueries({ queryKey: ['org', id] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!data) return <p className="text-muted-foreground">Loading…</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{data.name}</h1>
        <p className="text-sm text-muted-foreground">{data.description}</p>
      </div>
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Contact points</CardTitle>
          {canWrite(role) && (
            <Button size="sm" onClick={() => setOpen(true)}>
              Add contact
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {data.contacts?.map((c: any) => (
            <div key={c.id} className="rounded border border-border p-3 text-sm">
              <div className="text-xs uppercase text-muted-foreground">{c.type}</div>
              <div className="font-medium">{c.label}</div>
              <div>{c.value}</div>
              {c.personName && (
                <div className="text-muted-foreground">
                  {c.personName} · {c.personRole}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
      <Dialog open={open} onClose={() => setOpen(false)} title="Add contact">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            add.mutate(Object.fromEntries(new FormData(e.currentTarget).entries()));
          }}
        >
          <Select name="type" defaultValue="EMAIL">
            <option>PHONE</option>
            <option>EMAIL</option>
            <option>ADDRESS</option>
            <option>PERSON</option>
          </Select>
          <Input name="label" placeholder="Label" required />
          <Input name="value" placeholder="Value" required />
          <Input name="personName" placeholder="Person name (optional)" />
          <Input name="personRole" placeholder="Role (optional)" />
          <Button type="submit">Save</Button>
        </form>
      </Dialog>
    </div>
  );
}
