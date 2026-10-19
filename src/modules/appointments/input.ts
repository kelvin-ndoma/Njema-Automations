import { z } from 'zod';

export const appointmentRequestInput = z.object({
  opportunityId: z.string().min(1).max(40),
  title: z.string().trim().min(2).max(120),
  requestedStartAt: z.coerce.date(),
  durationMinutes: z.coerce.number().int().min(15).max(480),
  notes: z.string().trim().max(2000).optional().default(''),
});

export const appointmentIdInput = z.object({
  appointmentId: z.string().min(1).max(40),
});

export class AppointmentUnavailable extends Error {
  constructor(message = 'Appointment unavailable.') {
    super(message);
  }
}
