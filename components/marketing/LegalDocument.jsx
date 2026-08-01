export default function LegalDocument({ title, lastUpdated, children }) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="text-sm text-vibe-muted">Last updated: {lastUpdated}</p>
      </header>
      <div className="space-y-6 text-sm text-vibe-muted leading-relaxed [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-white [&_h2]:pt-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_a]:text-vibe-accent [&_a]:hover:underline">
        {children}
      </div>
    </article>
  );
}
