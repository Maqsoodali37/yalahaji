import type { KitCategory } from '@/types'
import { products } from './products'

export const kitCategories: KitCategory[] = [
  {
    id: 'kc-ihram',
    name: { en: 'Ihram', ur: 'احرام', ar: 'الإحرام' },
    icon: '🤍',
    required: true,
    products: products.filter((p) => p.categorySlug === 'ihram'),
  },
  {
    id: 'kc-prayer',
    name: { en: 'Prayer Items', ur: 'نماز کی اشیاء', ar: 'مستلزمات الصلاة' },
    icon: '📿',
    required: true,
    products: products.filter((p) => p.categorySlug === 'prayer-accessories'),
  },
  {
    id: 'kc-fragrance',
    name: { en: 'Attar & Fragrance', ur: 'عطر و خوشبو', ar: 'العطر والعطور' },
    icon: '🌹',
    required: false,
    products: products.filter((p) => p.categorySlug === 'fragrances'),
  },
  {
    id: 'kc-clothing',
    name: { en: 'Abaya / Thobe', ur: 'عبایہ / ثوب', ar: 'العباءة / الثوب' },
    icon: '👗',
    required: false,
    products: products.filter(
      (p) => p.categorySlug === 'abaya-hijab' || p.categorySlug === 'thobe'
    ),
  },
  {
    id: 'kc-dates',
    name: { en: 'Dates & Zam Zam', ur: 'کھجور و زم زم', ar: 'التمور وزمزم' },
    icon: '🌴',
    required: false,
    products: products.filter((p) => p.categorySlug === 'dates-zamzam'),
  },
]
