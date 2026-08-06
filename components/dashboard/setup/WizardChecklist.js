'use client';

/**
 * Progress checklist for the Website Integration Wizard.
 */
export default function WizardChecklist({ checklist, steps, activeStep, onSelect }) {
  return (
    <ol className="space-y-2" aria-label="Setup progress">
      {checklist.map((item, index) => {
        const done = Boolean(steps?.[item.id]);
        const active = activeStep === item.id;
        return (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onSelect?.(item.id)}
              className={`w-full text-left flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors ${
                active
                  ? 'bg-white/10 ring-1 ring-vibe-border'
                  : 'hover:bg-white/5'
              }`}
            >
              <span
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  done
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40'
                    : active
                      ? 'bg-vibe-accent/20 text-vibe-accent ring-1 ring-vibe-accent/40'
                      : 'bg-white/5 text-vibe-muted ring-1 ring-vibe-border'
                }`}
                aria-hidden
              >
                {done ? '✓' : index + 1}
              </span>
              <span>
                <span className="block text-sm font-medium">{item.label}</span>
                <span className="block text-xs text-vibe-muted mt-0.5">{item.description}</span>
              </span>
            </button>
          </li>
        );
      })}
    </ol>
  );
}
