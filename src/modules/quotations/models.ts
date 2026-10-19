import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const lineSchema = new Schema(
  {
    description: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitAmountMinor: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const quotationSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    opportunityId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    currency: { type: String, required: true },
    status: {
      type: String,
      enum: ['draft', 'approved', 'sent', 'accepted', 'declined', 'void'],
      required: true,
      default: 'draft',
    },
    title: { type: String, required: true },
    lines: { type: [lineSchema], required: true },
    notes: { type: String, default: '' },
    createdBy: { type: String, required: true },
    approvedBy: { type: String, default: null },
    approvedAt: { type: Date, default: null },
  },
  { timestamps: true },
);
quotationSchema.index({ organizationId: 1, updatedAt: -1, _id: -1 });
quotationSchema.index({ organizationId: 1, opportunityId: 1, updatedAt: -1 });

export const Quotation: Model<InferSchemaType<typeof quotationSchema>> =
  (mongoose.models.Quotation as Model<InferSchemaType<typeof quotationSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof quotationSchema>>('Quotation', quotationSchema);
