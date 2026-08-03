import { AUDIENCE_SEGMENTS } from '@/lib/marketing/audiences';

function AudienceCard({ audience }) {
  return (
    <article className="glass rounded-2xl p-6 space-y-4 hover:border-vibe-accent/30 transition-colors h-full">
      <div className="space-y-1">
        <span className="text-2xl" aria-hidden="true">
          {audience.icon}
        </span>
        <h3 className="font-semibold text-lg">{audience.title}</h3>
        <p className="text-xs text-vibe-muted">{audience.examples}</p>
      </div>
      <ul className="space-y-4">
        {audience.problems.map((item) => (
          <li key={item.problem} className="space-y-2 text-sm leading-relaxed">
            <p className="text-vibe-muted">
              <span className="text-red-300/90 font-medium">Problem: </span>
              {item.problem}
            </p>
            <p>
              <span className="text-emerald-300 font-medium">✓ VibeAlerts: </span>
              <span className="text-vibe-muted">{item.solution}</span>
            </p>
          </li>
        ))}
      </ul>
    </article>
  );
}

function AudienceGroup({ segment, compact = false }) {
  return (
    <div className="space-y-6">
      <div className={compact ? 'space-y-2' : 'text-center space-y-3 max-w-2xl mx-auto'}>
        <p className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider bg-vibe-accent/10 text-vibe-accent ring-1 ring-vibe-accent/25">
          {segment.label}
        </p>
        <h3 className={compact ? 'text-xl font-bold' : 'text-2xl sm:text-3xl font-bold tracking-tight'}>
          {segment.title}
        </h3>
        {!compact && <p className="section-lead !max-w-none">{segment.description}</p>}
        {compact && <p className="text-sm text-vibe-muted leading-relaxed">{segment.description}</p>}
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {segment.audiences.map((audience) => (
          <AudienceCard key={audience.title} audience={audience} />
        ))}
      </div>
    </div>
  );
}

/**
 * @param {{ compact?: boolean, showSecondary?: boolean }} props
 */
export default function AudienceProblems({ compact = false, showSecondary = true }) {
  return (
    <section
      id="who-its-for"
      className={
        compact
          ? 'space-y-10'
          : 'max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 border-t border-vibe-border'
      }
      aria-labelledby={compact ? undefined : 'audience-problems-heading'}
    >
      {!compact && (
        <div className="text-center space-y-3 mb-12">
          <h2 id="audience-problems-heading" className="section-heading">
            Problems we solve
          </h2>
          <p className="section-lead">
            If you rely on website forms for leads but miss notifications, VibeAlerts was built for you.
          </p>
        </div>
      )}

      <div className="space-y-14 sm:space-y-16">
        <AudienceGroup segment={AUDIENCE_SEGMENTS.primary} compact={compact} />
        {showSecondary && <AudienceGroup segment={AUDIENCE_SEGMENTS.secondary} compact={compact} />}
      </div>
    </section>
  );
}
