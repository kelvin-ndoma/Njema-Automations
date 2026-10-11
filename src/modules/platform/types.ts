export interface Identity {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  createdAt: string | null;
}
export interface OrganizationRow {
  id: string;
  name: string;
  slug: string;
  currency: string;
  locale: string;
  timeZone: string;
  status: string | null;
  createdAt: string | null;
  owners: Identity[];
}
export interface MembershipRow {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationSlug: string;
  userId: string;
  user: Identity | null;
  role: string;
  status: string;
  createdAt: string | null;
}
export interface AuditRow {
  id: string;
  action: string;
  actorId: string;
  organizationId: string | null;
  createdAt: string | null;
  source: 'identity' | 'organization';
}
export interface PageResult<T> {
  rows: T[];
  total: number;
  page: number;
  pages: number;
  size: number;
}
export interface Overview {
  totalOrganizations: number;
  totalUsers: number;
  recentOrganizations: number;
  activeOrganizations: number | null;
  statusRecorded: number;
  days: number;
  from: string;
  asOf: string;
  trend: { date: string; count: number }[];
  newest: OrganizationRow[];
  activity: AuditRow[];
}
