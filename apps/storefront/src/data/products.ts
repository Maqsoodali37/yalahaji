import type { Product } from '@/types'

export const products: Product[] = [
  // ── KITS ────────────────────────────────────────────────────────────────────
  {
    id: 'prod-kit-001',
    slug: 'complete-umrah-kit-economy',
    sku: 'YH-KIT-UMR-001',
    name: {
      en: 'Complete Umrah Kit — Economy',
      ur: 'مکمل عمرہ کٹ — اکانومی',
      ar: 'طقم العمرة الكامل — اقتصادي',
    },
    description: {
      en: 'Everything you need for Umrah at an affordable price. Includes ihram, prayer mat, tasbeeh, attar, and a travel pouch.',
      ur: 'سستی قیمت میں عمرہ کے لیے ہر چیز۔ احرام، جانماز، تسبیح، عطر اور ٹریول پاؤچ شامل ہیں۔',
      ar: 'كل ما تحتاجه للعمرة بسعر معقول. يشمل الإحرام وسجادة الصلاة والمسبحة والعطر وحقيبة سفر.',
    },
    shortDescription: {
      en: 'Budget-friendly Umrah kit with all essentials.',
      ur: 'بجٹ فرینڈلی عمرہ کٹ۔',
      ar: 'طقم عمرة اقتصادي بجميع الضروريات.',
    },
    categoryId: 'cat-kits',
    categorySlug: 'kits',
    images: [
      { id: 'img-1', url: '/assets/umrah-kit.png', alt: 'Complete Umrah Kit Economy', isPrimary: true },
      { id: 'img-2', url: '/assets/umrah-kit.png', alt: 'Kit contents spread out', isPrimary: false },
      { id: 'img-3', url: '/assets/umrah-kit.png', alt: 'Kit in travel bag', isPrimary: false },
    ],
    variants: [
      { id: 'var-kit-001-eco', sku: 'YH-KIT-UMR-001-ECO', tier: 'Economy', price: 2499, compareAtPrice: 3200, stock: 45, lowStockThreshold: 10 },
    ],
    tags: ['umrah', 'kit', 'economy', 'bundle'],
    badges: ['bestseller'],
    isKit: true,
    kitContents: [
      { productId: 'prod-ihram-001', productName: { en: 'Ihram Cloth (2-piece)', ur: 'احرام کپڑا', ar: 'قماش إحرام' }, quantity: 1, image: '/assets/umrah-kit.png', tier: 'Economy' },
      { productId: 'prod-prayer-002', productName: { en: 'Prayer Mat', ur: 'جانماز', ar: 'سجادة الصلاة' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Economy' },
      { productId: 'prod-tasbeeh-001', productName: { en: 'Tasbeeh (99 beads)', ur: 'تسبیح', ar: 'مسبحة' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Economy' },
      { productId: 'prod-attar-001', productName: { en: 'Attar (3ml)', ur: 'عطر', ar: 'عطر' }, quantity: 1, image: '/assets/fragrances.png', tier: 'Economy' },
      { productId: 'prod-bag-001', productName: { en: 'Travel Pouch', ur: 'ٹریول پاؤچ', ar: 'حقيبة سفر' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Economy' },
    ],
    hasGiftWrap: false,
    hasPreOrder: false,
    avgRating: 4.3,
    reviewCount: 127,
    soldCount: 892,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'prod-kit-002',
    slug: 'complete-umrah-kit-standard',
    sku: 'YH-KIT-UMR-002',
    name: {
      en: 'Complete Umrah Kit — Standard',
      ur: 'مکمل عمرہ کٹ — اسٹینڈرڈ',
      ar: 'طقم العمرة الكامل — قياسي',
    },
    description: {
      en: 'Our most popular Umrah kit. Premium-quality ihram, velvet prayer mat, crystal tasbeeh, luxury attar roll-on, miswak, and a branded travel bag.',
      ur: 'ہمارا سب سے مقبول عمرہ کٹ۔ اعلیٰ کوالٹی احرام، مخملی جانماز، کرسٹل تسبیح، لگژری عطر، مسواک اور برانڈڈ بیگ۔',
      ar: 'طقم العمرة الأكثر مبيعاً. إحرام عالي الجودة، سجادة مخملية، مسبحة كريستال، عطر فاخر، سواك وحقيبة سفر.',
    },
    shortDescription: {
      en: 'Best-seller — complete Umrah kit with premium contents.',
      ur: 'بیسٹ سیلر — مکمل عمرہ کٹ۔',
      ar: 'الأكثر مبيعاً — طقم عمرة كامل.',
    },
    categoryId: 'cat-kits',
    categorySlug: 'kits',
    images: [
      { id: 'img-4', url: '/assets/umrah-kit.png', alt: 'Complete Umrah Kit Standard', isPrimary: true },
      { id: 'img-5', url: '/assets/umrah-kit.png', alt: 'Standard kit contents', isPrimary: false },
      { id: 'img-6', url: '/assets/umrah-kit.png', alt: 'Standard kit in gift box', isPrimary: false },
    ],
    variants: [
      { id: 'var-kit-002-std', sku: 'YH-KIT-UMR-002-STD', tier: 'Standard', price: 4999, compareAtPrice: 6500, stock: 30, lowStockThreshold: 8 },
    ],
    tags: ['umrah', 'kit', 'standard', 'bundle', 'popular'],
    badges: ['hot', 'bestseller'],
    isKit: true,
    kitContents: [
      { productId: 'prod-ihram-002', productName: { en: 'Premium Ihram Cloth', ur: 'پریمیم احرام', ar: 'إحرام فاخر' }, quantity: 1, image: '/assets/umrah-kit.png', tier: 'Standard' },
      { productId: 'prod-prayer-003', productName: { en: 'Velvet Prayer Mat', ur: 'مخملی جانماز', ar: 'سجادة مخملية' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Standard' },
      { productId: 'prod-tasbeeh-002', productName: { en: 'Crystal Tasbeeh', ur: 'کرسٹل تسبیح', ar: 'مسبحة كريستال' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Standard' },
      { productId: 'prod-attar-002', productName: { en: 'Attar Roll-On (6ml)', ur: 'رول آن عطر', ar: 'عطر رول-أون' }, quantity: 1, image: '/assets/fragrances.png', tier: 'Standard' },
      { productId: 'prod-miswak-001', productName: { en: 'Miswak (3-pack)', ur: 'مسواک', ar: 'سواك' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Standard' },
      { productId: 'prod-bag-002', productName: { en: 'Branded Travel Bag', ur: 'برانڈڈ ٹریول بیگ', ar: 'حقيبة سفر ماركة' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Standard' },
    ],
    hasGiftWrap: true,
    hasPreOrder: false,
    avgRating: 4.7,
    reviewCount: 243,
    soldCount: 1456,
    createdAt: '2024-01-15T00:00:00Z',
    updatedAt: '2025-07-01T00:00:00Z',
  },
  {
    id: 'prod-kit-003',
    slug: 'complete-umrah-kit-premium',
    sku: 'YH-KIT-UMR-003',
    name: {
      en: 'Complete Umrah Kit — Premium',
      ur: 'مکمل عمرہ کٹ — پریمیم',
      ar: 'طقم العمرة الكامل — فاخر',
    },
    description: {
      en: 'The ultimate Umrah experience kit. Egyptian cotton ihram, hand-embroidered prayer mat, rose-wood tasbeeh, oud attar, Ajwa dates, Zam Zam water bottle, and an elegant leather travel bag.',
      ur: 'عمرہ کا بہترین تجربہ کٹ۔ مصری کپاس احرام، ہاتھ سے کڑھائی جانماز، گلاب لکڑی تسبیح، عود عطر، عجوہ کھجور، زم زم بوتل اور چمڑے کا بیگ۔',
      ar: 'طقم العمرة المثالي. إحرام قطن مصري، سجادة مطرزة يدوياً، مسبحة خشب الورد، عطر العود، تمور عجوة، زجاجة زمزم وحقيبة جلدية.',
    },
    shortDescription: {
      en: 'The ultimate Umrah gift — luxury kit with everything.',
      ur: 'بہترین عمرہ تحفہ — لگژری کٹ۔',
      ar: 'هدية العمرة المثالية — طقم فاخر بكل شيء.',
    },
    categoryId: 'cat-kits',
    categorySlug: 'kits',
    images: [
      { id: 'img-7', url: '/assets/umrah-kit.png', alt: 'Complete Umrah Kit Premium', isPrimary: true },
      { id: 'img-8', url: '/assets/umrah-kit.png', alt: 'Premium kit leather bag', isPrimary: false },
      { id: 'img-9', url: '/assets/umrah-kit.png', alt: 'Premium kit unboxing', isPrimary: false },
      { id: 'img-10', url: '/assets/umrah-kit.png', alt: 'Premium kit contents laid out', isPrimary: false },
    ],
    variants: [
      { id: 'var-kit-003-prm', sku: 'YH-KIT-UMR-003-PRM', tier: 'Premium', price: 9999, compareAtPrice: 14000, stock: 15, lowStockThreshold: 5 },
    ],
    tags: ['umrah', 'kit', 'premium', 'luxury', 'gift'],
    badges: ['hot', 'new'],
    isKit: true,
    kitContents: [
      { productId: 'prod-ihram-003', productName: { en: 'Egyptian Cotton Ihram', ur: 'مصری کپاس احرام', ar: 'إحرام قطن مصري' }, quantity: 1, image: '/assets/umrah-kit.png', tier: 'Premium' },
      { productId: 'prod-prayer-004', productName: { en: 'Hand-Embroidered Prayer Mat', ur: 'کڑھائی جانماز', ar: 'سجادة مطرزة' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
      { productId: 'prod-tasbeeh-003', productName: { en: 'Rosewood Tasbeeh', ur: 'روزووڈ تسبیح', ar: 'مسبحة خشب الورد' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
      { productId: 'prod-attar-003', productName: { en: 'Oud Attar (12ml)', ur: 'عود عطر', ar: 'عطر العود' }, quantity: 1, image: '/assets/fragrances.png', tier: 'Premium' },
      { productId: 'prod-dates-001', productName: { en: 'Ajwa Dates (250g)', ur: 'عجوہ کھجور', ar: 'تمور عجوة' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
      { productId: 'prod-zamzam-001', productName: { en: 'Zam Zam Water (500ml)', ur: 'زم زم پانی', ar: 'ماء زمزم' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
      { productId: 'prod-bag-003', productName: { en: 'Leather Travel Bag', ur: 'چمڑے کا بیگ', ar: 'حقيبة جلدية' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
      { productId: 'prod-miswak-001', productName: { en: 'Miswak (5-pack)', ur: 'مسواک', ar: 'سواك' }, quantity: 1, image: '/assets/tabaruk.png', tier: 'Premium' },
    ],
    hasGiftWrap: true,
    hasPreOrder: false,
    avgRating: 4.9,
    reviewCount: 89,
    soldCount: 312,
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2025-07-15T00:00:00Z',
  },

  // ── IHRAM ────────────────────────────────────────────────────────────────────
  {
    id: 'prod-ihram-001',
    slug: 'ihram-cloth-economy',
    sku: 'YH-IHR-MEN-001',
    name: { en: 'Ihram Cloth — Economy', ur: 'احرام کپڑا — اکانومی', ar: 'قماش الإحرام — اقتصادي' },
    description: {
      en: 'Affordable 2-piece unstitched ihram for men. 60% cotton, 40% polyester blend. Machine washable. Suitable for warmer climates.',
      ur: 'سستا 2 ٹکڑا بغیر سلائی احرام۔ 60% کپاس، 40% پولیسٹر۔ واشنگ مشین سے دھویا جا سکتا ہے۔',
      ar: 'إحرام غير مخيط من قطعتين بسعر معقول. خليط 60٪ قطن، 40٪ بوليستر.',
    },
    shortDescription: { en: 'Affordable cotton-blend ihram for men.', ur: 'سستا کپاس احرام۔', ar: 'إحرام اقتصادي للرجال.' },
    categoryId: 'cat-ihram',
    categorySlug: 'ihram',
    images: [
      { id: 'img-ihram-1', url: '/assets/umrah-kit.png', alt: 'Ihram Economy', isPrimary: true },
    ],
    variants: [
      { id: 'var-ihr-001-sm', sku: 'YH-IHR-MEN-001-SM', tier: 'Economy', size: 'S/M', price: 799, compareAtPrice: 999, stock: 100, lowStockThreshold: 20 },
      { id: 'var-ihr-001-lg', sku: 'YH-IHR-MEN-001-LG', tier: 'Economy', size: 'L/XL', price: 849, compareAtPrice: 1049, stock: 80, lowStockThreshold: 20 },
      { id: 'var-ihr-001-xxl', sku: 'YH-IHR-MEN-001-XXL', tier: 'Economy', size: 'XXL/3XL', price: 899, stock: 40, lowStockThreshold: 10 },
    ],
    tags: ['ihram', 'men', 'economy'],
    badges: ['sale'],
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    sizeGuide: [
      { label: 'S/M', chest: '90–100cm', length: '185cm', fit: 'Slim to regular' },
      { label: 'L/XL', chest: '100–115cm', length: '200cm', fit: 'Regular to loose' },
      { label: 'XXL/3XL', chest: '115–130cm', length: '210cm', fit: 'Loose' },
    ],
    avgRating: 4.2,
    reviewCount: 312,
    soldCount: 2100,
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2025-05-01T00:00:00Z',
  },
  {
    id: 'prod-ihram-002',
    slug: 'ihram-cloth-standard',
    sku: 'YH-IHR-MEN-002',
    name: { en: 'Ihram Cloth — Standard', ur: 'احرام کپڑا — اسٹینڈرڈ', ar: 'قماش الإحرام — قياسي' },
    description: {
      en: '100% pure cotton 2-piece ihram. Breathable terry-loop weave, soft on skin. Ideal for all climates. Includes a belt.',
      ur: '100% خالص کپاس 2 ٹکڑا احرام۔ سانس لینے والا ٹیری لوپ کپڑا۔ بیلٹ بھی شامل ہے۔',
      ar: '100٪ قطن خالص، قطعتان. نسيج تيري لووب قابل للتنفس. يشمل حزاماً.',
    },
    shortDescription: { en: '100% cotton ihram — breathable and soft.', ur: '100% کپاس احرام۔', ar: 'إحرام قطن خالص.' },
    categoryId: 'cat-ihram',
    categorySlug: 'ihram',
    images: [
      { id: 'img-ihram-2', url: '/assets/umrah-kit.png', alt: 'Ihram Standard', isPrimary: true },
      { id: 'img-ihram-2b', url: '/assets/umrah-kit.png', alt: 'Ihram texture close-up', isPrimary: false },
    ],
    variants: [
      { id: 'var-ihr-002-sm', sku: 'YH-IHR-MEN-002-SM', tier: 'Standard', size: 'S/M', price: 1299, stock: 60, lowStockThreshold: 15 },
      { id: 'var-ihr-002-lg', sku: 'YH-IHR-MEN-002-LG', tier: 'Standard', size: 'L/XL', price: 1349, stock: 55, lowStockThreshold: 15 },
      { id: 'var-ihr-002-xxl', sku: 'YH-IHR-MEN-002-XXL', tier: 'Standard', size: 'XXL/3XL', price: 1399, stock: 30, lowStockThreshold: 8 },
    ],
    tags: ['ihram', 'men', 'standard', 'cotton'],
    badges: ['bestseller'],
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    sizeGuide: [
      { label: 'S/M', chest: '88–100cm', length: '180cm', fit: 'Standard', fabric: '100% Terry Cotton' },
      { label: 'L/XL', chest: '100–116cm', length: '195cm', fit: 'Standard' },
      { label: 'XXL/3XL', chest: '116–132cm', length: '210cm', fit: 'Relaxed' },
    ],
    avgRating: 4.6,
    reviewCount: 198,
    soldCount: 1230,
    createdAt: '2023-08-01T00:00:00Z',
    updatedAt: '2025-06-15T00:00:00Z',
  },

  // ── FRAGRANCES ───────────────────────────────────────────────────────────────
  {
    id: 'prod-attar-001',
    slug: 'rose-attar-3ml',
    sku: 'YH-FRG-ATT-001',
    name: { en: 'Rose Attar — 3ml', ur: 'گلاب عطر — 3 ملی', ar: 'عطر الورد — 3 مل' },
    description: {
      en: 'Pure alcohol-free rose attar from Bulgarian rose. Safe for ihram. Long-lasting, light floral scent.',
      ur: 'بلغاریہ کے گلاب سے خالص الکوحل فری عطر۔ احرام میں قابل استعمال۔ ہلکی پھولوں کی خوشبو۔',
      ar: 'عطر ورد خالص خالٍ من الكحول. آمن للإحرام. عطر زهري خفيف وطويل الأمد.',
    },
    shortDescription: { en: 'Alcohol-free rose attar — ihram safe.', ur: 'الکوحل فری گلاب عطر۔', ar: 'عطر ورد خالٍ من الكحول.' },
    categoryId: 'cat-fragrance',
    categorySlug: 'fragrances',
    images: [
      { id: 'img-attar-1', url: '/assets/fragrances.png', alt: 'Rose Attar', isPrimary: true },
    ],
    variants: [
      { id: 'var-att-001-std', sku: 'YH-FRG-ATT-001-STD', tier: 'Standard', scent: 'Rose', price: 499, stock: 200, lowStockThreshold: 30 },
    ],
    tags: ['attar', 'rose', 'fragrance', 'ihram-safe', 'alcohol-free'],
    badges: ['new'],
    isKit: false,
    hasGiftWrap: true,
    hasPreOrder: false,
    avgRating: 4.5,
    reviewCount: 87,
    soldCount: 645,
    createdAt: '2024-02-01T00:00:00Z',
    updatedAt: '2025-06-01T00:00:00Z',
  },
  {
    id: 'prod-attar-002',
    slug: 'oud-attar-collection',
    sku: 'YH-FRG-OUD-001',
    name: { en: 'Oud Attar — Premium Collection', ur: 'عود عطر — پریمیم کلیکشن', ar: 'عطر العود — مجموعة فاخرة' },
    description: {
      en: 'Rich, woody oud attar from Assam and Hindi oud. Each bottle is 6ml. Alcohol-free, halal-certified. Deep, long-lasting fragrance — a true Hajj memento.',
      ur: 'آسام اور ہندی عود سے بھرپور عطر۔ 6 ملی بوتل۔ الکوحل فری، حلال۔',
      ar: 'عطر عود غني من الهند. 6 مل. خالٍ من الكحول، حلال.',
    },
    shortDescription: { en: 'Rich oud attar — 6ml, alcohol-free, premium.', ur: 'امیر عود عطر — 6 ملی۔', ar: 'عطر عود فاخر.' },
    categoryId: 'cat-fragrance',
    categorySlug: 'fragrances',
    images: [
      { id: 'img-oud-1', url: '/assets/fragrances.png', alt: 'Oud Attar Premium', isPrimary: true },
      { id: 'img-oud-2', url: '/assets/fragrances.png', alt: 'Oud attar bottle detail', isPrimary: false },
    ],
    variants: [
      { id: 'var-oud-001-eco', sku: 'YH-FRG-OUD-001-ECO', tier: 'Economy', scent: 'Hindi Oud', price: 1199, stock: 80, lowStockThreshold: 15 },
      { id: 'var-oud-001-std', sku: 'YH-FRG-OUD-001-STD', tier: 'Standard', scent: 'Assam Oud', price: 2499, stock: 50, lowStockThreshold: 10 },
      { id: 'var-oud-001-prm', sku: 'YH-FRG-OUD-001-PRM', tier: 'Premium', scent: 'Royal Oud Blend', price: 4999, compareAtPrice: 6500, stock: 20, lowStockThreshold: 5 },
    ],
    tags: ['oud', 'attar', 'premium', 'fragrance', 'alcohol-free'],
    badges: ['hot'],
    isKit: false,
    hasGiftWrap: true,
    hasPreOrder: false,
    avgRating: 4.8,
    reviewCount: 156,
    soldCount: 890,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2025-07-01T00:00:00Z',
  },

  // ── PRAYER ACCESSORIES ────────────────────────────────────────────────────────
  {
    id: 'prod-tasbeeh-001',
    slug: 'tasbeeh-99-beads-economy',
    sku: 'YH-PRA-TSB-001',
    name: { en: 'Tasbeeh — 99 Beads Economy', ur: 'تسبیح — 99 دانے اکانومی', ar: 'مسبحة — 99 حبة اقتصادية' },
    description: {
      en: 'Classic 99-bead tasbeeh made from smooth plastic. Lightweight and travel-friendly. Available in multiple colors.',
      ur: 'کلاسک 99 دانے تسبیح۔ ہموار پلاسٹک سے بنی۔ ہلکی اور سفر دوست۔',
      ar: 'مسبحة كلاسيكية من 99 حبة بلاستيكية. خفيفة وصديقة للسفر.',
    },
    shortDescription: { en: 'Classic 99-bead plastic tasbeeh — travel-friendly.', ur: 'کلاسک تسبیح۔', ar: 'مسبحة بلاستيكية.' },
    categoryId: 'cat-prayer',
    categorySlug: 'prayer-accessories',
    images: [
      { id: 'img-tsb-1', url: '/assets/tabaruk.png', alt: 'Tasbeeh Economy', isPrimary: true },
    ],
    variants: [
      { id: 'var-tsb-001-grn', sku: 'YH-PRA-TSB-001-GRN', tier: 'Economy', color: 'Green', colorHex: '#133C2A', price: 149, stock: 500, lowStockThreshold: 50 },
      { id: 'var-tsb-001-blk', sku: 'YH-PRA-TSB-001-BLK', tier: 'Economy', color: 'Black', colorHex: '#111111', price: 149, stock: 400, lowStockThreshold: 50 },
      { id: 'var-tsb-001-wht', sku: 'YH-PRA-TSB-001-WHT', tier: 'Economy', color: 'White', colorHex: '#FFFFFF', price: 149, stock: 350, lowStockThreshold: 50 },
    ],
    tags: ['tasbeeh', 'prayer', 'economy'],
    badges: [],
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    avgRating: 4.1,
    reviewCount: 445,
    soldCount: 3200,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2025-04-01T00:00:00Z',
  },
  {
    id: 'prod-prayer-002',
    slug: 'prayer-mat-economy',
    sku: 'YH-PRA-MAT-001',
    name: { en: 'Prayer Mat — Economy', ur: 'جانماز — اکانومی', ar: 'سجادة الصلاة — اقتصادية' },
    description: {
      en: 'Compact travel prayer mat. Non-slip base, lightweight, rolls up easily. 60cm × 110cm. Available in multiple colors.',
      ur: 'کمپیکٹ ٹریول جانماز۔ نان سلپ بیس، ہلکی، آسانی سے رول ہوتی ہے۔',
      ar: 'سجادة صلاة سفر مدمجة. قاعدة مانعة للانزلاق، خفيفة.',
    },
    shortDescription: { en: 'Compact travel prayer mat — lightweight & non-slip.', ur: 'ٹریول جانماز۔', ar: 'سجادة صلاة سفر.' },
    categoryId: 'cat-prayer',
    categorySlug: 'prayer-accessories',
    images: [
      { id: 'img-mat-1', url: '/assets/tabaruk.png', alt: 'Prayer Mat Economy', isPrimary: true },
    ],
    variants: [
      { id: 'var-mat-001-grn', sku: 'YH-PRA-MAT-001-GRN', tier: 'Economy', color: 'Green', colorHex: '#133C2A', price: 599, stock: 120, lowStockThreshold: 20 },
      { id: 'var-mat-001-blu', sku: 'YH-PRA-MAT-001-BLU', tier: 'Economy', color: 'Blue', colorHex: '#1D3A6E', price: 599, stock: 100, lowStockThreshold: 20 },
    ],
    tags: ['prayer-mat', 'janamaz', 'economy', 'travel'],
    badges: [],
    isKit: false,
    hasGiftWrap: false,
    hasPreOrder: false,
    avgRating: 4.3,
    reviewCount: 210,
    soldCount: 1800,
    createdAt: '2023-06-01T00:00:00Z',
    updatedAt: '2025-04-01T00:00:00Z',
  },

  // ── ABAYA ─────────────────────────────────────────────────────────────────────
  {
    id: 'prod-abaya-001',
    slug: 'umrah-abaya-black-standard',
    sku: 'YH-ABY-BLK-001',
    name: { en: 'Umrah Abaya — Black Standard', ur: 'عمرہ عبایہ — بلیک اسٹینڈرڈ', ar: 'عباءة العمرة — سوداء قياسية' },
    description: {
      en: 'Lightweight, breathable black abaya designed for Hajj & Umrah. Loose-fit for ease of movement during tawaf and sa\'i. Elastic cuffs and a drawstring hood. Machine washable.',
      ur: 'حج و عمرہ کے لیے ہلکی اور سانس لینے والی بلیک عبایہ۔ طواف اور سعی کے دوران آرام دہ۔',
      ar: 'عباءة سوداء خفيفة ومريحة لحج وعمرة. فضفاضة للحركة أثناء الطواف والسعي.',
    },
    shortDescription: { en: 'Breathable Umrah abaya — loose-fit black.', ur: 'عمرہ عبایہ — آرام دہ فٹ۔', ar: 'عباءة عمرة مريحة.' },
    categoryId: 'cat-abaya',
    categorySlug: 'abaya-hijab',
    images: [
      { id: 'img-aby-1', url: '/assets/abaya.png', alt: 'Umrah Abaya Black Standard', isPrimary: true },
      { id: 'img-aby-2', url: '/assets/abaya.png', alt: 'Abaya fabric detail', isPrimary: false },
    ],
    variants: [
      { id: 'var-aby-001-sm', sku: 'YH-ABY-BLK-001-SM', tier: 'Standard', size: 'S (54")', price: 1999, stock: 30, lowStockThreshold: 8 },
      { id: 'var-aby-001-md', sku: 'YH-ABY-BLK-001-MD', tier: 'Standard', size: 'M (56")', price: 1999, stock: 25, lowStockThreshold: 8 },
      { id: 'var-aby-001-lg', sku: 'YH-ABY-BLK-001-LG', tier: 'Standard', size: 'L (58")', price: 2099, stock: 20, lowStockThreshold: 6 },
      { id: 'var-aby-001-xl', sku: 'YH-ABY-BLK-001-XL', tier: 'Standard', size: 'XL (60")', price: 2199, stock: 8, lowStockThreshold: 5 },
    ],
    tags: ['abaya', 'women', 'black', 'umrah', 'standard'],
    badges: ['bestseller'],
    isKit: false,
    hasGiftWrap: true,
    hasPreOrder: false,
    sizeGuide: [
      { label: 'S (54")', chest: 'Up to 94cm', length: '137cm' },
      { label: 'M (56")', chest: '94–104cm', length: '142cm' },
      { label: 'L (58")', chest: '104–116cm', length: '147cm' },
      { label: 'XL (60")', chest: '116–128cm', length: '152cm' },
    ],
    avgRating: 4.6,
    reviewCount: 142,
    soldCount: 780,
    createdAt: '2024-01-10T00:00:00Z',
    updatedAt: '2025-06-20T00:00:00Z',
  },

  // ── DATES ─────────────────────────────────────────────────────────────────────
  {
    id: 'prod-dates-001',
    slug: 'ajwa-dates-250g',
    sku: 'YH-DAT-AJW-001',
    name: { en: 'Ajwa Dates — 250g Premium Box', ur: 'عجوہ کھجور — 250 گرام پریمیم باکس', ar: 'تمور عجوة — علبة فاخرة 250 جم' },
    description: {
      en: 'Premium Ajwa dates from Al-Madinah Al-Munawwarah. Soft, sweet and rich in iron. Packed in a beautiful gift box. Hadith-mentioned superfood.',
      ur: 'مدینہ منورہ کی عجوہ کھجوریں۔ نرم، میٹھی اور آئرن سے بھرپور۔ خوبصورت گفٹ باکس میں پیک۔',
      ar: 'تمور عجوة فاخرة من المدينة المنورة. ناعمة وحلوة وغنية بالحديد. في علبة هدايا جميلة.',
    },
    shortDescription: { en: 'Premium Ajwa dates from Madinah — gift boxed.', ur: 'عجوہ کھجور مدینہ سے۔', ar: 'تمور عجوة من المدينة.' },
    categoryId: 'cat-dates',
    categorySlug: 'dates-zamzam',
    images: [
      { id: 'img-dat-1', url: '/assets/tabaruk.png', alt: 'Ajwa Dates Premium Box', isPrimary: true },
    ],
    variants: [
      { id: 'var-dat-001-prm', sku: 'YH-DAT-AJW-001-PRM', tier: 'Premium', price: 1499, compareAtPrice: 1800, stock: 50, lowStockThreshold: 10 },
    ],
    tags: ['dates', 'ajwa', 'madinah', 'premium', 'gift'],
    badges: ['hot'],
    isKit: false,
    hasGiftWrap: true,
    hasPreOrder: false,
    avgRating: 4.9,
    reviewCount: 76,
    soldCount: 430,
    createdAt: '2024-04-01T00:00:00Z',
    updatedAt: '2025-07-01T00:00:00Z',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
export const getProductBySlug = (slug: string) =>
  products.find((p) => p.slug === slug) ?? null

export const getProductById = (id: string) =>
  products.find((p) => p.id === id) ?? null

export const getProductsByCategory = (categorySlug: string) =>
  products.filter((p) => p.categorySlug === categorySlug)

export const getFeaturedProducts = () =>
  products.filter((p) => p.badges.includes('hot') || p.badges.includes('bestseller')).slice(0, 8)

export const getNewArrivals = () =>
  [...products].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 8)

export const getRelatedProducts = (product: { categorySlug: string; id: string }, limit = 4) =>
  products.filter((p) => p.categorySlug === product.categorySlug && p.id !== product.id).slice(0, limit)

export const searchProducts = (query: string) => {
  const q = query.toLowerCase()
  return products.filter(
    (p) =>
      p.name.en.toLowerCase().includes(q) ||
      p.tags.some((t) => t.includes(q))
  )
}
