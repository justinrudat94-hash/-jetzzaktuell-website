'use client'

import { motion } from 'framer-motion'
import { Apple, Smartphone } from 'lucide-react'

export default function Download() {
  return (
    <section id="download" className="py-24 bg-gradient-to-br from-primary-600 to-blue-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-white"
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Bereit für dein nächstes Event?
            </h2>
            <p className="text-xl text-blue-100 mb-8 leading-relaxed">
              Lade dir jetzt die Jetzz App kostenlos herunter und entdecke tausende Events in
              deiner Nähe. Verfügbar für iOS und Android.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <a
                href="#"
                className="group bg-black text-white px-6 py-4 rounded-xl flex items-center space-x-3 hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Apple size={32} />
                <div className="text-left">
                  <div className="text-xs text-gray-300">Download on the</div>
                  <div className="text-lg font-semibold">App Store</div>
                </div>
              </a>

              <a
                href="#"
                className="group bg-black text-white px-6 py-4 rounded-xl flex items-center space-x-3 hover:bg-gray-900 transition-all duration-300 shadow-lg hover:shadow-xl"
              >
                <Smartphone size={32} />
                <div className="text-left">
                  <div className="text-xs text-gray-300">Get it on</div>
                  <div className="text-lg font-semibold">Google Play</div>
                </div>
              </a>
            </div>

            <div className="grid grid-cols-3 gap-8 pt-8 border-t border-blue-400">
              <div>
                <div className="text-3xl font-bold mb-1">10K+</div>
                <div className="text-blue-200 text-sm">Events</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">50K+</div>
                <div className="text-blue-200 text-sm">Downloads</div>
              </div>
              <div>
                <div className="text-3xl font-bold mb-1">4.8★</div>
                <div className="text-blue-200 text-sm">Rating</div>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="relative"
          >
            <div className="relative z-10">
              <img
                src="https://images.pexels.com/photos/887751/pexels-photo-887751.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt="App Mockup"
                className="rounded-3xl shadow-2xl"
              />
            </div>
            <div className="absolute -inset-4 bg-white rounded-3xl opacity-10 blur-2xl"></div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
