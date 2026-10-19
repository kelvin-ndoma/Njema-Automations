import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const widgetSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    publicKey: { type: String, required: true },
    enabled: { type: Boolean, required: true, default: false },
    allowedOrigins: { type: [String], required: true, default: [] },
    revision: { type: Number, required: true, default: 1 },
  },
  { timestamps: true },
);
widgetSchema.index({ organizationId: 1 }, { unique: true });
widgetSchema.index({ publicKey: 1 }, { unique: true });

const sessionSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    tokenHash: { type: String, required: true },
    origin: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
sessionSchema.index({ tokenHash: 1 }, { unique: true });
sessionSchema.index({ organizationId: 1, createdAt: -1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const messageSchema = new Schema(
  {
    role: { type: String, enum: ['visitor', 'employee', 'human'], required: true },
    content: { type: String, required: true },
    grounded: { type: Boolean, default: false },
    requestId: { type: String, default: null },
    status: { type: String, enum: ['pending', 'completed', 'failed'], default: null },
    actorId: { type: String, default: null },
    reservedTokens: { type: Number, default: null },
    inputTokens: { type: Number, default: null },
    outputTokens: { type: Number, default: null },
    reservedCostMicroUsd: { type: Number, default: null },
    costMicroUsd: { type: Number, default: null },
    inputRate: { type: Number, default: null },
    outputRate: { type: Number, default: null },
    model: { type: String, default: null },
    day: { type: String, default: null },
    createdAt: { type: Date, required: true, default: () => new Date() },
  },
  { _id: true },
);

const conversationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    visitorSessionId: { type: Schema.Types.ObjectId, required: true },
    employeeRevision: { type: Number, required: true },
    origin: { type: String, required: true },
    status: { type: String, enum: ['open', 'lead_captured'], required: true, default: 'open' },
    leadId: { type: Schema.Types.ObjectId, default: null },
    controlMode: { type: String, enum: ['ai', 'human'], required: true, default: 'ai' },
    assigneeId: { type: String, default: null },
    takenOverAt: { type: Date, default: null },
    needsHuman: { type: Boolean, required: true, default: false },
    requestContact: { type: Boolean, required: true, default: false },
    qualificationNotes: { type: String, default: '' },
    messages: { type: [messageSchema], required: true, default: [] },
  },
  { timestamps: true },
);
conversationSchema.index({ organizationId: 1, updatedAt: -1, _id: -1 });
conversationSchema.index({ organizationId: 1, controlMode: 1, updatedAt: -1 });
conversationSchema.index({ organizationId: 1, needsHuman: 1, updatedAt: -1 });

const requestSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    requestId: { type: String, required: true },
    conversationId: { type: Schema.Types.ObjectId, required: true },
    kind: { type: String, enum: ['message', 'lead'], required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
requestSchema.index({ organizationId: 1, requestId: 1 }, { unique: true });

const leadSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    conversationId: { type: Schema.Types.ObjectId, required: true },
    visitorSessionId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, default: null },
    consentAt: { type: Date, required: true },
    requestId: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
leadSchema.index({ organizationId: 1, createdAt: -1, _id: -1 });
leadSchema.index({ organizationId: 1, conversationId: 1 }, { unique: true });
leadSchema.index({ organizationId: 1, requestId: 1 }, { unique: true });

export const WidgetInstallation: Model<InferSchemaType<typeof widgetSchema>> =
  (mongoose.models.WidgetInstallation as
    | Model<InferSchemaType<typeof widgetSchema>>
    | undefined) ||
  mongoose.model<InferSchemaType<typeof widgetSchema>>('WidgetInstallation', widgetSchema);

export const VisitorSession: Model<InferSchemaType<typeof sessionSchema>> =
  (mongoose.models.VisitorSession as Model<InferSchemaType<typeof sessionSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof sessionSchema>>('VisitorSession', sessionSchema);

export const VisitorConversation: Model<InferSchemaType<typeof conversationSchema>> =
  (mongoose.models.VisitorConversation as
    | Model<InferSchemaType<typeof conversationSchema>>
    | undefined) ||
  mongoose.model<InferSchemaType<typeof conversationSchema>>(
    'VisitorConversation',
    conversationSchema,
  );

export const QualifiedLead: Model<InferSchemaType<typeof leadSchema>> =
  (mongoose.models.QualifiedLead as Model<InferSchemaType<typeof leadSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof leadSchema>>('QualifiedLead', leadSchema);

export const VisitorRequest: Model<InferSchemaType<typeof requestSchema>> =
  (mongoose.models.VisitorRequest as Model<InferSchemaType<typeof requestSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof requestSchema>>('VisitorRequest', requestSchema);
