import { ImageResponse } from 'next/og'

export const size = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: 32,
        height: 32,
        background: '#B8962E',
        borderRadius: 7,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 3,
          alignItems: 'flex-start',
          paddingLeft: 8,
        }}
      >
        <div style={{ width: 14, height: 2, background: 'white', borderRadius: 1 }} />
        <div style={{ width: 10, height: 2, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
        <div style={{ width: 14, height: 2, background: 'white', borderRadius: 1 }} />
        <div style={{ width: 8, height: 2, background: 'rgba(255,255,255,0.7)', borderRadius: 1 }} />
      </div>
    </div>,
    { ...size }
  )
}
