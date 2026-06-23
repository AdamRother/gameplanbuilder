import type { Metadata } from 'next'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Game Plan Builder',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen" style={{ backgroundColor: '#f5f3ee' }}>
        {children}
        <Toaster position="bottom-right" richColors />
      </body>
    </html>
  )
}
