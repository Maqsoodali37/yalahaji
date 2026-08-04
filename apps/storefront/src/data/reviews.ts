import type { Review } from '@/types'

export const reviews: Review[] = [
  {
    id: 'rev-001',
    productId: 'prod-kit-002',
    author: 'Fatima Malik',
    avatar: '/images/avatars/av-1.jpg',
    rating: 5,
    title: 'Absolutely perfect for Umrah!',
    body: 'I purchased the Standard Umrah Kit for my first Umrah and it had everything I needed. The ihram quality is excellent — so soft and breathable. The prayer mat is beautiful and rolled up easily in my carry-on. The attar smells amazing and lasts all day. Packaging was gorgeous too, made it feel like a real gift. Will definitely order again for Hajj.',
    images: ['/images/reviews/rev-001-1.jpg', '/images/reviews/rev-001-2.jpg'],
    verified: true,
    helpful: 47,
    createdAt: '2025-03-12T00:00:00Z',
  },
  {
    id: 'rev-002',
    productId: 'prod-kit-002',
    author: 'Muhammad Tariq',
    avatar: '/images/avatars/av-2.jpg',
    rating: 5,
    title: 'Best gift for my father',
    body: 'Bought this as a gift for my father who was going for Umrah. He loved every item in it. The leather bag was especially impressive — looks very premium for the price. Delivery was super fast too, arrived in 2 days. Highly recommend Yala Haji!',
    verified: true,
    helpful: 31,
    createdAt: '2025-02-28T00:00:00Z',
  },
  {
    id: 'rev-003',
    productId: 'prod-kit-002',
    author: 'Aisha Rehman',
    rating: 4,
    title: 'Good quality, slight delay in shipping',
    body: 'Overall very happy with the quality of the kit. The ihram is pure cotton and feels very premium. Only issue was shipping took 5 days instead of 3, but the product itself is 5 stars.',
    verified: true,
    helpful: 12,
    createdAt: '2025-01-15T00:00:00Z',
  },
  {
    id: 'rev-004',
    productId: 'prod-kit-003',
    author: 'Dr. Hassan Qureshi',
    avatar: '/images/avatars/av-3.jpg',
    rating: 5,
    title: 'Worth every rupee!',
    body: 'The Premium Kit is absolutely stunning. The Egyptian cotton ihram is unbelievably soft — I could not believe the quality. The oud attar is divine, and the Ajwa dates were fresh and delicious. The leather bag is very sturdy. This is the perfect Hajj gift. MashAllah, Yala Haji team has done an incredible job.',
    images: ['/images/reviews/rev-004-1.jpg'],
    verified: true,
    helpful: 89,
    createdAt: '2025-05-20T00:00:00Z',
  },
  {
    id: 'rev-005',
    productId: 'prod-ihram-002',
    author: 'Bilal Ahmed',
    rating: 5,
    title: 'Best ihram I have ever used',
    body: '100% cotton, very breathable. I wore this in Makkah during summer and it was comfortable throughout tawaf and sa\'i. The belt is a nice touch. No pilling after multiple washes. Will order again.',
    verified: true,
    helpful: 55,
    createdAt: '2025-04-08T00:00:00Z',
  },
  {
    id: 'rev-006',
    productId: 'prod-attar-002',
    author: 'Zainab Siddiqui',
    avatar: '/images/avatars/av-4.jpg',
    rating: 5,
    title: 'Royal Oud is incredible!',
    body: 'Purchased the Premium Royal Oud Blend. The fragrance is deep, rich, and long-lasting. A tiny drop lasts the whole day. No alcohol at all — 100% pure attar. Makes you feel like royalty. Perfect for special prayers and Friday prayers.',
    verified: true,
    helpful: 38,
    createdAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'rev-007',
    productId: 'prod-abaya-001',
    author: 'Saima Khan',
    rating: 5,
    title: 'Perfect Umrah abaya!',
    body: 'This abaya is absolutely perfect for Umrah. Very light and breathable even in the heat. The loose fit makes it easy to move during tawaf. The hood is a lovely feature. Wash and wear — no ironing needed. I bought size M and it fits perfectly.',
    images: ['/images/reviews/rev-007-1.jpg'],
    verified: true,
    helpful: 67,
    createdAt: '2025-03-25T00:00:00Z',
  },
  {
    id: 'rev-008',
    productId: 'prod-dates-001',
    author: 'Imran Hussain',
    rating: 5,
    title: 'Genuinely from Madinah!',
    body: 'You can taste the difference. These Ajwa dates are the real deal — moist, sweet, and have that distinctive Madinah flavour. The gift box presentation is beautiful. Bought 3 boxes as gifts and everyone loved them. Will be ordering more.',
    verified: true,
    helpful: 29,
    createdAt: '2025-05-15T00:00:00Z',
  },
]

export const getReviewsByProduct = (productId: string) =>
  reviews.filter((r) => r.productId === productId)

export const getAverageRating = (productId: string) => {
  const productReviews = getReviewsByProduct(productId)
  if (!productReviews.length) return 0
  return productReviews.reduce((sum, r) => sum + r.rating, 0) / productReviews.length
}
