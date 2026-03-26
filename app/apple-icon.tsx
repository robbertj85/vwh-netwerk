import { ImageResponse } from 'next/og';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#b91c1c',
          borderRadius: 36,
        }}
      >
        <svg
          width="120"
          height="120"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M1 17h2m8 0h4m4 0h2" />
          <circle cx="6" cy="17" r="2.5" />
          <circle cx="18" cy="17" r="2.5" />
          <path d="M3.5 17V6a1 1 0 0 1 1-1H14v12" />
          <path d="M14 9h3.5a1 1 0 0 1 .8.4l3 3.8a1 1 0 0 1 .2.6V16a1 1 0 0 1-1 1h-1" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
