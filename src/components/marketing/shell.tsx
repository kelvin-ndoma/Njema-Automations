import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { marketingLinks } from './content';
import { MarketingLogo, MarketingNavigation } from './navigation';
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="marketing">
      <a href="#main-content" className="marketing-skip">
        Skip to content
      </a>
      <MarketingNavigation />
      {children}
      <footer className="marketing-footer">
        <div className="marketing-container footer-grid">
          <div className="footer-brand">
            <MarketingLogo />
            <p>
              Every conversation.
              <br />A little more possibility.
            </p>
            <span className="eyebrow">Automator / Relay Sales</span>
          </div>
          <div>
            <h2>Explore</h2>
            {marketingLinks.map(([label, href]) => (
              <Link key={href} href={href}>
                {label}
              </Link>
            ))}
          </div>
          <div>
            <h2>Connect</h2>
            <Link href="/contact">Request a demo</Link>
            <Link href="/sign-in">Sign in</Link>
            <Link href="/sign-up">Create an account</Link>
          </div>
          <div className="footer-information">
            <h2>Information</h2>
            <Link href="/privacy">Privacy notice</Link>
            <Link href="/terms">Preview terms</Link>
            <Link href="/features#availability">Product availability</Link>
          </div>
        </div>
        <div className="marketing-container footer-bottom">
          <span>Built for businesses. Designed for conversations.</span>
          <span>Development preview · AI capabilities planned</span>
        </div>
      </footer>
    </div>
  );
}
export function FinalCTA() {
  return (
    <section className="final-cta marketing-container">
      <p className="eyebrow">Make room for the next conversation</p>
      <h2>
        Your next opportunity
        <br />
        starts with a response.
      </h2>
      <div className="cta-row">
        <Link href="/contact" className="marketing-button">
          Let’s talk about your business <ArrowUpRight size={18} />
        </Link>
        <Link href="/features#availability" className="text-link">
          Explore product availability
        </Link>
      </div>
      <p className="fine-print">
        Tell us what you need. We’ll discuss fit and availability before any commitment.
      </p>
    </section>
  );
}
