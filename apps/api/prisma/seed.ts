import { PrismaClient, Tier } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Yala Haji database…')

  // ── Admin user ────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { phone: '+923001234567' },
    update: {},
    create: {
      name: 'Yala Haji Admin',
      email: 'admin@yalahaji.com',
      phone: '+923001234567',
      passwordHash: await bcrypt.hash('admin123', 10),
      role: 'admin',
      loyaltyPoints: 0,
    },
  })
  console.log('✅ Admin user:', admin.email)

  // ── Categories ────────────────────────────────────────────────────────────
  const categories = await Promise.all([
    prisma.category.upsert({
      where: { slug: 'kits' },
      update: {},
      create: {
        slug: 'kits', order: 1, featured: true,
        nameEn: 'Hajj & Umrah Kits', nameUr: 'حج و عمرہ کٹس', nameAr: 'طقم الحج والعمرة',
        descEn: 'Complete kits for Hajj and Umrah pilgrims.',
        descUr: 'حج اور عمرہ کے لیے مکمل کٹس۔',
        descAr: 'طقم كاملة لحجاج وعمار.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'ihram' },
      update: {},
      create: {
        slug: 'ihram', order: 2, featured: true,
        nameEn: 'Ihram', nameUr: 'احرام', nameAr: 'إحرام',
        descEn: 'Unstitched ihram cloth for men and women.',
        descUr: 'مردوں اور خواتین کے لیے بغیر سلائی احرام۔',
        descAr: 'قماش إحرام غير مخيط للرجال والنساء.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'fragrances' },
      update: {},
      create: {
        slug: 'fragrances', order: 3, featured: true,
        nameEn: 'Fragrances & Attar', nameUr: 'خوشبو اور عطر', nameAr: 'عطور',
        descEn: 'Alcohol-free attars and fragrances, ihram safe.',
        descUr: 'الکوحل فری عطر، احرام کے لیے موزوں۔',
        descAr: 'عطور خالية من الكحول آمنة للإحرام.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'prayer-accessories' },
      update: {},
      create: {
        slug: 'prayer-accessories', order: 4, featured: true,
        nameEn: 'Prayer Accessories', nameUr: 'نماز کی اشیاء', nameAr: 'مستلزمات الصلاة',
        descEn: 'Prayer mats, tasbeeh, miswak and more.',
        descUr: 'جانماز، تسبیح، مسواک اور مزید۔',
        descAr: 'سجادات الصلاة والمسابح والسواك.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'abaya-hijab' },
      update: {},
      create: {
        slug: 'abaya-hijab', order: 5, featured: true,
        nameEn: 'Abaya & Hijab', nameUr: 'عبایہ اور حجاب', nameAr: 'عباءة وحجاب',
        descEn: 'Modest wear for women on pilgrimage.',
        descUr: 'حج و عمرہ کے لیے خواتین کا لباس۔',
        descAr: 'ملابس محتشمة للمرأة في الحج والعمرة.',
      },
    }),
    prisma.category.upsert({
      where: { slug: 'dates-zamzam' },
      update: {},
      create: {
        slug: 'dates-zamzam', order: 6, featured: false,
        nameEn: 'Dates & Zam Zam', nameUr: 'کھجور اور زم زم', nameAr: 'تمور وزمزم',
        descEn: 'Premium Ajwa dates and Zam Zam water from Madinah.',
        descUr: 'مدینہ سے عجوہ کھجور اور زم زم پانی۔',
        descAr: 'تمور عجوة وماء زمزم من المدينة المنورة.',
      },
    }),
  ])
  console.log('✅ Categories:', categories.length)

  // ── Products ──────────────────────────────────────────────────────────────
  const catMap = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  const umrahKitStd = await prisma.product.upsert({
    where: { slug: 'complete-umrah-kit-standard' },
    update: {},
    create: {
      slug: 'complete-umrah-kit-standard',
      sku: 'YH-KIT-UMR-002',
      nameEn: 'Complete Umrah Kit — Standard',
      nameUr: 'مکمل عمرہ کٹ — اسٹینڈرڈ',
      nameAr: 'طقم العمرة الكامل — قياسي',
      descEn: 'Our most popular Umrah kit. Premium-quality ihram, velvet prayer mat, crystal tasbeeh, luxury attar roll-on, miswak, and a branded travel bag.',
      descUr: 'ہمارا سب سے مقبول عمرہ کٹ۔ اعلیٰ کوالٹی احرام، مخملی جانماز، کرسٹل تسبیح، لگژری عطر، مسواک اور برانڈڈ بیگ۔',
      descAr: 'طقم العمرة الأكثر مبيعاً.',
      shortDescEn: 'Best-seller — complete Umrah kit with premium contents.',
      shortDescUr: 'بیسٹ سیلر — مکمل عمرہ کٹ۔',
      shortDescAr: 'الأكثر مبيعاً.',
      categoryId: catMap['kits'],
      isKit: true,
      hasGiftWrap: true,
      avgRating: 4.7,
      reviewCount: 243,
      soldCount: 1456,
      isFeatured: true,
      badges: { create: [{ badge: 'hot' }, { badge: 'bestseller' }] },
      tags: { create: [{ tag: 'umrah' }, { tag: 'kit' }, { tag: 'standard' }, { tag: 'popular' }] },
      variants: {
        create: [
          { sku: 'YH-KIT-UMR-002-STD', tier: Tier.Standard, price: 499900, compareAtPrice: 650000, stock: 30, lowStockThreshold: 8 },
        ],
      },
      images: {
        create: [
          { url: '/images/products/kit-standard-1.jpg', alt: 'Complete Umrah Kit Standard', isPrimary: true, order: 0 },
          { url: '/images/products/kit-standard-2.jpg', alt: 'Standard kit contents', isPrimary: false, order: 1 },
          { url: '/images/products/kit-standard-3.jpg', alt: 'Standard kit in gift box', isPrimary: false, order: 2 },
        ],
      },
    },
  })

  const ihramEco = await prisma.product.upsert({
    where: { slug: 'ihram-cloth-economy' },
    update: {},
    create: {
      slug: 'ihram-cloth-economy',
      sku: 'YH-IHR-MEN-001',
      nameEn: 'Ihram Cloth — Economy',
      nameUr: 'احرام کپڑا — اکانومی',
      nameAr: 'قماش الإحرام — اقتصادي',
      descEn: 'Affordable 2-piece unstitched ihram for men. 60% cotton, 40% polyester blend.',
      descUr: 'سستا 2 ٹکڑا بغیر سلائی احرام۔',
      descAr: 'إحرام غير مخيط من قطعتين بسعر معقول.',
      shortDescEn: 'Affordable cotton-blend ihram for men.',
      shortDescUr: 'سستا کپاس احرام۔',
      shortDescAr: 'إحرام اقتصادي للرجال.',
      categoryId: catMap['ihram'],
      hasGiftWrap: false,
      avgRating: 4.2,
      reviewCount: 312,
      soldCount: 2100,
      badges: { create: [{ badge: 'sale' }] },
      tags: { create: [{ tag: 'ihram' }, { tag: 'men' }, { tag: 'economy' }] },
      variants: {
        create: [
          { sku: 'YH-IHR-MEN-001-SM', tier: Tier.Economy, size: 'S/M', price: 79900, compareAtPrice: 99900, stock: 100, lowStockThreshold: 20 },
          { sku: 'YH-IHR-MEN-001-LG', tier: Tier.Economy, size: 'L/XL', price: 84900, compareAtPrice: 104900, stock: 80, lowStockThreshold: 20 },
          { sku: 'YH-IHR-MEN-001-XXL', tier: Tier.Economy, size: 'XXL/3XL', price: 89900, stock: 40, lowStockThreshold: 10 },
        ],
      },
      images: {
        create: [{ url: '/images/products/ihram-1.jpg', alt: 'Ihram Economy', isPrimary: true, order: 0 }],
      },
      sizeGuide: {
        create: [
          { label: 'S/M', chest: '90–100cm', length: '185cm', fit: 'Slim to regular', order: 0 },
          { label: 'L/XL', chest: '100–115cm', length: '200cm', fit: 'Regular to loose', order: 1 },
          { label: 'XXL/3XL', chest: '115–130cm', length: '210cm', fit: 'Loose', order: 2 },
        ],
      },
    },
  })

  const oudAttar = await prisma.product.upsert({
    where: { slug: 'oud-attar-collection' },
    update: {},
    create: {
      slug: 'oud-attar-collection',
      sku: 'YH-FRG-OUD-001',
      nameEn: 'Oud Attar — Premium Collection',
      nameUr: 'عود عطر — پریمیم کلیکشن',
      nameAr: 'عطر العود — مجموعة فاخرة',
      descEn: 'Rich, woody oud attar from Assam and Hindi oud. 6ml. Alcohol-free, halal-certified.',
      descUr: 'آسام اور ہندی عود سے بھرپور عطر۔ 6 ملی۔ الکوحل فری، حلال۔',
      descAr: 'عطر عود غني من الهند. 6 مل. خالٍ من الكحول، حلال.',
      shortDescEn: 'Rich oud attar — 6ml, alcohol-free, premium.',
      shortDescUr: 'امیر عود عطر — 6 ملی۔',
      shortDescAr: 'عطر عود فاخر.',
      categoryId: catMap['fragrances'],
      hasGiftWrap: true,
      avgRating: 4.8,
      reviewCount: 156,
      soldCount: 890,
      isFeatured: true,
      badges: { create: [{ badge: 'hot' }] },
      tags: { create: [{ tag: 'oud' }, { tag: 'attar' }, { tag: 'premium' }, { tag: 'alcohol-free' }] },
      variants: {
        create: [
          { sku: 'YH-FRG-OUD-001-ECO', tier: Tier.Economy, scent: 'Hindi Oud', price: 119900, stock: 80, lowStockThreshold: 15 },
          { sku: 'YH-FRG-OUD-001-STD', tier: Tier.Standard, scent: 'Assam Oud', price: 249900, stock: 50, lowStockThreshold: 10 },
          { sku: 'YH-FRG-OUD-001-PRM', tier: Tier.Premium, scent: 'Royal Oud Blend', price: 499900, compareAtPrice: 650000, stock: 20, lowStockThreshold: 5 },
        ],
      },
      images: {
        create: [
          { url: '/images/products/attar-3.jpg', alt: 'Oud Attar Premium', isPrimary: true, order: 0 },
          { url: '/images/products/attar-3b.jpg', alt: 'Oud attar bottle detail', isPrimary: false, order: 1 },
        ],
      },
    },
  })

  console.log('✅ Products seeded:', umrahKitStd.sku, ihramEco.sku, oudAttar.sku)

  // ── Coupons ───────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.coupon.upsert({
      where: { code: 'WELCOME10' },
      update: {},
      create: { code: 'WELCOME10', type: 'percentage', value: 10, isActive: true },
    }),
    prisma.coupon.upsert({
      where: { code: 'HAJJ2025' },
      update: {},
      create: { code: 'HAJJ2025', type: 'percentage', value: 15, isActive: true },
    }),
    prisma.coupon.upsert({
      where: { code: 'UMRAH5' },
      update: {},
      create: { code: 'UMRAH5', type: 'percentage', value: 5, isActive: true },
    }),
    prisma.coupon.upsert({
      where: { code: 'RAMADAN20' },
      update: {},
      create: {
        code: 'RAMADAN20', type: 'percentage', value: 20,
        isActive: true, usageLimit: 500,
      },
    }),
  ])
  console.log('✅ Coupons seeded')

  // ── Settings ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.setting.upsert({
      where: { key: 'free_shipping_threshold' },
      update: {},
      create: { key: 'free_shipping_threshold', value: '299900' }, // ₨2,999 in paisas
    }),
    prisma.setting.upsert({
      where: { key: 'standard_shipping_cost' },
      update: {},
      create: { key: 'standard_shipping_cost', value: '29900' },
    }),
    prisma.setting.upsert({
      where: { key: 'express_shipping_cost' },
      update: {},
      create: { key: 'express_shipping_cost', value: '49900' },
    }),
    prisma.setting.upsert({
      where: { key: 'whatsapp_number' },
      update: {},
      create: { key: 'whatsapp_number', value: '+923001234567' },
    }),
    prisma.setting.upsert({
      where: { key: 'gift_wrap_price' },
      update: {},
      create: { key: 'gift_wrap_price', value: '9900' },
    }),
  ])
  console.log('✅ Settings seeded')

  // ── Kit builder steps ─────────────────────────────────────────────────────
  //
  // Replaces the storefront's hardcoded `src/data/kit-categories.ts`. The
  // groupings and ordering are carried across unchanged so the builder looks
  // the same, but they are now editable rather than compiled in.
  const kitSteps: Array<{
    slug: string
    nameEn: string
    nameUr: string
    nameAr: string
    icon: string
    required: boolean
    order: number
    categorySlugs: string[]
  }> = [
    {
      slug: 'ihram',
      nameEn: 'Ihram', nameUr: 'احرام', nameAr: 'الإحرام',
      icon: '🤍', required: true, order: 1,
      categorySlugs: ['ihram'],
    },
    {
      slug: 'prayer-items',
      nameEn: 'Prayer Items', nameUr: 'نماز کی اشیاء', nameAr: 'مستلزمات الصلاة',
      icon: '📿', required: true, order: 2,
      categorySlugs: ['prayer-accessories'],
    },
    {
      slug: 'attar-fragrance',
      nameEn: 'Attar & Fragrance', nameUr: 'عطر و خوشبو', nameAr: 'العطر والعطور',
      icon: '🌹', required: false, order: 3,
      categorySlugs: ['fragrances'],
    },
    {
      slug: 'abaya-thobe',
      nameEn: 'Abaya / Thobe', nameUr: 'عبایہ / ثوب', nameAr: 'العباءة / الثوب',
      icon: '👗', required: false, order: 4,
      // The step that motivated a join table rather than a single category id.
      categorySlugs: ['abaya-hijab'],
    },
    {
      slug: 'dates-zamzam',
      nameEn: 'Dates & Zam Zam', nameUr: 'کھجور و زم زم', nameAr: 'التمور وزمزم',
      icon: '🌴', required: false, order: 5,
      categorySlugs: ['dates-zamzam'],
    },
  ]

  for (const step of kitSteps) {
    const { categorySlugs, ...fields } = step
    const categoryIds = categorySlugs.map((s) => catMap[s]).filter(Boolean)
    if (categoryIds.length === 0) continue

    const saved = await prisma.kitCategory.upsert({
      where: { slug: step.slug },
      update: fields,
      create: fields,
    })

    // Re-created rather than merged, so re-running the seed after editing the
    // list above converges instead of accumulating stale links.
    await prisma.kitCategorySource.deleteMany({ where: { kitCategoryId: saved.id } })
    await prisma.kitCategorySource.createMany({
      data: categoryIds.map((categoryId, index) => ({
        kitCategoryId: saved.id,
        categoryId,
        order: index,
      })),
    })
  }
  console.log('✅ Kit builder steps:', kitSteps.length)

  console.log('🎉 Seed complete!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
