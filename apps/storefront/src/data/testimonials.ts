// Curated editorial content, not mock data.
//
// The other files that lived in this directory were stand-ins for API calls
// and have been removed now that those endpoints are wired. These testimonials
// are deliberately static: they are marketing copy with signed-off wording,
// they change a few times a year, and there is no admin surface for them yet.
//
// If they ever need to be editable without a deploy, they get a table and an
// endpoint like everything else — until then this is the honest home for them.

import type { Testimonial } from '@/types'

export const testimonials: Testimonial[] = [
  {
    id: 'tes-001',
    author: 'Hajjah Nadia Bashir',
    location: 'Lahore',
    avatar: '/images/avatars/av-5.jpg',
    text: 'Yala Haji made our Hajj preparations so easy. The kit had everything — and the quality was mashAllah outstanding. We felt fully prepared and blessed.',
    rating: 5,
    type: 'text',
  },
  {
    id: 'tes-002',
    author: 'Usman Farooq',
    location: 'Karachi',
    avatar: '/images/avatars/av-6.jpg',
    text: 'I was hesitant to buy online but the COD option gave me confidence. The products arrived beautifully packaged and exactly as described. The ihram is superb quality.',
    rating: 5,
    type: 'text',
  },
  {
    id: 'tes-003',
    author: 'Zara Anwar',
    location: 'Islamabad',
    text: 'Ordered the Premium Kit as a gift for my parents going for Umrah. They were absolutely delighted. The packaging felt like a luxury unboxing experience. Highly recommended!',
    rating: 5,
    type: 'text',
  },
  {
    id: 'tes-004',
    author: 'Sheikh Yusuf Ali',
    location: 'Multan',
    text: 'The oud attar I purchased is of exceptional quality. Very long-lasting, alcohol-free, and has a beautiful aroma. Fast shipping, great customer service. Will order again.',
    rating: 5,
    type: 'text',
  },
  {
    id: 'tes-005',
    author: 'Amina Malik',
    location: 'Faisalabad',
    text: 'The abaya I bought for Umrah was perfect. Light, breathable, and so comfortable during tawaf. I have recommended Yala Haji to all my friends planning Umrah this year.',
    rating: 5,
    type: 'text',
  },
  {
    id: 'tes-006',
    author: 'Hafiz Tariq Mehmood',
    location: 'Peshawar',
    text: 'SubhanAllah, the quality is unmatched in Pakistan. The Ajwa dates are authentic and fresh. The kit builder feature let me customise exactly what I needed. JazakAllah khair!',
    rating: 5,
    type: 'text',
  },
]
