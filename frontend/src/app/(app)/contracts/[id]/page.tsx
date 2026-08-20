'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Activity, Contract, Paginated } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog } from '@/components/ui/dialog';
import { Input, Label, Select, Textarea } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { canWrite, formatDate, severityColor, statusColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [assetOpen, setAssetOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [bulk, setBulk] = useState('');

  const { data: contract } = useQuery({
    queryKey: ['contract', id],
    queryFn: () => api<Contract>(`/contracts/${id}`),
  });
  const activities = useQuery({
    queryKey: ['activities', id],
    queryFn: () => api<Paginated<Activity>>(`/activities?contractId=${id}&limit=50`),
  });
  const findings = useQuery({
    queryKey: ['findings', id],
    queryFn: () => api<Paginated<any>>(`/findings?contractId=${id}&limit=50`),
  });
  const coverage = useQuery({
    queryKey: ['coverage', id],
    queryFn: () => api<any>(`/contracts/${id}/coverage`),
  });
  const users = useQuery({
    queryKey: ['users'],
    queryFn: () => api<Paginated<{ id: string; firstName: string; lastName: string; email: string }>>('/users?limit=100'),
    enabled: canWrite(role),
  });

  const update = useMutation({
    mutationFn: (status: string) => api(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    onSuccess: () => {
      toast.success('Contract status updated — terminated/completed items leave operator worklists.');
      qc.invalidateQueries({ queryKey: ['contract', id] });
      qc.invalidateQueries({ queryKey: ['worklist'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAsset = useMutation({
    mutationFn: (body: Record<string, unknown>) => api('/assets', { method: 'POST', body: JSON.stringify(body) }),
    onSuccess: () => {
      toast.success('Asset added');
      qc.invalidateQueries({ queryKey: ['contract', id] });
      setAssetOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const bulkImport = useMutation({
    mutationFn: () => {
      const items = bulk
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean)
        .map((line) => {
          const [type, value, name, criticality] = line.split(',').map((s) => s.trim());
          return { type, value, name: name || value, criticality: criticality || 'MEDIUM' };
        });
      return api('/assets/bulk', { method: 'POST', body: JSON.stringify({ contractId: id, items }) });
    },
    onSuccess: (res: any) => {
      toast.success(`Imported ${res.imported} assets`);
      qc.invalidateQueries({ queryKey: ['contract', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const assign = useMutation({
    mutationFn: (userIds: string[]) =>
      api(`/contracts/${id}/assignments`, { method: 'POST', body: JSON.stringify({ userIds }) }),
    onSuccess: () => {
      toast.success('Users assigned');
      qc.invalidateQueries({ queryKey: ['contract', id] });
      setAssignOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!contract) return <p className="text-muted-foreground">Loading contract…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-xs text-muted-foreground">{contract.code}</p>
          <h1 className="text-xl font-semibold">{contract.title}</h1>
          <p className="text-sm text-muted-foreground">{contract.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={statusColor[contract.status]}>{contract.status}</Badge>
          {canWrite(role) && (
            <Select defaultValue={contract.status} onChange={(e) => update.mutate(e.target.value)}>
              <option>DRAFT</option>
              <option>ACTIVE</option>
              <option>COMPLETED</option>
              <option>TERMINATED</option>
              <option>ARCHIVED</option>
            </Select>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Team</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {contract.assignments?.map((a) => (
              <div key={a.id}>
                {a.user.firstName} {a.user.lastName}{' '}
                <span className="text-muted-foreground">({a.user.email})</span>
              </div>
            ))}
            {canWrite(role) && (
              <Button size="sm" variant="outline" onClick={() => setAssignOpen(true)}>
                Assign users
              </Button>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>MITRE coverage heatmap</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {coverage.data?.tactics?.map((t: any) => {
                const total = t.techniques.length || 1;
                const hit = t.techniques.filter((x: any) => x.count > 0).length;
                const pct = Math.round((hit / total) * 100);
                return (
                  <div key={t.id} className="rounded-md border border-border p-2">
                    <div className="text-[11px] text-muted-foreground">{t.mitreId}</div>
                    <div className="truncate text-xs font-medium">{t.name}</div>
                    <div
                      className="mt-2 h-1.5 rounded-full bg-secondary"
                      title={`${pct}%`}
                    >
                      <div
                        className="h-1.5 rounded-full bg-primary"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {hit}/{total}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Assets</CardTitle>
          <div className="flex gap-2">
            {canWrite(role) && (
              <>
                <Button size="sm" variant="outline" onClick={() => setAssetOpen(true)}>
                  Add asset
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Name</TH>
                <TH>Type</TH>
                <TH>Value</TH>
                <TH>Criticality</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {contract.assets?.map((a) => (
                <TR key={a.id}>
                  <TD>{a.name}</TD>
                  <TD>{a.type}</TD>
                  <TD className="font-mono text-xs">{a.value}</TD>
                  <TD>
                    <Badge className={severityColor[a.criticality]}>{a.criticality}</Badge>
                  </TD>
                  <TD>
                    <Link className="text-primary text-xs hover:underline" href={`/assets/${a.id}`}>
                      ATT&CK matrix →
                    </Link>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
          {canWrite(role) && (
            <div className="mt-4 space-y-2">
              <Label>Bulk import (CSV lines: type,value,name,criticality)</Label>
              <Textarea
                value={bulk}
                onChange={(e) => setBulk(e.target.value)}
                placeholder="DOMAIN,shop.acme.example,Shop,HIGH"
              />
              <Button size="sm" variant="secondary" onClick={() => bulkImport.mutate()} disabled={!bulk.trim()}>
                Import
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activities / scans</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>When</TH>
                <TH>Title</TH>
                <TH>Tool</TH>
                <TH>MITRE</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {activities.data?.items.map((a) => (
                <TR key={a.id}>
                  <TD className="text-xs text-muted-foreground">{formatDate(a.createdAt)}</TD>
                  <TD>
                    <Link className="hover:underline" href={`/activities/${a.id}`}>
                      {a.title}
                    </Link>
                  </TD>
                  <TD className="font-mono text-xs">{a.tool}</TD>
                  <TD className="text-xs">{a.technique?.mitreId || '—'}</TD>
                  <TD>
                    <Badge className={statusColor[a.status]}>{a.status}</Badge>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Findings</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <THead>
              <TR>
                <TH>Title</TH>
                <TH>Severity</TH>
                <TH>Status</TH>
              </TR>
            </THead>
            <TBody>
              {findings.data?.items.map((f: any) => (
                <TR key={f.id}>
                  <TD>{f.title}</TD>
                  <TD>
                    <Badge className={severityColor[f.severity]}>{f.severity}</Badge>
                  </TD>
                  <TD>{f.status}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={assetOpen} onClose={() => setAssetOpen(false)} title="Add asset">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            addAsset.mutate({
              contractId: id,
              name: fd.get('name'),
              type: fd.get('type'),
              value: fd.get('value'),
              criticality: fd.get('criticality'),
            });
          }}
        >
          <Input name="name" placeholder="Name" required />
          <Select name="type" defaultValue="DOMAIN">
            {['IP', 'DOMAIN', 'URL', 'SUBNET', 'HOST', 'APPLICATION', 'EMAIL', 'OTHER'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Input name="value" placeholder="Value (IP, host, URL…)" required />
          <Select name="criticality" defaultValue="MEDIUM">
            {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </Select>
          <Button type="submit">Save</Button>
        </form>
      </Dialog>

      <Dialog open={assignOpen} onClose={() => setAssignOpen(false)} title="Assign users">
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            assign.mutate([...fd.getAll('userId')] as string[]);
          }}
        >
          <div className="max-h-64 space-y-2 overflow-auto">
            {users.data?.items.map((u) => (
              <label key={u.id} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="userId" value={u.id} />
                {u.firstName} {u.lastName} — {u.email}
              </label>
            ))}
          </div>
          <Button type="submit">Assign</Button>
        </form>
      </Dialog>
    </div>
  );
}
