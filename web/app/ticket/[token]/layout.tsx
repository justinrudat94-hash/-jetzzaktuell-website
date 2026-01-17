import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Support-Ticket - Jetzz',
  description: 'Dein Support-Ticket bei Jetzz',
}

export default function TicketLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children;
}
