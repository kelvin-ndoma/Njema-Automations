import 'server-only';
import { ObjectId, type Db, type Document, type Filter } from 'mongodb';
import { authClient } from '@/server/db';
import { getEnv } from '@/server/env';
import { requirePlatformOperator } from './service';
import { directoryInput, escapedSearch, platformId, reportDays, type SearchParams } from './input';
import type {
  Identity,
  OrganizationRow,
  MembershipRow,
  AuditRow,
  PageResult,
  Overview,
} from './types';
// Every exported read authorizes afresh. These repositories return explicit DTOs only.
async function authorizedDb(): Promise<Db> {
  await requirePlatformOperator();
  return authClient().db(getEnv().MONGODB_DB);
}
const date = (v: unknown) => (v instanceof Date && !isNaN(v.getTime()) ? v.toISOString() : null);
const text = (v: unknown) => (typeof v === 'string' ? v : '');
const identityProjection = { _id: 1, name: 1, email: 1, emailVerified: 1, createdAt: 1 };
function identity(row: Document): Identity {
  return {
    id: String(row._id),
    name: text(row.name),
    email: text(row.email),
    emailVerified: row.emailVerified === true,
    createdAt: date(row.createdAt),
  };
}
function ids(values: string[]) {
  return values.flatMap((v) => (ObjectId.isValid(v) ? [new ObjectId(v), v] : [v]));
}
async function identities(db: Db, values: string[]) {
  const rows = await db
    .collection('user')
    .find({ _id: { $in: ids(values) } } as Filter<Document>, { projection: identityProjection })
    .toArray();
  return new Map(rows.map((row) => [String(row._id), identity(row)]));
}
async function organizationRows(db: Db, rows: Document[]): Promise<OrganizationRow[]> {
  const members = await db
    .collection('memberships')
    .find(
      { organizationId: { $in: rows.map((row) => row._id) }, role: 'owner', status: 'active' },
      { projection: { organizationId: 1, userId: 1 } },
    )
    .toArray();
  const people = await identities(
    db,
    members.map((m) => String(m.userId)),
  );
  return rows.map((row) => ({
    id: String(row._id),
    name: text(row.name),
    slug: text(row.slug),
    currency: text(row.currency),
    locale: text(row.locale),
    timeZone: text(row.timeZone),
    status: text(row.status) || null,
    createdAt: date(row.createdAt),
    owners: members
      .filter((m) => String(m.organizationId) === String(row._id))
      .flatMap((m) => {
        const user = people.get(String(m.userId));
        return user ? [user] : [];
      }),
  }));
}
function orgProjection() {
  return { _id: 1, name: 1, slug: 1, currency: 1, locale: 1, timeZone: 1, createdAt: 1, status: 1 };
}
async function activity(db: Db, organizationId?: ObjectId, limit = 8): Promise<AuditRow[]> {
  const orgPipeline: Document[] = [
    ...(organizationId ? [{ $match: { organizationId } }] : []),
    {
      $project: {
        _id: 1,
        action: 1,
        actorId: 1,
        organizationId: 1,
        createdAt: 1,
        source: { $literal: 'organization' },
      },
    },
  ];
  if (!organizationId)
    orgPipeline.push({
      $unionWith: {
        coll: 'identityAudit',
        pipeline: [
          {
            $project: {
              _id: 1,
              action: 1,
              actorId: 1,
              createdAt: 1,
              source: { $literal: 'identity' },
            },
          },
        ],
      },
    });
  orgPipeline.push({
    $unionWith: {
      coll: 'platformAudit',
      pipeline: [
        ...(organizationId ? [{ $match: { organizationId } }] : []),
        {
          $project: {
            _id: 1,
            action: 1,
            actorId: 1,
            organizationId: 1,
            createdAt: 1,
            source: { $literal: 'platform' },
          },
        },
      ],
    },
  });
  const rows = await db
    .collection('auditevents')
    .aggregate([...orgPipeline, { $sort: { createdAt: -1, _id: -1 } }, { $limit: limit }])
    .toArray();
  return rows.map((row) => ({
    id: `${row.source}:${row._id}`,
    action: text(row.action),
    actorId: text(row.actorId),
    organizationId: row.organizationId ? String(row.organizationId) : null,
    createdAt: date(row.createdAt),
    source: row.source as AuditRow['source'],
  }));
}
async function paginated<T>(
  db: Db,
  collection: string,
  filter: Document,
  input: ReturnType<typeof directoryInput>,
  projection: Document,
  map: (rows: Document[]) => Promise<T[]>,
): Promise<PageResult<T>> {
  const total = await db.collection(collection).countDocuments(filter);
  const pages = Math.max(1, Math.ceil(total / input.size));
  const page = Math.min(input.page, pages);
  const rows = await db
    .collection(collection)
    .find(filter, { projection })
    .sort({ createdAt: -1, _id: -1 })
    .skip((page - 1) * input.size)
    .limit(input.size)
    .toArray();
  return { rows: await map(rows), total, page, pages, size: input.size };
}
export async function getPlatformOverview(params: SearchParams): Promise<Overview> {
  const db = await authorizedDb();
  const days = reportDays(params);
  const now = new Date();
  const from = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days + 1),
  );
  const range = { $gte: from, $lte: now };
  const [
    totalOrganizations,
    totalUsers,
    recentOrganizations,
    statusRecorded,
    active,
    trend,
    newestRows,
    events,
  ] = await Promise.all([
    db.collection('organizations').countDocuments(),
    db.collection('user').countDocuments(),
    db.collection('organizations').countDocuments({ createdAt: range }),
    db.collection('organizations').countDocuments({ status: { $type: 'string', $ne: '' } }),
    db.collection('organizations').countDocuments({ status: 'active' }),
    db
      .collection('organizations')
      .aggregate<{ _id: string; count: number }>([
        { $match: { createdAt: range } },
        {
          $group: {
            _id: { $dateToString: { date: '$createdAt', format: '%Y-%m-%d', timezone: 'UTC' } },
            count: { $sum: 1 },
          },
        },
      ])
      .toArray(),
    db
      .collection('organizations')
      .find({}, { projection: orgProjection() })
      .sort({ createdAt: -1, _id: -1 })
      .limit(3)
      .toArray()
      .then((rows) => organizationRows(db, rows)),
    activity(db, undefined, 5),
  ]);
  const counts = new Map(trend.map((t) => [t._id, t.count]));
  return {
    totalOrganizations,
    totalUsers,
    recentOrganizations,
    statusRecorded,
    activeOrganizations: statusRecorded ? active : null,
    days,
    from: from.toISOString(),
    asOf: now.toISOString(),
    trend: Array.from({ length: days }, (_, i) => {
      const day = new Date(from.getTime() + i * 86400000).toISOString().slice(0, 10);
      return { date: day, count: counts.get(day) ?? 0 };
    }),
    newest: newestRows,
    activity: events,
  };
}
export async function getPlatformOrganizations(params: SearchParams) {
  const db = await authorizedDb();
  const input = directoryInput(params);
  const filter: Document = {};
  if (input.q)
    filter.$or = [
      { name: { $regex: escapedSearch(input.q), $options: 'i' } },
      { slug: { $regex: escapedSearch(input.q), $options: 'i' } },
    ];
  if (input.status === 'untracked')
    filter.$and = [{ $or: [{ status: { $exists: false } }, { status: null }, { status: '' }] }];
  else if (input.status !== 'all') filter.status = input.status;
  const result = await paginated(db, 'organizations', filter, input, orgProjection(), (rows) =>
    organizationRows(db, rows),
  );
  const organizationIds = result.rows.map((row) => new ObjectId(row.id));
  const [memberships, employees, subscriptions] = await Promise.all([
    db
      .collection('memberships')
      .aggregate([
        { $match: { organizationId: { $in: organizationIds }, status: 'active' } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection('salesemployees')
      .aggregate([
        { $match: { organizationId: { $in: organizationIds } } },
        { $group: { _id: '$organizationId', count: { $sum: 1 } } },
      ])
      .toArray(),
    db
      .collection('organizationSubscriptions')
      .find(
        { organizationId: { $in: organizationIds } },
        { projection: { organizationId: 1, state: 1 } },
      )
      .toArray(),
  ]);
  return {
    ...result,
    rows: result.rows.map((row) => ({
      ...row,
      memberCount: Number(memberships.find((item) => String(item._id) === row.id)?.count ?? 0),
      employeeCount: Number(employees.find((item) => String(item._id) === row.id)?.count ?? 0),
      subscriptionState: subscriptions.find((item) => String(item.organizationId) === row.id)
        ?.state as string | undefined,
    })),
    q: input.q,
    status: input.status,
    supportedStatuses: ['active', 'suspended'],
  };
}
async function membershipRows(db: Db, rows: Document[]): Promise<MembershipRow[]> {
  const people = await identities(
    db,
    rows.map((m) => String(m.userId)),
  );
  const orgs = await db
    .collection('organizations')
    .find(
      { _id: { $in: rows.map((m) => m.organizationId) } },
      { projection: { _id: 1, name: 1, slug: 1 } },
    )
    .toArray();
  const organizations = new Map(orgs.map((org) => [String(org._id), org]));
  return rows.map((m) => {
    const org = organizations.get(String(m.organizationId));
    return {
      id: String(m._id),
      organizationId: String(m.organizationId),
      organizationName: text(org?.name) || 'Organization unavailable',
      organizationSlug: text(org?.slug),
      userId: String(m.userId),
      user: people.get(String(m.userId)) ?? null,
      role: text(m.role),
      status: text(m.status),
      createdAt: date(m.createdAt),
    };
  });
}
export async function getPlatformOrganization(id: string, params: SearchParams) {
  const db = await authorizedDb();
  if (!platformId.safeParse(id).success) return null;
  const organizationId = new ObjectId(id);
  const row = await db
    .collection('organizations')
    .findOne({ _id: organizationId }, { projection: orgProjection() });
  if (!row) return null;
  const [org, memberships, events] = await Promise.all([
    organizationRows(db, [row]),
    paginated(
      db,
      'memberships',
      { organizationId },
      directoryInput(params),
      { _id: 1, organizationId: 1, userId: 1, role: 1, status: 1, createdAt: 1 },
      (rows) => membershipRows(db, rows),
    ),
    activity(db, organizationId),
  ]);
  return { organization: org[0], memberships, activity: events };
}
export async function getPlatformUsers(params: SearchParams) {
  const db = await authorizedDb();
  const input = directoryInput(params);
  const filter: Document = input.q
    ? {
        $or: [
          { name: { $regex: escapedSearch(input.q), $options: 'i' } },
          { email: { $regex: escapedSearch(input.q), $options: 'i' } },
        ],
      }
    : {};
  const result = await paginated(db, 'user', filter, input, identityProjection, async (rows) => {
    const people = rows.map(identity);
    const memberships = await db
      .collection('memberships')
      .find(
        { userId: { $in: people.map((p) => p.id) } },
        { projection: { _id: 1, organizationId: 1, userId: 1, role: 1, status: 1, createdAt: 1 } },
      )
      .toArray();
    const entries = await membershipRows(db, memberships);
    return people.map((user) => ({
      ...user,
      membershipCount: entries.filter((m) => m.userId === user.id).length,
      organizations: entries
        .filter((m) => m.userId === user.id && m.status === 'active')
        .slice(0, 3)
        .map((m) => m.organizationName),
    }));
  });
  return { ...result, q: input.q };
}
export async function getPlatformUser(id: string, params: SearchParams) {
  const db = await authorizedDb();
  if (!platformId.safeParse(id).success) return null;
  const row = await db
    .collection('user')
    .findOne({ _id: { $in: ids([id]) } } as Filter<Document>, { projection: identityProjection });
  if (!row) return null;
  const user = identity(row);
  const memberships = await paginated(
    db,
    'memberships',
    { userId: user.id },
    directoryInput(params),
    { _id: 1, organizationId: 1, userId: 1, role: 1, status: 1, createdAt: 1 },
    (rows) => membershipRows(db, rows),
  );
  const superAdmin = await db
    .collection<{ _id: string; userId: string; role: string }>('platformRoles')
    .countDocuments({ _id: 'super-admin', userId: user.id, role: 'super-admin' });
  return { user, memberships, superAdmin: superAdmin === 1 };
}

export async function getPlatformAudit(params: SearchParams) {
  const db = await authorizedDb();
  const input = directoryInput(params);
  const pipeline: Document[] = [
    {
      $project: {
        _id: 1,
        action: 1,
        actorId: 1,
        organizationId: 1,
        createdAt: 1,
        source: { $literal: 'organization' },
      },
    },
    {
      $unionWith: {
        coll: 'identityAudit',
        pipeline: [
          {
            $project: {
              _id: 1,
              action: 1,
              actorId: 1,
              createdAt: 1,
              source: { $literal: 'identity' },
            },
          },
        ],
      },
    },
    {
      $unionWith: {
        coll: 'platformAudit',
        pipeline: [
          {
            $project: {
              _id: 1,
              action: 1,
              actorId: 1,
              organizationId: 1,
              createdAt: 1,
              source: { $literal: 'platform' },
            },
          },
        ],
      },
    },
    ...(() => {
      const filter: Document = {};
      const org = typeof params.organization === 'string' ? params.organization : '';
      const actor = typeof params.actor === 'string' ? params.actor : '';
      if (platformId.safeParse(org).success) filter.organizationId = new ObjectId(org);
      if (actor && actor.length <= 100) filter.actorId = actor;
      const from =
        typeof params.from === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.from)
          ? new Date(params.from + 'T00:00:00Z')
          : null;
      const to =
        typeof params.to === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.to)
          ? new Date(params.to + 'T23:59:59.999Z')
          : null;
      if ((from && !isNaN(from.getTime())) || (to && !isNaN(to.getTime())))
        filter.createdAt = {
          ...(from && !isNaN(from.getTime()) ? { $gte: from } : {}),
          ...(to && !isNaN(to.getTime()) ? { $lte: to } : {}),
        };
      return Object.keys(filter).length ? [{ $match: filter }] : [];
    })(),
    ...(input.q ? [{ $match: { action: { $regex: escapedSearch(input.q), $options: 'i' } } }] : []),
  ];
  const counts = await db
    .collection('auditevents')
    .aggregate([...pipeline, { $count: 'total' }])
    .toArray();
  const total = Number(counts[0]?.total ?? 0);
  const pages = Math.max(1, Math.ceil(total / input.size));
  const page = Math.min(input.page, pages);
  const rows = await db
    .collection('auditevents')
    .aggregate([
      ...pipeline,
      { $sort: { createdAt: -1, _id: -1 } },
      { $skip: (page - 1) * input.size },
      { $limit: input.size },
    ])
    .toArray();
  const events: AuditRow[] = rows.map((row) => ({
    id: `${row.source}:${row._id}`,
    action: text(row.action),
    actorId: text(row.actorId),
    organizationId: row.organizationId ? String(row.organizationId) : null,
    createdAt: date(row.createdAt),
    source: row.source as AuditRow['source'],
  }));
  return { rows: events, total, page, pages, size: input.size, q: input.q };
}
