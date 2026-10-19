import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';
import { salesAgentActions } from './input';

const schema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    instructions: { type: String, required: true },
    knowledge: { type: String, required: true },
    fallback: { type: String, required: true },
    goal: { type: String, required: true },
    qualificationCriteria: { type: String, required: true },
    escalationRules: { type: String, required: true },
    allowedActions: {
      type: [{ type: String, enum: salesAgentActions }],
      required: true,
      default: () => [...salesAgentActions],
    },
    status: {
      type: String,
      enum: ['active', 'paused'],
      required: true,
      default: 'active',
    },
    revision: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);
schema.index({ organizationId: 1 }, { unique: true });
export const SalesEmployee: Model<InferSchemaType<typeof schema>> =
  (mongoose.models.SalesEmployee as Model<InferSchemaType<typeof schema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof schema>>('SalesEmployee', schema);
