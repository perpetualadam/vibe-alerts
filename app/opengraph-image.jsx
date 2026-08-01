import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'VibeAlerts — Website forms to Telegram alerts';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #0a0a0f 0%, #1a1033 100%)',
          color: '#ffffff',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ fontSize: 28, color: '#a78bfa', marginBottom: 16, letterSpacing: 4 }}>
          VIBEALERTS
        </div>
        <div style={{ fontSize: 56, fontWeight: 700, textAlign: 'center', maxWidth: 900, lineHeight: 1.2 }}>
          Website forms → Telegram alerts
        </div>
        <div style={{ fontSize: 24, color: '#9ca3af', marginTop: 24, textAlign: 'center', maxWidth: 700 }}>
          WordPress · Wix · Webflow · Shopify · Typeform
        </div>
      </div>
    ),
    { ...size }
  );
}
