import Link from 'next/link';
import {
  ArrowUpRight,
  ArrowRight,
  Clock3,
  MessageSquare,
  MoveUpRight,
  ShieldCheck,
  Globe2,
  UsersRound,
  Check,
} from 'lucide-react';
import { ProductPreview } from '@/components/marketing/product-preview';
import { capabilities, industries, faqs } from '@/components/marketing/content';
import { FinalCTA } from '@/components/marketing/shell';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Relay Sales — every lead deserves a response',
  'Meet your AI sales employee. Explore the future of lead capture, useful answers, qualification and follow-up, built on secure business workspaces.',
  '/',
);
export default function Homepage() {
  return (
    <main id="main-content" className="relay-home">
      <section className="hero-stage">
        <div className="marketing-hero marketing-container">
          <div className="hero-copy">
            <p className="hero-kicker">
              <span /> Meet your next sales employee
            </p>
            <h1>
              Every lead deserves
              <br />a <em>response.</em>
              <br />
              Every opportunity
              <br />
              deserves a <em>follow-up.</em>
            </h1>
            <p className="hero-description">
              Meet your AI sales employee. Capture leads, answer questions, qualify prospects, and
              keep conversations moving — even when your team is offline.
            </p>
            <div className="cta-row">
              <Link href="/contact" className="marketing-button">
                Request a demo <ArrowUpRight size={18} />
              </Link>
              <Link href="/how-it-works" className="text-link">
                See how it works <ArrowRight size={16} />
              </Link>
            </div>
            <p className="hero-availability">
              <span /> Workspace foundation available · AI sales capabilities in development
            </p>
          </div>
          <div className="hero-visual">
            <div className="visual-note">
              <span className="eyebrow">Designed for the moments that matter</span>
              <MoveUpRight size={28} />
            </div>
            <ProductPreview />
            <div className="visual-bottom">
              <span>A question. A connection. A next step.</span>
              <span className="visual-rule" />
            </div>
          </div>
        </div>
      </section>
      <div className="brand-principles marketing-container">
        <span>Built around your business</span>
        <span>
          <Globe2 size={16} /> Globally minded
        </span>
        <span>
          <UsersRound size={16} /> Industry flexible
        </span>
        <span>
          <ShieldCheck size={16} /> Membership-based workspaces
        </span>
      </div>
      <section className="pain-section marketing-container">
        <div>
          <p className="eyebrow">The space between interest and action</p>
          <h2>
            Good opportunities
            <br />
            shouldn’t go <em>quiet.</em>
          </h2>
        </div>
        <div className="pain-items">
          {[
            [
              Clock3,
              'Your team clocks off. Interest doesn’t.',
              'A late-night question can be tomorrow’s opportunity. A slow response leaves the next step uncertain.',
            ],
            [
              MessageSquare,
              'The conversation gets scattered.',
              'An inquiry in one channel. Context in another. Your team deserves a clearer picture.',
            ],
            [
              MoveUpRight,
              '“We’ll follow up” becomes “we forgot.”',
              'Busy days turn promising conversations into loose ends. Make the next step part of the process.',
            ],
          ].map(([Icon, title, description], i) => {
            const Symbol = Icon as typeof Clock3;
            return (
              <div className="pain-item" key={i}>
                <Symbol size={21} />
                <div>
                  <h3>{title as string}</h3>
                  <p>{description as string}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="how-section">
        <div className="marketing-container">
          <div className="section-heading">
            <div>
              <p className="eyebrow">How it works · intended workflow</p>
              <h2>
                A natural conversation.
                <br />A thoughtful system behind it.
              </h2>
            </div>
            <Link href="/how-it-works" className="text-link">
              Explore the workflow <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="how-steps">
            {[
              [
                '01',
                'Give it a place to work.',
                'Create a secure business workspace. This foundation is available today.',
                'Available foundation',
              ],
              [
                '02',
                'Teach it your business.',
                'Configure knowledge, priorities and the conversations you want to support.',
                'Planned',
              ],
              [
                '03',
                'Let the conversation move.',
                'Capture inquiries, qualify intent and bring your team in at the right moment.',
                'Planned',
              ],
            ].map(([n, title, text, status]) => (
              <article key={n}>
                <span className="step-number">{n}</span>
                <h3>{title}</h3>
                <p>{text}</p>
                <span className="step-status">{status}</span>
              </article>
            ))}
          </div>
          <section className="workflow-section">
            <div>
              <p className="eyebrow">The product vision</p>
              <h2>
                One continuous thread.
                <br />
                From hello to <em>handoff.</em>
              </h2>
              <p className="section-aside">
                A planned workflow where useful context stays with the opportunity, and your team
                stays in control.
              </p>
            </div>
            <ol className="workflow-track">
              {[
                ['A new inquiry', 'Capture the question'],
                ['A useful response', 'Answer with context'],
                ['A clearer opportunity', 'Understand intent'],
                ['A human connection', 'Pass the context on'],
              ].map(([title, description], i) => (
                <li key={title}>
                  <span className="workflow-node">{i + 1}</span>
                  <div>
                    <h3>{title}</h3>
                    <p>{description}</p>
                  </div>
                  {i < 3 && <ArrowRight className="workflow-arrow" size={16} />}
                </li>
              ))}
            </ol>
          </section>
        </div>
      </section>
      <section className="capabilities-section marketing-container" id="features">
        <div className="section-heading">
          <div>
            <p className="eyebrow">A sales employee, with a clear purpose</p>
            <h2>
              More than a reply.
              <br />
              <em>A way forward.</em>
            </h2>
          </div>
          <p className="section-aside">
            The capabilities we’re building to turn conversations into organized opportunities. All
            six are planned.
          </p>
        </div>
        <div className="capability-grid">
          {capabilities.map(([title, label, description], i) => (
            <article key={label}>
              <span className="capability-index">
                0{i + 1}
                <ArrowUpRight size={17} />
              </span>
              <p className="eyebrow">{label}</p>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
        <Link href="/features#availability" className="text-link availability-link">
          See exactly what’s available today <ArrowRight size={16} />
        </Link>
      </section>
      <section className="industry-section">
        <div className="marketing-container industry-layout">
          <div>
            <p className="eyebrow">Different businesses. Shared possibilities.</p>
            <h2>
              Your industry.
              <br />
              Your process.
              <br />
              <em>Your employee.</em>
            </h2>
            <p>
              From a property viewing to a service inquiry, the next step starts with understanding
              the person asking.
            </p>
            <Link href="/solutions" className="text-link">
              Find your use case <ArrowUpRight size={17} />
            </Link>
            <span className="fine-print">Illustrative use cases for planned capabilities.</span>
          </div>
          <div className="industry-list">
            {industries.map(([n, title, description]) => (
              <Link href={'/solutions#industry-' + n} key={n}>
                <span>{n}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ArrowUpRight size={20} />
              </Link>
            ))}
          </div>
        </div>
      </section>
      <section className="benefits-section marketing-container">
        <p className="eyebrow">Built with intention</p>
        <h2>
          Ambitious about sales.
          <br />
          <em>Careful about the details.</em>
        </h2>
        <div className="benefit-columns">
          {[
            [
              'A private home for each business',
              'Organization permissions and membership checks are part of the working foundation. Your workspace is separate from platform operations.',
              'Available',
            ],
            [
              'A product that fits the way you work',
              'The vision is configurable business knowledge and workflows, rather than one script for every industry.',
              'Planned',
            ],
            [
              'People remain part of the process',
              'Human handoff and oversight are central to the intended sales workflow. Better context should help your team make the next decision.',
              'Planned',
            ],
          ].map(([title, description, status]) => (
            <article key={title}>
              <Check size={21} />
              <h3>{title}</h3>
              <p>{description}</p>
              <span className="step-status">{status}</span>
            </article>
          ))}
        </div>
      </section>
      <section className="faq-section marketing-container">
        <div>
          <p className="eyebrow">A little clarity</p>
          <h2>
            Before the
            <br />
            <em>conversation.</em>
          </h2>
          <Link href="/contact" className="text-link">
            Ask us a question <ArrowUpRight size={16} />
          </Link>
        </div>
        <div>
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>
                {q}
                <span aria-hidden="true">+</span>
              </summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>
      <FinalCTA />
    </main>
  );
}
