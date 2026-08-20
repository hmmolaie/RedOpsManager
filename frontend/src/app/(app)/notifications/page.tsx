'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ['notifications-all'],
    queryFn: () => api<any[]>('/notifications'),
  });
  const readAll = useMutation({
    mutationFn: () => api('/notifications/read-all', { method: 'PATCH' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['notifications-all'] });
    },
  });
  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <h1 className="text-xl font-semibold">Notifications</h1>
        <Button variant="outline" size="sm" onClick={() => readAll.mutate()}>
          Mark all read
        </Button>
      </div>
      <ul className="space-y-2">
        {data?.map((n) => (
          <li key={n.id} className="rounded-md border border-border p-3">
            <div className="flex justify-between text-sm">
              <strong>{n.title}</strong>
              <span className="text-xs text-muted-foreground">{formatDate(n.createdAt)}</span>
            </div>
            <p className="text-sm text-muted-foreground">{n.body}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
