import { buildLlmsFullTxt } from '@/lib/seo/llms';

/** LLMO: extended machine-readable reference */
export async function GET() {
  return new Response(buildLlmsFullTxt(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}
