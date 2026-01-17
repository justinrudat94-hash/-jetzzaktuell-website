'use client'

import { motion } from 'framer-motion'
import {
  MapPin,
  Calendar,
  Heart,
  Users,
  Ticket,
  TrendingUp,
  Shield,
  Zap,
} from 'lucide-react'

const features = [
  {
    icon: MapPin,
    title: 'Events in deiner Nähe',
    description:
      'Entdecke Events basierend auf deinem Standort. Finde sofort, was in deiner Stadt los ist.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    icon: Calendar,
    title: 'Eigene Events erstellen',
    description:
      'Organisiere deine eigenen Events, lade Freunde ein und verwalte Teilnehmer mit wenigen Klicks.',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
  },
  {
    icon: Heart,
    title: 'Favoriten & Erinnerungen',
    description:
      'Speichere deine Lieblings-Events und erhalte Benachrichtigungen, damit du nichts verpasst.',
    color: 'text-red-600',
    bgColor: 'bg-red-100',
  },
  {
    icon: Users,
    title: 'Social Features',
    description:
      'Folge Veranstaltern, like Events, kommentiere und vernetze dich mit der Community.',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    icon: Ticket,
    title: 'Ticket-Integration',
    description:
      'Kaufe Tickets direkt in der App und habe alle deine Event-Tickets an einem Ort.',
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
  },
  {
    icon: TrendingUp,
    title: 'Trending Events',
    description:
      'Entdecke angesagte Events und beliebte Veranstaltungen in deiner Region.',
    color: 'text-pink-600',
    bgColor: 'bg-pink-100',
  },
  {
    icon: Shield,
    title: 'Sicher & Verifiziert',
    description:
      'KYC-Verifizierung für Veranstalter und sichere Zahlungsabwicklung über Stripe.',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
  {
    icon: Zap,
    title: 'Live-Streams',
    description:
      'Streame Events live und erreiche ein noch größeres Publikum mit integrierten Live-Features.',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
  },
]

export default function Features() {
  return (
    <section id="features" className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-4">
            Alles, was du brauchst
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Jetzz bietet dir alle Features, um Events zu entdecken, zu erstellen und zu teilen.
            Eine Plattform für alle Event-Bedürfnisse.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="group p-6 rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-xl transition-all duration-300 cursor-pointer"
            >
              <div
                className={`${feature.bgColor} w-14 h-14 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
              >
                <feature.icon className={`${feature.color}`} size={28} />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
