'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-store';
import type { AuthUser } from '@/lib/types';

export default function LoginPage() {
  const router = useRouter();
  const setSession = useAuth((s) => s.setSession);
  const [email, setEmail] = useState('admin@redops.local');
  const [password, setPassword] = useState('ChangeMe_Admin_123!');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api<{ accessToken: string; refreshToken: string; user: AuthUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.accessToken, data.refreshToken, data.user);
      toast.success('Welcome to RedOps Manager');
      router.replace('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-2xl">
        <div className="mb-6 flex items-center gap-3">
          <Radar className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-lg font-semibold">RedOps Manager</h1>
            <p className="text-xs text-muted-foreground">Authorized pentest & Red Team operations</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </div>
          <div className="space-y-1.5">
            <Label>Password</Label>
            <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
        </div>
        <p className="mt-6 text-[11px] leading-relaxed text-muted-foreground">
          Demo: admin@redops.local · pentester@acme.local · orgadmin@acme.local. Use only against systems you are
          authorized to test.
        </p>
      </form>
    </div>
  );
}
