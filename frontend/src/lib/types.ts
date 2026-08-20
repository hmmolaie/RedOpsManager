export type Role = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'PENTESTER' | 'VIEWER';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId: string | null;
  organization?: { id: string; name: string; slug: string };
  status: string;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}

export interface Contract {
  id: string;
  code: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  amount: string | number;
  currency: string;
  status: string;
  organizationId: string;
  organization?: { id: string; name: string };
  assignments?: { id: string; role: string; user: { id: string; firstName: string; lastName: string; email: string } }[];
  assets?: Asset[];
  _count?: { assets: number; activities: number; findings: number };
}

export interface Asset {
  id: string;
  name: string;
  type: string;
  value: string;
  criticality: string;
  description?: string;
  tags: string[];
  contractId: string;
  metadata?: Record<string, unknown>;
}

export interface Finding {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  recommendation?: string;
  cvss?: number;
  asset?: { id: string; name: string; value: string };
  contract?: { id: string; code: string; title: string };
  technique?: { mitreId: string; name: string };
}

export interface Activity {
  id: string;
  title: string;
  tool: string;
  status: string;
  command?: string;
  result?: unknown;
  createdAt: string;
  asset?: { id: string; name: string; value: string };
  tactic?: { mitreId: string; name: string };
  technique?: { mitreId: string; name: string };
  executionArm?: { id: string; name: string };
}

export interface MitreTacticColumn {
  id: string;
  mitreId: string;
  shortName: string;
  name: string;
  description: string;
  techniques: MitreTech[];
  subtechniques: MitreTech[];
}

export interface MitreTech {
  id: string;
  mitreId: string;
  name: string;
  description: string;
  isSubtechnique: boolean;
  parentMitreId?: string | null;
}
