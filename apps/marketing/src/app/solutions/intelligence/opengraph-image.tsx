import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Levelset Solutions — Intelligence';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: 'linear-gradient(135deg, #1a3d2d 0%, #264D38 50%, #1e3f2e 100%)',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.45)',
              textTransform: 'uppercase' as const,
              letterSpacing: '3px',
            }}
          >
            Levelset Solutions
          </div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Intelligence
          </div>
          <div
            style={{
              fontSize: 28,
              color: 'rgba(255, 255, 255, 0.6)',
              lineHeight: 1.4,
              maxWidth: '800px',
            }}
          >
            AI-powered insights, retention analytics, and customer feedback.
          </div>
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '60px',
            right: '80px',
            fontSize: 20,
            color: 'rgba(255, 255, 255, 0.35)',
          }}
        >
          levelset.io
        </div>
      </div>
    ),
    { ...size },
  );
}
