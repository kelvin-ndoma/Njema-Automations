import 'server-only';
import mongoose, { Schema, type InferSchemaType, type Model } from 'mongoose';

const appointmentSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, required: true },
    opportunityId: { type: Schema.Types.ObjectId, required: true },
    contactId: { type: Schema.Types.ObjectId, required: true },
    conversationId: { type: Schema.Types.ObjectId, default: null },
    status: {
      type: String,
      enum: ['requested', 'confirmed', 'cancelled', 'completed'],
      required: true,
      default: 'requested',
    },
    title: { type: String, required: true },
    requestedStartAt: { type: Date, required: true },
    durationMinutes: { type: Number, required: true, min: 15, max: 480 },
    notes: { type: String, default: '' },
    timeZone: { type: String, required: true },
    createdBy: { type: String, required: true },
    confirmedBy: { type: String, default: null },
    confirmedAt: { type: Date, default: null },
    calendarProvider: { type: String, default: null },
    calendarEventId: { type: String, default: null },
  },
  { timestamps: true },
);
appointmentSchema.index({ organizationId: 1, requestedStartAt: -1, _id: -1 });
appointmentSchema.index({ organizationId: 1, opportunityId: 1, requestedStartAt: -1 });
appointmentSchema.index({ organizationId: 1, status: 1, requestedStartAt: 1 });

export const Appointment: Model<InferSchemaType<typeof appointmentSchema>> =
  (mongoose.models.Appointment as Model<InferSchemaType<typeof appointmentSchema>> | undefined) ||
  mongoose.model<InferSchemaType<typeof appointmentSchema>>('Appointment', appointmentSchema);
