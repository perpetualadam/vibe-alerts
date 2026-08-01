import { buildLlmsTxt } from '@/lib/seo/llms';

/** LLMO: machine-readable product summary for AI crawlers */
export async function GET() {
  return new Response(buildLlmsTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
