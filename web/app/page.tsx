import Navigation from '@/components/Navigation'
import Hero from '@/components/Hero'
import SpotlightSection from '@/components/SpotlightSection'
import EventsSection from '@/components/EventsSection'
import Features from '@/components/Features'
import Download from '@/components/Download'
import Footer from '@/components/Footer'

export default function Home() {
  return (
    <main className="min-h-screen">
      <Navigation />
      <Hero />
      <SpotlightSection />
      <EventsSection />
      <Features />
      <Download />
      <Footer />
    </main>
  )
}
