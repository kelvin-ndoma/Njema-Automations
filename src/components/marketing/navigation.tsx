'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { marketingLinks } from './content';
export function MarketingLogo() {
  return (
    <Link href="/" aria-label="Relay Sales home" className="marketing-logo">
      <span aria-hidden="true" className="logo-mark">
        r
      </span>
      relay<span className="logo-dot">.</span>
    </Link>
  );
}
export function MarketingNavigation() {
  const [open, setOpen] = useState(false);
  return (
    <header className="marketing-header">
      <div className="marketing-container nav-inner">
        <MarketingLogo />
        <nav aria-label="Main navigation" className="desktop-marketing-nav">
          {marketingLinks.map(([label, href]) => (
            <Link key={href} href={href}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="desktop-marketing-actions">
          <Link href="/sign-in">Sign in</Link>
          <Link href="/contact" className="marketing-button small">
            Request a demo <ArrowUpRight size={15} />
          </Link>
        </div>
        <button
          className="mobile-marketing-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-marketing-menu"
          onClick={() => setOpen(!open)}
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>
      {open && (
        <nav
          id="mobile-marketing-menu"
          aria-label="Mobile navigation"
          className="mobile-marketing-menu"
        >
          {[...marketingLinks, ['Sign in', '/sign-in'], ['Request a demo', '/contact']].map(
            ([label, href]) => (
              <Link key={href} href={href} onClick={() => setOpen(false)}>
                {label}
                <ArrowUpRight size={16} />
              </Link>
            ),
          )}
        </nav>
      )}
    </header>
  );
}
