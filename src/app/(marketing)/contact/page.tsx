import { DemoForm } from '@/components/marketing/demo-form';
import { marketingMetadata } from '@/lib/public-site';
export const metadata = marketingMetadata(
  'Request a demo',
  'Tell us about your business and explore the fit and availability of Relay Sales.',
  '/contact',
);
export default function Page() {
  return (
    <main id="main-content">
      <section className="marketing-container marketing-page-hero">
        <p className="eyebrow">Let’s find the right next step</p>
        <h1>
          Good conversations
          <br />
          start <em>here.</em>
        </h1>
        <p>
          Tell us about your business. We’ll discuss your needs, current availability and the AI
          sales workflow we’re building.
        </p>
      </section>
      <div className="marketing-container contact-layout">
        <aside className="contact-aside">
          <h2>
            Your business.
            <br />
            Your questions.
          </h2>
          <p>
            Share the conversations you want to improve and what a useful next step looks like for
            your team.
          </p>
          <p>
            The workspace foundation is implemented. AI sales employees and automated workflows are
            planned. This form saves an inquiry for review; it does not schedule a live AI product
            demo.
          </p>
        </aside>
        <DemoForm />
      </div>
    </main>
  );
}
