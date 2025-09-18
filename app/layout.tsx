import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import './globals.css'
import { AuthProvider } from '@/contexts/auth-context'
import { BulkEvaluationProvider } from '@/contexts/bulk-evaluation-context'
import { Toaster } from '@/components/ui/toaster'
import { RefreshCacheManager } from '@/components/refresh-cache-manager'

export const metadata: Metadata = {
  title: 'SparrowATS - Recruitment Management',
  description: 'Modern recruitment and applicant tracking system powered by SparrowAI',
  keywords: 'recruitment, ATS, applicant tracking, hiring, jobs, candidates, SparrowAI',
  authors: [{ name: 'SparrowAI' }],
  creator: 'SparrowAI',
  publisher: 'SparrowAI',
  applicationName: 'SparrowATS',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <style>{`
html {
  font-family: ${GeistSans.style.fontFamily};
  --font-sans: ${GeistSans.variable};
  --font-mono: ${GeistMono.variable};
}
        `}</style>
      </head>
      <body>
        <AuthProvider>
          <BulkEvaluationProvider>
            <RefreshCacheManager />
            {children}
            <Toaster />
          </BulkEvaluationProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
