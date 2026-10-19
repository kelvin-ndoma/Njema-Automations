import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const channelSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    provider: {
      type: String,
      enum: ['website_widget', 'email', 'whatsapp'],
      required: true,
    },
    status: {
      type: String,
      // disconnected: never configured; configured: credentials saved but live send blocked;
      // active: reserved for verified live providers (website widget uses this when enabled).
      enum: ['disconnected', 'configured', 'active', 'error'],
      required: true,
      default: 'disconnected',
    },
    displayName: { type: String, required: true },
    // Non-secret configuration only. Secrets must never be stored here in plaintext.
    config: {
      type: {
        fromAddress: { type: String, default: null },
        replyToAddress: { type: String, default: null },
        phoneNumberId: { type: String, default: null },
        businessAccountId: { type: String, default: null },
        webhookUrl: { type: String, default: null },
      },
      default: {},
    },
    // Presence flag only — never return the ciphertext to the browser.
    hasCredentials: { type: Boolean, required: true, default: false },
    credentialCiphertext: { type: String, default: null },
    lastError: { type: String, default: null },
    lastValidatedAt: { type: Date, default: null },
    activatedAt: { type: Date, default: null },
    updatedBy: { type: String, default: null },
  },
  { timestamps: true },
);
channelSchema.index({ organizationId: 1, provider: 1 }, { unique: true });
channelSchema.index({ organizationId: 1, status: 1 });

export const ChannelConnection: Model<InferSchemaType<typeof channelSchema>> =
  (mongoose.models.ChannelConnection as
    | Model<InferSchemaType<typeof channelSchema>>
    | undefined) ||
  mongoose.model<InferSchemaType<typeof channelSchema>>('ChannelConnection', channelSchema);
