import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const contactSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    source: { type: String, enum: ['website_widget', 'manual'], required: true, default: 'manual' },
    ownerId: { type: String, default: null },
    communicationOptOut: { type: Boolean, required: true, default: false },
    optedOutAt: { type: Date, default: null },
  },
  { timestamps: true },
);
contactSchema.index({ organizationId: 1, email: 1 }, { unique: true });
contactSchema.index({ organizationId: 1, updatedAt: -1, _id: -1 });

const stageSchema = new Schema(
  {
    key: { type: String, required: true },
    label: { type: String, required: true },
    order: { type: Number, required: true },
  },
  { _id: false },
);

const pipelineSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    stages: { type: [stageSchema], required: true },
    isDefault: { type: Boolean, required: true, default: false },
  },
  { timestamps: true },
);
pipelineSchema.index({ organizationId: 1, isDefault: 1 });
pipelineSchema.index({ organizationId: 1, name: 1 }, { unique: true });

const opportunitySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    pipelineId: { type: Schema.Types.ObjectId, required: true },
    stageKey: { type: String, required: true },
    title: { type: String, required: true },
    ownerId: { type: String, required: true },
    status: { type: String, enum: ['open', 'won', 'lost'], required: true, default: 'open' },
    conversationId: { type: Schema.Types.ObjectId, default: null },
    leadId: { type: Schema.Types.ObjectId, default: null },
    notes: { type: String, default: '' },
  },
  { timestamps: true },
);
opportunitySchema.index({ organizationId: 1, updatedAt: -1, _id: -1 });
opportunitySchema.index({ organizationId: 1, contactId: 1, updatedAt: -1 });
opportunitySchema.index({ organizationId: 1, status: 1, stageKey: 1 });

const activitySchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, default: null },
    opportunityId: { type: Schema.Types.ObjectId, default: null },
    conversationId: { type: Schema.Types.ObjectId, default: null },
    type: {
      type: String,
      enum: ['note', 'stage_change', 'lead_captured', 'system'],
      required: true,
    },
    body: { type: String, required: true },
    actorId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
activitySchema.index({ organizationId: 1, contactId: 1, createdAt: -1 });
activitySchema.index({ organizationId: 1, opportunityId: 1, createdAt: -1 });

export const Contact: Model<InferSchemaType<typeof contactSchema>> =
  (mongoose.models.Contact as Model<InferSchemaType<typeof contactSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof contactSchema>>('Contact', contactSchema);

export const Pipeline: Model<InferSchemaType<typeof pipelineSchema>> =
  (mongoose.models.Pipeline as Model<InferSchemaType<typeof pipelineSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof pipelineSchema>>('Pipeline', pipelineSchema);

export const Opportunity: Model<InferSchemaType<typeof opportunitySchema>> =
  (mongoose.models.Opportunity as Model<InferSchemaType<typeof opportunitySchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof opportunitySchema>>('Opportunity', opportunitySchema);

export const Activity: Model<InferSchemaType<typeof activitySchema>> =
  (mongoose.models.Activity as Model<InferSchemaType<typeof activitySchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof activitySchema>>('Activity', activitySchema);

export const defaultPipelineStages = [
  { key: 'new', label: 'New', order: 0 },
  { key: 'qualified', label: 'Qualified', order: 1 },
  { key: 'proposal', label: 'Proposal', order: 2 },
  { key: 'won', label: 'Won', order: 3 },
  { key: 'lost', label: 'Lost', order: 4 },
];
