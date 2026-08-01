/** Lightweight health check payload for Railway/Vercel/Cloudflare monitors */
export function getHealthStatus() {
  return {
    status: 'ok',
    service: 'vibe-alerts',
    timestamp: new Date().toISOString(),
  };
}
