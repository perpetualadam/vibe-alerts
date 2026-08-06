/**
 * CSV export helpers for analytics datasets.
 */

/**
 * @param {string} value
 */
function escapeCsv(value) {
  const str = value == null ? '' : String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * @param {string[]} headers
 * @param {Array<Record<string, unknown>>} rows
 * @param {string[]} [keys]
 */
export function toCsv(headers, rows, keys) {
  const cols = keys ?? headers.map((_, i) => headers[i]);
  const lines = [headers.map(escapeCsv).join(',')];
  for (const row of rows) {
    lines.push(cols.map((key) => escapeCsv(row[key])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Build a multi-section analytics CSV export.
 * @param {Object} data
 */
export function buildAnalyticsCsv(data) {
  const sections = [];

  sections.push('Overview');
  sections.push(
    toCsv(
      ['Metric', 'Value'],
      [
        { Metric: 'Total Webhooks', Value: data.overview?.totalWebhooks ?? 0 },
        { Metric: 'Notifications Sent', Value: data.overview?.notificationsSent ?? 0 },
        { Metric: 'Successful Deliveries', Value: data.overview?.successfulDeliveries ?? 0 },
        { Metric: 'Failed Deliveries', Value: data.overview?.failedDeliveries ?? 0 },
        {
          Metric: 'Average Delivery Time (ms)',
          Value: data.overview?.averageDeliveryTimeMs ?? 0,
        },
        { Metric: 'Active Notification Providers', Value: data.overview?.activeProviders ?? 0 },
        { Metric: 'Top Notification Channel', Value: data.overview?.topChannel ?? '' },
        { Metric: 'Spam Flagged', Value: data.spam?.flagged ?? 0 },
        { Metric: 'Spam Flag Rate', Value: data.spam?.flagRate ?? 0 },
      ],
      ['Metric', 'Value']
    ).trimEnd()
  );

  sections.push('', 'Daily Usage');
  sections.push(
    toCsv(
      ['Day', 'Webhooks', 'Sent', 'Failed'],
      (data.daily ?? []).map((r) => ({
        Day: r.day,
        Webhooks: r.webhooks,
        Sent: r.sent,
        Failed: r.failed,
      })),
      ['Day', 'Webhooks', 'Sent', 'Failed']
    ).trimEnd()
  );

  sections.push('', 'Monthly Usage');
  sections.push(
    toCsv(
      ['Month', 'Webhooks', 'Sent', 'Failed'],
      (data.monthly ?? []).map((r) => ({
        Month: r.month,
        Webhooks: r.webhooks,
        Sent: r.sent,
        Failed: r.failed,
      })),
      ['Month', 'Webhooks', 'Sent', 'Failed']
    ).trimEnd()
  );

  sections.push('', 'Top Sources');
  sections.push(
    toCsv(
      ['Source', 'Count'],
      (data.topSources ?? []).map((r) => ({ Source: r.source, Count: r.count })),
      ['Source', 'Count']
    ).trimEnd()
  );

  sections.push('', 'Channels');
  sections.push(
    toCsv(
      ['Provider', 'Total', 'Sent', 'Failed', 'Avg Delivery Ms'],
      (data.channels ?? []).map((r) => ({
        Provider: r.provider,
        Total: r.total,
        Sent: r.sent,
        Failed: r.failed,
        'Avg Delivery Ms': r.avgDeliveryMs,
      })),
      ['Provider', 'Total', 'Sent', 'Failed', 'Avg Delivery Ms']
    ).trimEnd()
  );

  sections.push('', 'Spam Signals');
  sections.push(
    toCsv(
      ['Signal', 'Count'],
      (data.spam?.topSignals ?? []).map((r) => ({
        Signal: r.name,
        Count: r.count,
      })),
      ['Signal', 'Count']
    ).trimEnd()
  );

  return `${sections.join('\n')}\n`;
}
