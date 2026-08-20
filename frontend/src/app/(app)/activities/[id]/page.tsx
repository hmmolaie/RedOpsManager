'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { api } from '@/lib/api';
import { Badge } from '@/components/ui/card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { statusColor } from '@/lib/utils';

export default function ActivityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useQuery({
    queryKey: ['activity', id],
    queryFn: () => api<any>(`/activities/${id}`),
  });
  if (!data) return <p className="text-muted-foreground">Loading activity…</p>;
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{data.title}</h1>
        <div className="mt-2 flex gap-2">
          <Badge className={statusColor[data.status]}>{data.status}</Badge>
          <Badge className="border-border">{data.tool}</Badge>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <div>Asset: {data.asset?.name} ({data.asset?.value})</div>
          <div>Contract: {data.contract?.code}</div>
          <div>Arm: {data.executionArm?.name}</div>
          <div>
            MITRE: {data.tactic?.mitreId} / {data.technique?.mitreId} {data.technique?.name}
          </div>
          {data.command && <pre className="mt-2 overflow-auto rounded bg-secondary p-3 text-xs">{data.command}</pre>}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Structured result (JSONB)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="max-h-[480px] overflow-auto rounded bg-secondary p-3 text-xs">
            {JSON.stringify(data.result, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
