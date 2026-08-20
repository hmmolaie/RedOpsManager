'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function ToolsPage() {
  const { data } = useQuery({ queryKey: ['tools'], queryFn: () => api<any[]>('/tools') });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-semibold">Tool templates</h1>
        <p className="text-sm text-muted-foreground">
          Commands are rendered with {'{{target}}'} and executed only on the selected execution arm — never on the API host for untrusted code.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {data?.map((t) => (
          <Card key={t.id}>
            <CardHeader>
              <CardTitle>
                {t.name} <span className="text-xs text-muted-foreground">{t.tool}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-2 text-sm text-muted-foreground">{t.description}</p>
              <pre className="overflow-auto rounded bg-secondary p-2 text-[11px]">{t.command}</pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
