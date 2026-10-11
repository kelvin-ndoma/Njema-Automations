import { ImageResponse } from 'next/og';
export const alt =
  'Relay Sales — Every lead deserves a response. Every opportunity deserves a follow-up.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        background: '#173e34',
        color: '#f6f4ed',
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        padding: '70px',
        justifyContent: 'space-between',
      }}
    >
      <div style={{ display: 'flex', fontSize: 40 }}>relay.</div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          fontSize: 62,
          lineHeight: 1.14,
          letterSpacing: '-2px',
        }}
      >
        <span>Every lead deserves a response.</span>
        <span style={{ color: '#dceaaf' }}>Every opportunity deserves</span>
        <span style={{ color: '#dceaaf' }}>a follow-up.</span>
      </div>
      <div style={{ display: 'flex', fontSize: 20, color: '#baccb2' }}>
        Your AI sales employee · AI capabilities in development
      </div>
    </div>,
    size,
  );
}
