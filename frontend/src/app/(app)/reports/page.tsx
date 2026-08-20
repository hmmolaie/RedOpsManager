'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { api, downloadAuth } from '@/lib/api';
import type { Paginated } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/input';
import { Table, TBody, TD, TH, THead, TR } from '@/components/ui/table';
import { formatDate, statusColor } from '@/lib/utils';
import { useState } from 'react';

export default function ReportsPage() {
  const qc = useQueryClient();
  const [contractId, setContractId] = useState('');
  const contracts = useQuery({
    queryKey: ['contracts'],
    queryFn: () => api<Paginated<{ id: string; code: string; title: string }>>('/contracts?limit=50'),
  });
  const reports = useQuery({ queryKey: ['reports'], queryFn: () => api<any[]>('/reports') });
  const generate = useMutation({
    mutationFn: (format: 'PDF' | 'DOCX') =>
      api('/reports', { method: 'POST', body: JSON.stringify({ contractId, format }) }),
    onSuccess: () => {
      toast.success('Report queued');
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Professional PDF and Word exports: executive summary, findings, assets, MITRE coverage, timeline, recommendations.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Select value={contractId} onChange={(e) => setContractId(e.target.value)} className="max-w-sm">
          <option value="">Select contract…</option>
          {contracts.data?.items.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} — {c.title}
            </option>
          ))}
        </Select>
        <Button disabled={!contractId} onClick={() => generate.mutate('PDF')}>
          Generate PDF
        </Button>
        <Button disabled={!contractId} variant="secondary" onClick={() => generate.mutate('DOCX')}>
          Generate Word
        </Button>
      </div>
      <Table>
        <THead>
          <TR>
            <TH>Title</TH>
            <TH>Format</TH>
            <TH>Status</TH>
            <TH>Created</TH>
            <TH></TH>
          </TR>
        </THead>
        <TBody>
          {reports.data?.map((r) => (
            <TR key={r.id}>
              <TD>{r.title}</TD>
              <TD>{r.format}</TD>
              <TD>
                <Badge className={statusColor[r.status] || 'border-border'}>{r.status}</Badge>
              </TD>
              <TD className="text-muted-foreground">{formatDate(r.createdAt)}</TD>
              <TD>
                {r.status === 'READY' && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => downloadAuth(`/reports/${r.id}/download`, `${r.title}.${r.format === 'PDF' ? 'pdf' : 'docx'}`)}
                  >
                    Download
                  </Button>
                )}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}
