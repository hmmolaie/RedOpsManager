'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input, Select } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { canWrite } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function AiPage() {
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['ai'], queryFn: () => api<any[]>('/ai-endpoints') });
  const create = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api('/ai-endpoints', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('AI endpoint stored (API key encrypted)');
      qc.invalidateQueries({ queryKey: ['ai'] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <div>
          <h1 className="text-xl font-semibold">AI configuration</h1>
          <p className="text-sm text-muted-foreground">Multiple OpenAI-compatible, Azure, Anthropic, Ollama, or custom endpoints.</p>
        </div>
        {canWrite(role) && <Button onClick={() => setOpen(true)}>Add endpoint</Button>}
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Name</TH>
            <TH>Provider</TH>
            <TH>Base URL</TH>
            <TH>Model</TH>
            <TH>Key</TH>
          </TR>
        </THead>
        <TBody>
          {data?.map((e) => (
            <TR key={e.id}>
              <TD>{e.name}</TD>
              <TD>{e.provider}</TD>
              <TD className="font-mono text-xs">{e.baseUrl}</TD>
              <TD>{e.model}</TD>
              <TD>
                <Badge className="border-border">{e.hasApiKey ? 'encrypted' : 'none'}</Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
      <Dialog open={open} onClose={() => setOpen(false)} title="AI endpoint">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(Object.fromEntries(new FormData(e.currentTarget).entries()));
          }}
        >
          <Input name="name" placeholder="Name" required />
          <Select name="provider" defaultValue="OPENAI">
            <option>OPENAI</option>
            <option>AZURE_OPENAI</option>
            <option>ANTHROPIC</option>
            <option>OLLAMA</option>
            <option>CUSTOM</option>
          </Select>
          <Input name="baseUrl" placeholder="https://api.openai.com/v1" required />
          <Input name="model" placeholder="gpt-4o" required />
          <Input name="apiKey" type="password" placeholder="API key" />
          <Button type="submit">Save</Button>
        </form>
      </Dialog>
    </div>
  );
}
