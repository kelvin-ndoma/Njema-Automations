import { z } from 'zod';
import { salesAgentActions } from '@/modules/employees/input';

export const testQuestionInput = z.object({
  question: z.string().trim().min(2).max(2000),
  requestId: z.uuid(),
});
export const groundedAnswer = z.object({
  answer: z.string().trim().min(1).max(4000),
  evidence: z.array(z.string().min(1).max(1000)).max(5),
  action: z.enum(salesAgentActions).default('continue'),
  qualificationNote: z.string().trim().max(1000).default(''),
});
export type ConversationTurn = {
  role: 'visitor' | 'employee' | 'human';
  content: string;
};
export interface TestConversation {
  id: string;
  question: string;
  answer: string | null;
  status: 'pending' | 'completed' | 'failed';
  grounded: boolean;
  createdAt: string;
}
export class ConversationUnavailable extends Error {
  constructor(message = 'The test reply could not be completed. Please try again later.') {
    super(message);
  }
}
export class UsageExceeded extends ConversationUnavailable {
  constructor() {
    super('The daily chat allowance has been reached. Try again tomorrow.');
  }
}
