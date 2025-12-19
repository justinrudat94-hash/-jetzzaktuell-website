import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Jetzz - Entdecke Events in deiner Nähe',
  description: 'Die ultimative Event-App für Deutschland. Finde Konzerte, Festivals, Partys und mehr in deiner Stadt.',
  keywords: 'Events, Konzerte, Festivals, Party, Tickets, Deutschland',
  openGraph: {
    title: 'Jetzz - Entdecke Events in deiner Nähe',
    description: 'Die ultimative Event-App für Deutschland',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body className={inter.className}>{children}</body>
    </html>
  )
}
