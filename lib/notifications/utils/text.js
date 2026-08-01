/**
 * Low-level text utilities shared by providers.
 * Formatting logic lives in each provider — these are building blocks only.
 */

export function formatFieldLabel(key) {
  return key
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function escapeMarkdownV2(text) {
  return String(text).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, '\\$1');
}

export function payloadToPlainLines(payload, sourceLabel = 'Website Form') {
  const lines = [`New Lead — ${sourceLabel}`, ''];
  for (const [key, value] of Object.entries(payload)) {
    lines.push(`${formatFieldLabel(key)}: ${value}`);
  }
  lines.push('', 'Received via VibeAlerts');
  return lines;
}
