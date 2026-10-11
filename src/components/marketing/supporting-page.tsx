import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { capabilities, industries } from './content';
import { FinalCTA } from './shell';
export function SupportingPage({
  kind,
  title,
  description,
}: {
  kind: string;
  title: string;
  description: string;
}) {
  return (
    <main id="main-content">
      <section className="marketing-container marketing-page-hero">
        <p className="eyebrow">Relay Sales / Automator</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      {kind === 'features' && (
        <>
          <div className="marketing-container marketing-content-grid">
            {capabilities.map(([title, label, text]) => (
              <article key={label}>
                <p className="eyebrow">Planned · {label}</p>
                <h2>{title}</h2>
                <p>{text}</p>
              </article>
            ))}
          </div>
          <section id="availability" className="marketing-container marketing-prose">
            <h2>Product availability</h2>
            <p>
              These are the implemented foundations. The product concept visuals are illustrative;
              they do not represent a live AI conversation system.
            </p>
            <table className="availability-table">
              <caption className="sr-only">Current and planned capabilities</caption>
              <thead>
                <tr>
                  <th scope="col">Capability</th>
                  <th scope="col">Availability</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Secure sign-in, database sessions and logout', 'Available foundation'],
                  [
                    'Organization creation, memberships and workspace switching',
                    'Available foundation',
                  ],
                  [
                    'Independent platform administration and audit metadata',
                    'Available to authorized Super Admin',
                  ],
                  ['Demo inquiry submission', 'Available'],
                  ['AI replies, business knowledge and employee configuration', 'Planned'],
                  ['Lead capture, qualification and automated follow-ups', 'Planned'],
                  ['Messaging channel integrations and human handoff', 'Planned'],
                  ['Paid plans and billing', 'Not configured'],
                ].map(([name, status]) => (
                  <tr key={name}>
                    <th scope="row">{name}</th>
                    <td>{status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {kind === 'how-it-works' && (
        <section className="marketing-container marketing-prose">
          {[
            [
              '01 / Available foundation',
              'Create your business workspace',
              'Create an account, establish an organization and choose its locale, currency and time zone. Access follows active membership and organization permissions.',
            ],
            [
              '02 / Planned',
              'Configure your AI sales employee',
              'Provide business knowledge and shape the conversations, priorities and escalation rules you want it to support. Employee configuration is not live yet.',
            ],
            [
              '03 / Planned',
              'Connect the first conversation',
              'The intended experience captures inquiries and responds using approved business context. Messaging integrations and live AI responses are planned.',
            ],
            [
              '04 / Planned',
              'Qualify and keep moving',
              'The planned workflow gathers useful context, supports follow-ups and hands appropriate conversations to your team.',
            ],
          ].map(([status, title, text]) => (
            <section key={title}>
              <p className="eyebrow">{status}</p>
              <h2>{title}</h2>
              <p>{text}</p>
            </section>
          ))}
        </section>
      )}
      {kind === 'solutions' && (
        <div className="marketing-container marketing-content-grid">
          {industries.map(([n, title, text]) => (
            <article key={n} id={'industry-' + n}>
              <p className="eyebrow">Illustrative use case · planned</p>
              <h2>{title}</h2>
              <p>{text}</p>
              <p>
                Adapt the intended knowledge and qualification workflow to your business. Live
                industry configurations and channel integrations are not available yet.
              </p>
            </article>
          ))}
        </div>
      )}
      {kind === 'pricing' && (
        <section className="marketing-container marketing-prose">
          <h2>Tell us what you need.</h2>
          <p>
            Share your industry, team needs and sales process. Your inquiry helps us understand the
            right fit and discuss which capabilities are currently available.
          </p>
          <h2>No payment required to inquire.</h2>
          <p>
            Subscription plans, billing, trial terms and AI usage allowances have not been
            configured. We won’t present estimated prices as published plans or imply that planned
            capabilities are ready to buy.
          </p>
          <div className="cta-row" style={{ marginTop: 24 }}>
            <Link href="/contact" className="marketing-button">
              Discuss your requirements <ArrowUpRight size={18} />
            </Link>
            <Link href="/features#availability" className="text-link">
              Review availability
            </Link>
          </div>
        </section>
      )}
      {kind === 'privacy' && (
        <section className="marketing-container marketing-prose">
          <h2>Information you choose to provide</h2>
          <p>
            The demo inquiry form collects your name, email, business name, optional industry and
            message, and consent to be contacted about your inquiry. The account system separately
            stores account identity, authentication records and organization memberships.
          </p>
          <h2>Why it is used</h2>
          <p>
            Inquiry details are saved to review and respond to your request. Submission does not
            automatically schedule a meeting or subscribe you to a newsletter. Request budgets use
            hashed identifiers to help limit abuse; form submissions do not store raw IP addresses.
          </p>
          <h2>Sessions and private workspaces</h2>
          <p>
            Sign-in uses an authentication cookie. Organization switching uses a workspace
            preference cookie. Public marketing pages can be read without signing in and do not
            access your workspace records. Authorization follows database-backed platform grants or
            organization membership.
          </p>
          <h2>Questions about your information</h2>
          <p>
            Use the{' '}
            <Link href="/contact" className="text-link">
              inquiry form
            </Link>{' '}
            to raise a privacy or data-access question. Avoid including sensitive personal
            information or secrets in the message.
          </p>
          <h2>Development preview</h2>
          <p>
            This notice describes the implemented preview. Controller contact details, retention
            schedules and any additional service-specific disclosures must be finalized before a
            public commercial launch. No public deployment is represented here.
          </p>
        </section>
      )}
      {kind === 'terms' && (
        <section className="marketing-container marketing-prose">
          <h2>What this preview offers</h2>
          <p>
            The working foundation supports accounts and membership-based business workspaces. AI
            sales employees, integrations, automated follow-ups and paid subscriptions remain
            planned. Concept previews and industry examples illustrate intended workflows.
          </p>
          <h2>Accounts and appropriate use</h2>
          <p>
            Use accurate account information, protect your credentials and only access organizations
            where you have permission. Do not use the inquiry form to send spam, confidential
            credentials or content you do not have permission to share.
          </p>
          <h2>Demo inquiries</h2>
          <p>
            A saved inquiry is a request for a conversation. It is not a purchase, a scheduled
            appointment or a promise that planned features will be available on a particular date.
          </p>
          <h2>No published commercial agreement</h2>
          <p>
            Prices, billing terms, service levels, release dates and commercial commitments have not
            been configured. These preview terms explain current availability; final commercial
            terms need to be established before a public launch or paid service.
          </p>
          <h2>Questions</h2>
          <p>
            Contact us through the{' '}
            <Link href="/contact" className="text-link">
              inquiry form
            </Link>{' '}
            to discuss this preview or your business needs.
          </p>
        </section>
      )}
      {!['privacy', 'terms'].includes(kind) && <FinalCTA />}
    </main>
  );
}
