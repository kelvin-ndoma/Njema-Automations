import 'server-only';
import mongoose, { Schema } from 'mongoose';
import { connectDb } from '@/server/db';
const inquirySchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    business: { type: String, required: true },
    industry: String,
    message: String,
    consentAt: { type: Date, required: true },
    status: { type: String, default: 'new' },
  },
  { timestamps: true },
);
const auditSchema = new Schema(
  {
    action: { type: String, required: true },
    resourceId: { type: Schema.Types.ObjectId, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);
const Inquiry = mongoose.models.DemoInquiry || mongoose.model('DemoInquiry', inquirySchema);
const Audit = mongoose.models.MarketingAudit || mongoose.model('MarketingAudit', auditSchema);
export async function saveDemoInquiry(input: {
  name: string;
  email: string;
  business: string;
  industry: string;
  message: string;
}) {
  await connectDb();
  // The inquiry and its metadata audit record succeed together; requires a replica set.
  await mongoose.connection.transaction(async (session) => {
    const [record] = await Inquiry.create([{ ...input, consentAt: new Date() }], { session });
    await Audit.create([{ action: 'marketing.demo_inquiry.created', resourceId: record._id }], {
      session,
    });
  });
}
