import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Levelset — Team management for Chick-fil-A operators';
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
            gap: '24px',
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-2px',
              lineHeight: 1.1,
            }}
          >
            Levelset
          </div>
          <div
            style={{
              fontSize: 32,
              color: 'rgba(255, 255, 255, 0.7)',
              lineHeight: 1.4,
              maxWidth: '800px',
            }}
          >
            Team management built exclusively for Chick-fil-A operators.
          </div>
          <div
            style={{
              display: 'flex',
              gap: '16px',
              marginTop: '16px',
            }}
          >
            {['Ratings', 'Discipline', 'Scheduling', 'Pay'].map((label) => (
              <div
                key={label}
                style={{
                  fontSize: 18,
                  color: 'rgba(255, 255, 255, 0.5)',
                  padding: '8px 20px',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  borderRadius: '8px',
                }}
              >
                {label}
              </div>
            ))}
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
