'use client';
import Link from 'next/link';
import { useActionState } from 'react';
import { ArrowUpRight, Check } from 'lucide-react';
import { requestDemo, type DemoState } from '@/modules/marketing/actions';
export function DemoForm() {
  const [state, action, pending] = useActionState<DemoState, FormData>(requestDemo, {});
  if (state.success)
    return (
      <div className="demo-form" role="status">
        <Check size={28} />
        <h2 style={{ fontSize: 28, marginTop: 16 }}>Your inquiry is saved.</h2>
        <p style={{ marginTop: 16 }}>
          Thank you for telling us about your business. Your request is ready for review. This does
          not book an appointment or send a confirmation email.
        </p>
        <Link href="/features#availability" className="text-link">
          Explore product availability <ArrowUpRight size={16} />
        </Link>
      </div>
    );
  return (
    <form action={action} className="demo-form">
      <div className="form-row">
        <div className="field">
          <label htmlFor="demo-name">Your name</label>
          <input
            id="demo-name"
            name="name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={80}
          />
        </div>
        <div className="field">
          <label htmlFor="demo-email">Email address</label>
          <input
            id="demo-email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </div>
      </div>
      <div className="field">
        <label htmlFor="demo-business">Business name</label>
        <input
          id="demo-business"
          name="business"
          autoComplete="organization"
          required
          minLength={2}
          maxLength={120}
        />
      </div>
      <div className="field">
        <label htmlFor="demo-industry">Industry (optional)</label>
        <select id="demo-industry" name="industry" defaultValue="">
          <option value="">Select your industry</option>
          <option value="real-estate">Real estate</option>
          <option value="services">Professional services</option>
          <option value="commerce">Retail & commerce</option>
          <option value="education">Education & training</option>
          <option value="hospitality">Travel & hospitality</option>
          <option value="other">Other / multiple industries</option>
        </select>
      </div>
      <div className="field">
        <label htmlFor="demo-message">What would you like to explore? (optional)</label>
        <textarea
          id="demo-message"
          name="message"
          maxLength={2000}
          placeholder="Your sales process, questions, or the next step you have in mind."
        />
      </div>
      <div className="honeypot" aria-hidden="true">
        <label htmlFor="demo-website">Leave this field empty</label>
        <input id="demo-website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <label className="consent-label" htmlFor="demo-consent">
        <input id="demo-consent" type="checkbox" name="consent" required />
        <span>
          I agree to be contacted about this inquiry and have read the{' '}
          <Link href="/privacy">privacy notice</Link>.
        </span>
      </label>
      {state.error && (
        <p className="form-message error" role="alert">
          {state.error}
        </p>
      )}
      <button className="marketing-button" disabled={pending}>
        {pending ? 'Saving your inquiry…' : 'Send demo inquiry'}
        <ArrowUpRight size={17} />
      </button>
      <p className="fine-print">
        No payment. No automatic booking. Please don’t include sensitive information.
      </p>
    </form>
  );
}
