import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const followUpSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    opportunityId: { type: Schema.Types.ObjectId, required: true },
    conversationId: { type: Schema.Types.ObjectId, default: null },
    channel: { type: String, enum: ['in_app'], required: true, default: 'in_app' },
    scheduledAt: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'cancelled', 'failed'],
      required: true,
      default: 'pending',
    },
    reason: { type: String, required: true, maxlength: 500 },
    idempotencyKey: { type: String, required: true },
    attempts: { type: Number, required: true, default: 0 },
    lastError: { type: String, default: null },
    completedAt: { type: Date, default: null },
    createdBy: { type: String, required: true },
  },
  { timestamps: true },
);
followUpSchema.index({ organizationId: 1, scheduledAt: 1, status: 1 });
followUpSchema.index({ organizationId: 1, idempotencyKey: 1 }, { unique: true });
followUpSchema.index({ status: 1, scheduledAt: 1 });

export const FollowUpJob: Model<InferSchemaType<typeof followUpSchema>> =
  (mongoose.models.FollowUpJob as Model<InferSchemaType<typeof followUpSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof followUpSchema>>('FollowUpJob', followUpSchema);
