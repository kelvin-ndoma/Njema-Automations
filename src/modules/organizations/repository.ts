import 'server-only';
import { Types } from 'mongoose';
import type { z } from 'zod';
import { connectDb } from '@/server/db';
import { Organization, Membership, AuditEvent } from './models';
import type { organizationInput } from './policy';
export async function findOrganization(slug: string) { await connectDb(); return Organization.findOne({ slug }).exec(); }
export async function findMembership(organizationId: Types.ObjectId, userId: string) { await connectDb(); return Membership.findOne({ organizationId, userId }).exec(); }
export async function findUserOrganizations(userId: string) {
 await connectDb();
 const memberships = await Membership.find({ userId, status: 'active' }).exec();
 const organizations = await Organization.find({ _id: { $in: memberships.map(m => m.organizationId) } }).sort({ name: 1 }).exec();
 return { memberships, organizations };
}
export async function insertOrganization(userId: string, input: z.infer<typeof organizationInput>) {
 await connectDb(); const session = await Organization.db.startSession();
 try { await session.withTransaction(async () => {
  const id = new Types.ObjectId();
  await Organization.create([{ _id: id, ...input }], { session });
  await Membership.create([{ organizationId: id, userId, role: 'owner', status: 'active' }], { session });
  await AuditEvent.create([{ organizationId: id, actorId: userId, action: 'organization.created', resourceId: String(id) }], { session });
 }); } finally { await session.endSession(); }
}
export async function insertSwitchAudit(userId: string, organizationId: string) {
 await connectDb(); await AuditEvent.create({ organizationId, actorId: userId, action: 'organization.switched', resourceId: organizationId });
}
