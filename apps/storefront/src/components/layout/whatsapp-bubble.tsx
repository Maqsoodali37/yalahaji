'use client'

import { MessageCircle } from 'lucide-react'

const WA_NUMBER = '923111234567'
const WA_MESSAGE = encodeURIComponent('As-salamu alaykum! I have a question about my order.')

export function WhatsAppBubble() {
  return (
    <a
      href={`https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat on WhatsApp"
      className="fixed bottom-20 end-5 z-40 md:bottom-6 w-14 h-14 bg-[#25D366] text-white rounded-full shadow-lg flex items-center justify-center hover:scale-105 transition-transform"
    >
      <MessageCircle className="w-7 h-7 fill-white stroke-none" />
    </a>
  )
}
