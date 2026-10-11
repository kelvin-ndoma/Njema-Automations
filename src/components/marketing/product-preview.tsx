import {
  ArrowUpRight,
  Check,
  MessageCircle,
  Sparkles,
  Inbox,
  GitBranch,
  ShieldCheck,
  ChevronRight,
  Send,
  UserRound,
} from 'lucide-react';
export function ProductPreview() {
  return (
    <figure
      className="product-preview relay-product"
      aria-label="Illustrative AI sales product preview; all AI workflows shown are in development"
    >
      <figcaption>
        <span>
          <span className="preview-dot" /> Relay workspace{' '}
          <span className="preview-caption-divider">/</span> Sales employee
        </span>
        <span className="preview-disclaimer">
          Illustrative preview · AI features in development
        </span>
      </figcaption>
      <div className="relay-interface">
        <aside className="interface-rail" aria-hidden="true">
          <span className="preview-symbol">r.</span>
          <span className="rail-selected">
            <Inbox size={18} />
          </span>
          <MessageCircle size={18} />
          <GitBranch size={18} />
          <ShieldCheck size={18} />
          <span className="rail-user">
            <UserRound size={16} />
          </span>
        </aside>
        <div className="interface-conversation">
          <div className="interface-heading">
            <div>
              <span className="eyebrow">Website inquiry</span>
              <h2>A first hello. A useful next step.</h2>
            </div>
            <span className="lead-badge">
              <span /> Qualifying
            </span>
          </div>
          <div className="conversation-person">
            <span className="avatar">V</span>
            <span>
              <strong>Website visitor</strong>
              <small>Illustrative conversation</small>
            </span>
            <MessageCircle size={16} />
          </div>
          <div className="chat-bubble visitor">
            We’re looking for a solution for our business. Can you help us find the right fit?
          </div>
          <div className="chat-label">
            <Sparkles size={13} /> Relay AI sales employee <span>Planned</span>
          </div>
          <div className="chat-bubble employee">
            Absolutely. What would you like to improve, and when are you hoping to get started?
          </div>
          <div className="chat-bubble visitor second-message">
            We want to respond to new inquiries and keep track of the next steps. We’re exploring
            options now.
          </div>
          <div className="context-captured">
            <Check size={14} />
            <span>Intent and timing added to lead context</span>
            <span className="illustration-label">Concept</span>
          </div>
          <div className="preview-composer">
            <span>Context ready for your team</span>
            <Send size={16} />
          </div>
        </div>
        <aside
          className="qualification-panel"
          aria-label="Illustrative lead qualification and handoff"
        >
          <div className="qualification-title">
            <GitBranch size={15} />
            <h3>Lead context</h3>
          </div>
          <div className="qualification-status">
            <span className="eyebrow">Lead status</span>
            <strong>Exploring a solution</strong>
            <span className="qualification-tag">Qualification in progress</span>
          </div>
          <dl>
            {[
              ['Intent', 'Manage new inquiries'],
              ['Priority', 'Responsive follow-up'],
              ['Timing', 'Exploring options'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <Check size={12} />
                  {value}
                </dd>
              </div>
            ))}
          </dl>
          <div className="human-handoff">
            <span className="handoff-icon">
              <UserRound size={17} />
            </span>
            <h3>Human handoff</h3>
            <p>
              A useful brief.
              <br />A person in control.
            </p>
            <span className="handoff-status">
              Ready for team review <ArrowUpRight size={13} />
            </span>
          </div>
          <p className="qualification-note">Illustrative context, not a real lead.</p>
        </aside>
      </div>
      <div className="interface-workflow">
        <span className="workflow-caption">Intended workflow</span>
        <ol>
          {['Capture', 'Respond', 'Qualify', 'Human handoff'].map((step, i) => (
            <li key={step}>
              <span className={i === 2 ? 'workflow-current' : 'workflow-complete'}>
                {i < 2 ? <Check size={11} /> : i + 1}
              </span>
              <strong>{step}</strong>
              {i < 3 && <ChevronRight size={13} />}
            </li>
          ))}
        </ol>
      </div>
    </figure>
  );
}
