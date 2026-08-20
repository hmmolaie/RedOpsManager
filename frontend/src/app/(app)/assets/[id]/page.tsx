'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import type { Asset, MitreTacticColumn, MitreTech } from '@/lib/types';
import { Badge } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, Textarea, Input, Label } from '@/components/ui/input';
import { cn, isOperator, severityColor } from '@/lib/utils';
import { useAuth } from '@/lib/auth-store';

export default function AssetAttackPage() {
  const { id } = useParams<{ id: string }>();
  const role = useAuth((s) => s.user?.role);
  const qc = useQueryClient();
  const [tacticId, setTacticId] = useState<string | null>(null);
  const [technique, setTechnique] = useState<MitreTech | null>(null);
  const [subId, setSubId] = useState<string>('');
  const [armId, setArmId] = useState('');
  const [toolId, setToolId] = useState('');
  const [python, setPython] = useState('');

  const asset = useQuery({ queryKey: ['asset', id], queryFn: () => api<any>(`/assets/${id}`) });
  const matrix = useQuery({ queryKey: ['mitre'], queryFn: () => api<MitreTacticColumn[]>('/mitre/matrix') });
  const arms = useQuery({ queryKey: ['agents'], queryFn: () => api<Array<{ id: string; name: string }>>('/agents') });
  const tools = useQuery({ queryKey: ['tools'], queryFn: () => api<Array<any>>('/tools') });

  const selectedTactic = matrix.data?.find((t) => t.id === tacticId);
  const selectedTool = tools.data?.find((t) => t.id === toolId);
  const subs = useMemo(
    () => selectedTactic?.subtechniques.filter((s) => s.parentMitreId === technique?.mitreId) ?? [],
    [selectedTactic, technique],
  );

  const launch = useMutation({
    mutationFn: () =>
      api('/activities', {
        method: 'POST',
        body: JSON.stringify({
          assetId: id,
          executionArmId: armId,
          toolTemplateId: selectedTool?.id,
          mitreTacticId: tacticId,
          mitreTechniqueId: subId || technique?.id,
          title: `${selectedTool?.tool || 'job'} on ${(asset.data as Asset).name} / ${technique?.mitreId}`,
          tool: selectedTool?.tool || 'custom',
          command: selectedTool?.command,
          pythonCode: python || undefined,
        }),
      }),
    onSuccess: () => {
      toast.success('Job queued on the execution arm');
      qc.invalidateQueries({ queryKey: ['asset', id] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!asset.data || !matrix.data) return <p className="text-muted-foreground">Loading ATT&CK workspace…</p>;
  const a = asset.data as Asset & { contract: { id: string; code: string; title: string }; activities: any[]; findings: any[] };

  return (
    <div className="space-y-5">
      <div>
        <Link href={`/contracts/${a.contract.id}`} className="text-xs text-primary hover:underline">
          ← {a.contract.code}
        </Link>
        <h1 className="text-xl font-semibold">{a.name}</h1>
        <p className="font-mono text-xs text-muted-foreground">
          {a.type} · {a.value}
        </p>
        <Badge className={cn('mt-2', severityColor[a.criticality])}>{a.criticality}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>MITRE ATT&CK Enterprise matrix</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className="flex min-w-max gap-2">
              {matrix.data.map((col) => (
                <div key={col.id} className="w-40 shrink-0">
                  <button
                    onClick={() => {
                      setTacticId(col.id);
                      setTechnique(null);
                      setSubId('');
                    }}
                    className={cn(
                      'mb-2 w-full rounded-md px-2 py-2 text-left text-[11px] font-semibold uppercase tracking-wide',
                      tacticId === col.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground',
                    )}
                  >
                    {col.name}
                  </button>
                  <div className="space-y-1">
                    {col.techniques.map((tech) => (
                      <button
                        key={tech.id}
                        onClick={() => {
                          setTacticId(col.id);
                          setTechnique(tech);
                          setSubId('');
                        }}
                        className={cn(
                          'w-full rounded border px-1.5 py-1 text-left text-[10px] leading-tight',
                          technique?.id === tech.id
                            ? 'border-primary bg-accent text-accent-foreground'
                            : 'border-border bg-card hover:border-primary/40',
                        )}
                      >
                        <div className="font-mono text-[9px] text-muted-foreground">{tech.mitreId}</div>
                        {tech.name}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Launch job on execution arm</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm">
            <p>
              Tactic:{' '}
              <strong>{selectedTactic ? `${selectedTactic.mitreId} ${selectedTactic.name}` : 'Select a tactic'}</strong>
            </p>
            <p>
              Technique: <strong>{technique ? `${technique.mitreId} ${technique.name}` : 'Select a technique'}</strong>
            </p>
            {subs.length > 0 && (
              <div>
                <Label>Sub-technique (optional)</Label>
                <Select value={subId} onChange={(e) => setSubId(e.target.value)}>
                  <option value="">None</option>
                  {subs.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.mitreId} {s.name}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div>
              <Label>Execution arm</Label>
              <Select value={armId} onChange={(e) => setArmId(e.target.value)}>
                <option value="">Select arm…</option>
                {arms.data?.map((arm) => (
                  <option key={arm.id} value={arm.id}>
                    {arm.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label>Tool template</Label>
              <Select value={toolId} onChange={(e) => setToolId(e.target.value)}>
                <option value="">Select tool…</option>
                {tools.data?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
            </div>
            {selectedTool?.command && (
              <p className="font-mono text-[11px] text-muted-foreground">{selectedTool.command}</p>
            )}
            {selectedTool?.tool === 'python' && (
              <div>
                <Label>Python forwarded to the arm (not executed by the API)</Label>
                <Textarea value={python} onChange={(e) => setPython(e.target.value)} rows={6} />
              </div>
            )}
            {isOperator(role) && (
              <Button
                disabled={!tacticId || !technique || !armId || !toolId || launch.isPending}
                onClick={() => launch.mutate()}
              >
                Queue job
              </Button>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium">Previous activities on this asset</h3>
            <ul className="space-y-2 text-sm">
              {a.activities?.map((act: any) => (
                <li key={act.id} className="rounded border border-border p-2">
                  <Link href={`/activities/${act.id}`} className="hover:underline">
                    {act.title}
                  </Link>
                  <div className="text-[11px] text-muted-foreground">
                    {act.status} · {act.technique?.mitreId || '—'}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
