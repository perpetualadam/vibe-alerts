'use client';

export default function MetricCard({
  label,
  value,
  hint,
  accent = 'default',
  light = false,
}) {
  const accents = light
    ? {
        default: 'text-zinc-900',
        success: 'text-emerald-600',
        danger: 'text-red-600',
        accent: 'text-indigo-600',
        muted: 'text-zinc-500',
      }
    : {
        default: 'text-white',
        success: 'text-emerald-400',
        danger: 'text-red-400',
        accent: 'text-vibe-accent',
        muted: 'text-vibe-muted',
      };

  return (
    <div
      className={`rounded-xl p-4 sm:p-5 min-h-[108px] flex flex-col justify-between border ${
        light
          ? 'bg-white border-zinc-200 shadow-sm'
          : 'glass'
      }`}
    >
      <p
        className={`text-xs uppercase tracking-wider font-medium ${
          light ? 'text-zinc-500' : 'text-vibe-muted'
        }`}
      >
        {label}
      </p>
      <p className={`text-2xl sm:text-3xl font-bold mt-2 tabular-nums ${accents[accent] || accents.default}`}>
        {value}
      </p>
      {hint && (
        <p className={`text-xs mt-2 ${light ? 'text-zinc-500' : 'text-vibe-muted'}`}>{hint}</p>
      )}
    </div>
  );
}
