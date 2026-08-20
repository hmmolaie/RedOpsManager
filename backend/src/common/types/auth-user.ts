import { Role } from '@prisma/client';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string | null;
  status: string;
}

export const WORKLIST_STATUSES = ['DRAFT', 'ACTIVE'] as const;

export function isPrivileged(user: AuthUser): boolean {
  return user.role === Role.SUPER_ADMIN || user.role === Role.ORG_ADMIN;
}

export function orgScope(user: AuthUser): { organizationId?: string } {
  if (user.role === Role.SUPER_ADMIN) return {};
  if (!user.organizationId) return { organizationId: '00000000-0000-0000-0000-000000000000' };
  return { organizationId: user.organizationId };
}

export function assertOrgAccess(user: AuthUser, organizationId: string | null | undefined) {
  if (user.role === Role.SUPER_ADMIN) return;
  if (!organizationId || user.organizationId !== organizationId) {
    const err = new Error('Forbidden: cross-organization access denied');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
}
