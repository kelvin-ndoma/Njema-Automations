import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const invitationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    email: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'manager', 'agent', 'viewer'],
      required: true,
    },
    status: {
      type: String,
      enum: ['pending', 'accepted', 'revoked', 'expired'],
      required: true,
      default: 'pending',
    },
    tokenHash: { type: String, required: true },
    invitedBy: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedBy: { type: String, default: null },
    acceptedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });
invitationSchema.index({ tokenHash: 1 }, { unique: true });
invitationSchema.index({ organizationId: 1, createdAt: -1 });

export const Invitation: Model<InferSchemaType<typeof invitationSchema>> =
  (mongoose.models.Invitation as Model<InferSchemaType<typeof invitationSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof invitationSchema>>('Invitation', invitationSchema);
