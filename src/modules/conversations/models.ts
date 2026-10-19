import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const conversationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    actorId: { type: String, required: true },
    requestId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed'], required: true },
    grounded: { type: Boolean, default: false },
    employeeRevision: { type: Number, required: true },
    reservedTokens: { type: Number, required: true },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    reservedCostMicroUsd: { type: Number, default: null },
    costMicroUsd: { type: Number, default: null },
    inputRate: { type: Number, default: null },
    outputRate: { type: Number, default: null },
    model: { type: String, required: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);
conversationSchema.index({ organizationId: 1, requestId: 1 }, { unique: true });
conversationSchema.index({ organizationId: 1, createdAt: -1, _id: -1 });
const usageSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    day: { type: String, required: true },
    requests: { type: Number, required: true, default: 0 },
    committedTokens: { type: Number, required: true, default: 0 },
    committedCostMicroUsd: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);
usageSchema.index({ organizationId: 1, day: 1 }, { unique: true });

export const TestConversationRecord: Model<InferSchemaType<typeof conversationSchema>> =
  (mongoose.models.TestConversationRecord as
    Model<InferSchemaType<typeof conversationSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof conversationSchema>>(
    'TestConversationRecord',
    conversationSchema,
  );
export const DailyAIUsage: Model<InferSchemaType<typeof usageSchema>> =
  (mongoose.models.DailyAIUsage as Model<InferSchemaType<typeof usageSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof usageSchema>>('DailyAIUsage', usageSchema);
