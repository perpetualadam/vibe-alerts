import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const ALLOWED = new Set([192, 512]);

/**
 * Dynamic PWA icons (192 / 512) — solid brand mark for installability.
 */
export async function GET(_request, { params }) {
  const resolved = await params;
  const size = Number(resolved?.size);
  if (!ALLOWED.has(size)) {
    return new Response('Not found', { status: 404 });
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0a0a0f',
          borderRadius: size * 0.18,
        }}
      >
        <div
          style={{
            width: size * 0.72,
            height: size * 0.72,
            borderRadius: size * 0.16,
            background: 'linear-gradient(145deg, #6366f1 0%, #4f46e5 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            fontSize: size * 0.34,
            fontWeight: 700,
            letterSpacing: -1,
          }}
        >
          VA
        </div>
      </div>
    ),
    { width: size, height: size }
  );
}
