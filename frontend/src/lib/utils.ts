import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(value?: string | Date | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString();
}

export function formatDay(value?: string | Date | null) {
  if (!value) return '—';
  return new Date(value).toISOString().slice(0, 10);
}

export const severityColor: Record<string, string> = {
  CRITICAL: 'bg-red-500/15 text-red-300 border-red-500/30',
  HIGH: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  MEDIUM: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  LOW: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  INFO: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
};

export const statusColor: Record<string, string> = {
  ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  DRAFT: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  COMPLETED: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  TERMINATED: 'bg-red-500/15 text-red-300 border-red-500/30',
  ARCHIVED: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  QUEUED: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  RUNNING: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  FAILED: 'bg-red-500/15 text-red-300 border-red-500/30',
  CANCELLED: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  OPEN: 'bg-amber-500/15 text-amber-200 border-amber-500/30',
  CONFIRMED: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  ONLINE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  OFFLINE: 'bg-red-500/15 text-red-300 border-red-500/30',
};

export function canWrite(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN';
}

export function isOperator(role?: string) {
  return role === 'SUPER_ADMIN' || role === 'ORG_ADMIN' || role === 'PENTESTER';
}
