-- ─────────────────────────────────────────────────────────────
-- YalaHaji catalogue import — 28 products from YalaHaji_WooCommerce_Import.csv
--
-- WHAT
-- Four new categories, then 28 products with a Standard variant, tags, badges
-- and per-locale SEO in English, Urdu and Arabic.
--
-- WHY A MIGRATION
-- The catalogue is launch data the storefront cannot function without, so it
-- has to travel with the schema rather than depend on a script someone
-- remembers to run against each environment.
--
-- IDEMPOTENCE
-- Every id is a UUID v5 derived from the SKU, and every INSERT carries
-- ON DUPLICATE KEY UPDATE. Re-applying this file converges instead of
-- duplicating. Categories are insert-only (`id` = `id`) so a category staff
-- have since renamed or re-parented is left alone.
--
-- TWO PRODUCTS ARE REPLACED, NOT ADDED
-- prisma/seed.ts creates demo products under SKUs YH-IHR-MEN-001 and
-- YH-FRG-OUD-001. `products.sku` is UNIQUE, so the CSV rows carrying those
-- SKUs cannot be inserted alongside them. The CSV is the catalogue's source of
-- truth, so those two rows are updated in place. Their stale variants are
-- deactivated (never deleted — `order_items` references them), and their
-- demo photos and size guide are removed at the end of this file because they
-- depict a different product.
--
-- WHAT THIS FILE DELIBERATELY DOES NOT WRITE
--   * `product_media` — the CSV's Images column is empty for all 28 rows.
--     Products ship photo-less rather than with a placeholder that reads as
--     real product imagery.
--   * `avgRating` / `reviewCount` / `soldCount` — not CSV fields, and on an
--     existing row they may reflect real reviews.
--   * `hasGiftWrap` / `hasPreOrder` — not CSV fields, so they are left at their column
--     defaults for staff to set in the admin panel.
--
-- MONEY
-- Prices are paisas (rupees × 100), per the project's money convention. Where
-- the CSV has a sale price it becomes `price` and the regular price becomes
-- `compareAtPrice`, which is what puts the strikethrough on the storefront.
-- ─────────────────────────────────────────────────────────────

START TRANSACTION;

-- ── Categories ───────────────────────────────────────────────
-- Insert-only. Seed-created categories are listed so this migration works on a
-- database that has never been seeded. `products.categoryId` is NOT NULL with
-- a RESTRICT foreign key, so a missing category fails the whole import.

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('277b616e-7dc8-503e-9e2d-5a0c3d1cfe70', 'kits', 'Hajj & Umrah Kits', 'حج و عمرہ کٹس', 'طقم الحج والعمرة',
   'Complete kits for Hajj and Umrah pilgrims.', 'حج اور عمرہ کے لیے مکمل کٹس۔', 'طقم كاملة لحجاج وعمار.',
   NULL, 1, 1, 1,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('d330db28-48fb-5083-ad42-c86bfb4db8ff', 'ihram', 'Ihram', 'احرام', 'إحرام',
   'Unstitched ihram cloth for men and women.', 'مردوں اور خواتین کے لیے بغیر سلائی احرام۔', 'قماش إحرام غير مخيط للرجال والنساء.',
   NULL, 2, 1, 1,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('bef27837-8992-5b63-954a-61a855f7449b', 'fragrances', 'Fragrances & Attar', 'خوشبو اور عطر', 'عطور',
   'Alcohol-free attars and fragrances, ihram safe.', 'الکوحل فری عطر، احرام کے لیے موزوں۔', 'عطور خالية من الكحول آمنة للإحرام.',
   NULL, 3, 1, 1,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('dd549aee-a810-50c5-b4e1-cb54bf8f4fc4', 'prayer-accessories', 'Prayer Accessories', 'نماز کی اشیاء', 'مستلزمات الصلاة',
   'Prayer mats, tasbeeh, miswak and more.', 'جانماز، تسبیح، مسواک اور مزید۔', 'سجادات الصلاة والمسابح والسواك.',
   NULL, 4, 1, 1,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('dde7efae-5ebe-5378-94d7-3fbf205614bb', 'abaya-hijab', 'Abaya & Hijab', 'عبایہ اور حجاب', 'عباءة وحجاب',
   'Modest wear for women on pilgrimage.', 'حج و عمرہ کے لیے خواتین کا لباس۔', 'ملابس محتشمة للمرأة في الحج والعمرة.',
   NULL, 5, 1, 1,
   NULL, NULL, NULL,
   NULL, NULL, NULL,
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

-- `abaya` and `hijab` are the CSV's two labels for what the database keeps as
-- the single `abaya-hijab` category. They land underneath it as children
-- rather than as siblings duplicating it, so the existing tree stays intact.
SET @cat_abaya_hijab = (SELECT `id` FROM `categories` WHERE `slug` = 'abaya-hijab');

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('8d44e27b-c728-5eba-aaa2-7486074b5504', 'abaya', 'Abaya', 'عبایہ', 'عباءة',
   'Butterfly, kimono and prayer abayas in premium Nida and lightweight fabrics, cut for full coverage and easy movement during Salah and Tawaf.', 'پریمیم نِدا اور ہلکے پھلکے کپڑوں میں بٹرفلائی، کیمونو اور نماز کے عبایے — مکمل پردہ اور نماز و طواف کے دوران آسان حرکت کے لیے تیار کیے گئے۔', 'عباءات فراشة وكيمونو وعباءات الصلاة من قماش النِدا الفاخر والأقمشة الخفيفة، مفصّلة لتغطية كاملة وحرية حركة أثناء الصلاة والطواف.',
   @cat_abaya_hijab, 1, 0, 1,
   'Abaya Online Pakistan | YalaHaji', 'عبایہ آن لائن پاکستان | یالا حاجی', 'عباءات أونلاين في باكستان | يالا حاجي',
   'Shop butterfly, kimono and prayer abayas in premium Nida fabric. Full coverage, elegant drape, sizes S–XXL. Delivered across Pakistan.', 'پریمیم نِدا کپڑے میں بٹرفلائی، کیمونو اور نماز کے عبایے خریدیں۔ مکمل پردہ، خوبصورت گرَاوٹ، سائز S تا XXL۔ پاکستان بھر میں ڈیلیوری۔', 'تسوّق عباءات الفراشة والكيمونو وعباءات الصلاة من قماش النِدا الفاخر. تغطية كاملة وانسدال أنيق، مقاسات S–XXL. توصيل داخل باكستان.',
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('0243edaa-3fab-5063-89e1-44a1560bc167', 'hijab', 'Hijab', 'حجاب', 'حجاب',
   'Khimars, jersey hijabs and under-scarf caps chosen for the heat of Makkah and Madinah — breathable, non-slip and easy to wear without pins.', 'مکہ اور مدینہ کی گرمی کے لیے منتخب کیے گئے خِمار، جرسی حجاب اور انڈر اسکارف کیپس — ہوادار، نہ پھسلنے والے اور بغیر پِن کے آسانی سے پہننے کے قابل۔', 'خُمُر وحجابات جيرسيه وقبعات داخلية مختارة لحرّ مكة والمدينة — قابلة للتنفّس، لا تنزلق، وسهلة الارتداء دون دبابيس.',
   @cat_abaya_hijab, 2, 0, 1,
   'Hijab & Khimar Online Pakistan | YalaHaji', 'حجاب اور خِمار آن لائن پاکستان | یالا حاجی', 'حجاب وخِمار أونلاين في باكستان | يالا حاجي',
   'Shop instant khimars, premium jersey hijabs and breathable under-scarf caps. Non-slip, pin-free and made for pilgrimage. Delivered Pakistan-wide.', 'انسٹنٹ خِمار، پریمیم جرسی حجاب اور ہوادار انڈر اسکارف کیپس خریدیں۔ نہ پھسلنے والے، بغیر پِن اور سفرِ حج و عمرہ کے لیے موزوں۔ پاکستان بھر میں ڈیلیوری۔', 'تسوّق الخُمُر الجاهزة وحجابات الجيرسيه الفاخرة والقبعات الداخلية القابلة للتنفّس. لا تنزلق، بلا دبابيس، ومناسبة للحج والعمرة. توصيل لكل باكستان.',
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('9ae185a1-ada2-52dd-8cb0-82ca06ec388b', 'gifts', 'Gifts', 'تحائف', 'هدايا',
   'After-return gifts rooted in Sunnah tradition — hand-selected Ajwa dates from Madinah, sealed Zamzam water and curated keepsake hampers.', 'سنت کی روایت سے جُڑے واپسی کے تحائف — مدینہ منورہ کی چُنی ہوئی عجوہ کھجوریں، سیل بند آبِ زم زم اور خوبصورت یادگاری ہیمپرز۔', 'هدايا العودة المتجذّرة في السنّة — تمر العجوة المنتقى يدويًا من المدينة المنورة، وماء زمزم المختوم، وسلال هدايا تذكارية منسّقة.',
   NULL, 7, 1, 1,
   'Hajj & Umrah Gifts Pakistan | YalaHaji', 'حج و عمرہ کے تحائف پاکستان | یالا حاجی', 'هدايا الحج والعمرة في باكستان | يالا حاجي',
   'Shop Ajwa dates, sealed Zamzam water and deluxe after-return hampers. Beautifully packaged Hajj and Umrah gifts, delivered across Pakistan.', 'عجوہ کھجور، سیل بند آبِ زم زم اور ڈیلکس واپسی ہیمپرز خریدیں۔ خوبصورت پیکنگ میں حج و عمرہ کے تحائف، پاکستان بھر میں ڈیلیوری۔', 'تسوّق تمر العجوة وماء زمزم المختوم وسلال العودة الفاخرة. هدايا حج وعمرة بتغليف أنيق، مع التوصيل داخل باكستان.',
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

INSERT INTO `categories`
  (`id`, `slug`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`,
   `parentId`, `order`, `featured`, `isActive`,
   `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`,
   `createdAt`, `updatedAt`)
VALUES
  ('4f3888c4-34b1-5aeb-910b-794b4c58620a', 'travel-accessories', 'Travel Accessories', 'سفری لوازمات', 'مستلزمات السفر',
   'The practical kit for long days outdoors — waterproof shoe bags, hands-free umbrellas, Saudi-compatible adapters, Ihram-safe toiletries and leather ankle socks.', 'باہر گزرنے والے طویل دنوں کے لیے کارآمد سامان — واٹرپروف شو بیگز، ہینڈز فری چھتریاں، سعودی عرب کے موافق اڈاپٹر، احرام کے لیے موزوں ٹوائلٹریز اور چمڑے کی ٹخنہ جرابیں۔', 'المستلزمات العملية للأيام الطويلة في الخارج — أكياس أحذية مقاومة للماء، ومظلات بلا استخدام اليدين، ومحوّلات متوافقة مع السعودية، ومستلزمات نظافة آمنة للإحرام، وجوارب جلدية قصيرة.',
   NULL, 8, 1, 1,
   'Hajj & Umrah Travel Accessories | YalaHaji', 'حج و عمرہ سفری لوازمات | یالا حاجی', 'مستلزمات سفر الحج والعمرة | يالا حاجي',
   'Shop shoe bags, hands-free head umbrellas, Saudi travel adapters, unscented toiletries and leather ankle socks. Pilgrim essentials from YalaHaji.', 'شو بیگز، ہینڈز فری ہیڈ چھتری، سعودی ٹریول اڈاپٹر، بغیر خوشبو ٹوائلٹریز اور چمڑے کی ٹخنہ جرابیں خریدیں۔ یالا حاجی سے حاجی کی ضروری اشیاء۔', 'تسوّق أكياس الأحذية والمظلات الرأسية بلا استخدام اليدين ومحوّلات السعودية ومستلزمات النظافة غير المعطّرة والجوارب الجلدية. أساسيات الحاج من يالا حاجي.',
   NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE `id` = `id`;

-- Resolve every category id once. Read back from the table rather than reusing
-- the generated UUIDs above: on a seeded database the existing row keeps its
-- own id and the INSERT above was a no-op.

SET @cat_abaya = (SELECT `id` FROM `categories` WHERE `slug` = 'abaya');

SET @cat_abaya_hijab = (SELECT `id` FROM `categories` WHERE `slug` = 'abaya-hijab');

SET @cat_fragrances = (SELECT `id` FROM `categories` WHERE `slug` = 'fragrances');

SET @cat_gifts = (SELECT `id` FROM `categories` WHERE `slug` = 'gifts');

SET @cat_hijab = (SELECT `id` FROM `categories` WHERE `slug` = 'hijab');

SET @cat_ihram = (SELECT `id` FROM `categories` WHERE `slug` = 'ihram');

SET @cat_kits = (SELECT `id` FROM `categories` WHERE `slug` = 'kits');

SET @cat_prayer_accessories = (SELECT `id` FROM `categories` WHERE `slug` = 'prayer-accessories');

SET @cat_travel_accessories = (SELECT `id` FROM `categories` WHERE `slug` = 'travel-accessories');

-- If any slug above failed to resolve, its variable is NULL and the first
-- product INSERT that uses it fails on `products.categoryId` being NOT NULL,
-- rolling the whole transaction back. No product can be imported under a
-- missing category, and none can be left half-imported.
--
-- These are MySQL user variables, which are per-connection. Prisma applies a
-- migration file over a single connection, so they survive from here to the
-- last statement.

-- ── Products ─────────────────────────────────────────────────

-- 1. YalaHaji Deluxe Hajj & Umrah Travel Kit (12-in-1)  [YH-KIT-DLX-001 → kits]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('bef9f145-01cb-56f1-9051-30afdd0e63a2',
   'deluxe-hajj-umrah-travel-kit-12-in-1',
   'YH-KIT-DLX-001',
   'YalaHaji Deluxe Hajj & Umrah Travel Kit (12-in-1)',
   'یالا حاجی ڈیلکس حج و عمرہ ٹریول کٹ (12 اِن 1)',
   'طقم السفر الفاخر للحج والعمرة من يالا حاجي (12 في 1)',
   'The YalaHaji Deluxe Hajj & Umrah Travel Kit is a thoughtfully curated 12-piece bundle designed for pilgrims who want comfort and preparedness without the hassle of shopping separately. Includes premium unstitched ihram fabric (men), a fragrance-free travel toiletries set, tasbeeh, waterproof shoe bag, money pouch, foldable prayer mat, and a printed Hajj checklist. Packed in a reusable premium drawstring pouch, it''s built for the practical needs of the journey and makes a meaningful gift for a loved one preparing for pilgrimage.',
   'یالا حاجی ڈیلکس حج و عمرہ ٹریول کٹ 12 اشیاء پر مشتمل ایک سوچ سمجھ کر تیار کیا گیا بنڈل ہے، جو اُن حاجیوں کے لیے بنایا گیا ہے جو الگ الگ خریداری کی زحمت کے بغیر آرام اور مکمل تیاری چاہتے ہیں۔ اس میں پریمیم بغیر سلائی احرام کپڑا (مردوں کے لیے)، بغیر خوشبو ٹریول ٹوائلٹریز سیٹ، تسبیح، واٹرپروف شو بیگ، منی پاؤچ، فولڈ ہونے والی جانماز اور پرنٹ شدہ حج چیک لسٹ شامل ہیں۔ دوبارہ استعمال ہونے والے پریمیم ڈرا اسٹرنگ پاؤچ میں پیک، یہ کٹ سفر کی عملی ضروریات کے لیے بنایا گیا ہے اور حج و عمرہ کی تیاری کرنے والے کسی عزیز کے لیے بامعنی تحفہ ہے۔',
   'طقم السفر الفاخر للحج والعمرة من يالا حاجي هو حزمة منسّقة بعناية من 12 قطعة، صُمّمت للحجاج الراغبين في الراحة والاستعداد التام دون عناء الشراء المتفرّق. يشمل قماش إحرام فاخر غير مخيط (للرجال)، وطقم مستلزمات نظافة للسفر خالٍ من العطر، ومسبحة، وكيس أحذية مقاوم للماء، ومحفظة نقود، وسجادة صلاة قابلة للطي، وقائمة تدقيق مطبوعة للحج. يأتي معبّأً في حقيبة فاخرة برباط قابلة لإعادة الاستخدام، ومصمّم لتلبية الاحتياجات العملية للرحلة، كما يمثّل هدية ذات معنى لمن يستعدّ لأداء المناسك.',
   'Complete premium travel kit with ihram, toiletries, tasbeeh & prayer essentials.',
   'احرام، ٹوائلٹریز، تسبیح اور نماز کی ضروری اشیاء پر مشتمل مکمل پریمیم ٹریول کٹ۔',
   'طقم سفر فاخر متكامل يضم الإحرام ومستلزمات النظافة والمسبحة وأساسيات الصلاة.',
   @cat_kits,
   1,
   1,
   0,
   'Deluxe Hajj & Umrah Travel Kit Pakistan | YalaHaji',
   'Shop YalaHaji''s premium 12-in-1 Hajj & Umrah travel kit — ihram, toiletries, tasbeeh & more. Free delivery across Pakistan.',
   'Deluxe Hajj & Umrah Travel Kit Pakistan | YalaHaji',
   'ڈیلکس حج و عمرہ ٹریول کٹ پاکستان | یالا حاجی',
   'طقم السفر الفاخر للحج والعمرة | يالا حاجي',
   'Shop YalaHaji''s premium 12-in-1 Hajj & Umrah travel kit — ihram, toiletries, tasbeeh & more. Free delivery across Pakistan.',
   'یالا حاجی کا پریمیم 12 اِن 1 حج و عمرہ ٹریول کٹ خریدیں — احرام، ٹوائلٹریز، تسبیح اور بہت کچھ۔ پاکستان بھر میں مفت ڈیلیوری۔',
   'تسوّق طقم الحج والعمرة الفاخر 12 في 1 من يالا حاجي — إحرام ومستلزمات نظافة ومسبحة والمزيد. توصيل مجاني داخل باكستان.',
   'hajj kit, umrah kit, hajj travel kit pakistan, 12 in 1 umrah kit, pilgrim essentials, yalahaji',
   'حج کٹ, عمرہ کٹ, حج ٹریول کٹ پاکستان, 12 اِن 1 عمرہ کٹ, حاجی کی ضروری اشیاء, یالا حاجی',
   'طقم الحج, طقم العمرة, حقيبة سفر الحج, طقم عمرة 12 في 1, مستلزمات الحاج, يالا حاجي',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-KIT-DLX-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('6905aa8c-e56d-5e18-b42a-e3eb3a04c187', @pid, 'YH-KIT-DLX-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   1299900, 1499900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-KIT-DLX-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('3f810249-369a-5761-b67c-b9c58831668d', @pid, 'hajj kit'),
  ('73cb83ad-8c1f-538b-8327-07864e0acbdf', @pid, 'umrah kit'),
  ('f6a49664-e29f-5cec-b726-ee78923c6621', @pid, 'travel kit'),
  ('2d67faf0-8a2d-5126-865a-a89cf0e21ec7', @pid, 'pilgrim essentials');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('0781ed89-a24f-53b8-aa66-499683721c00', @pid, 'sale');

-- 2. YalaHaji Essentials Umrah Starter Kit (6-in-1)  [YH-KIT-ESS-002 → kits]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('dc77b4b7-c2ca-5c61-b19c-7dfb94b8d37f',
   'essentials-umrah-starter-kit-6-in-1',
   'YH-KIT-ESS-002',
   'YalaHaji Essentials Umrah Starter Kit (6-in-1)',
   'یالا حاجی ایسنشلز عمرہ اسٹارٹر کٹ (6 اِن 1)',
   'طقم العمرة الأساسي للمبتدئين من يالا حاجي (6 في 1)',
   'Perfect for first-time Umrah travellers, the Essentials Starter Kit includes a fragrance-free soap, tasbeeh, disposable toilet seat covers, a compact prayer mat, money pouch, and a printed dua guide. Every item is chosen for practicality and Shariah-compliance, giving new pilgrims peace of mind without overspending.',
   'پہلی بار عمرہ کرنے والوں کے لیے بہترین، ایسنشلز اسٹارٹر کٹ میں بغیر خوشبو صابن، تسبیح، ایک بار استعمال ہونے والے ٹوائلٹ سیٹ کور، کمپیکٹ جانماز، منی پاؤچ اور پرنٹ شدہ دعا گائیڈ شامل ہیں۔ ہر شے عملی افادیت اور شریعت کے مطابق ہونے کی بنیاد پر منتخب کی گئی ہے، تاکہ نئے حاجیوں کو زیادہ خرچ کیے بغیر اطمینان حاصل ہو۔',
   'مثالي لمن يسافر لأداء العمرة لأول مرة، يضم طقم البدء الأساسي صابونًا خاليًا من العطر، ومسبحة، وأغطية مقاعد حمّام للاستعمال مرة واحدة، وسجادة صلاة صغيرة، ومحفظة نقود، ودليل أدعية مطبوعًا. كل عنصر مختار لعمليّته وموافقته للشريعة، ما يمنح المعتمر الجديد راحة بال دون إنفاق زائد.',
   'Budget-friendly starter kit with the core essentials for first-time Umrah pilgrims.',
   'پہلی بار عمرہ کرنے والوں کے لیے بنیادی ضروری اشیاء پر مشتمل کم قیمت اسٹارٹر کٹ۔',
   'طقم بدء اقتصادي يضم الأساسيات الجوهرية لمن يؤدّي العمرة لأول مرة.',
   @cat_kits,
   1,
   1,
   0,
   'Umrah Starter Kit Pakistan | YalaHaji Essentials',
   'Affordable 6-in-1 Umrah starter kit with all core travel essentials. Order online from YalaHaji.',
   'Umrah Starter Kit Pakistan | YalaHaji Essentials',
   'عمرہ اسٹارٹر کٹ پاکستان | یالا حاجی ایسنشلز',
   'طقم العمرة للمبتدئين في باكستان | يالا حاجي',
   'Affordable 6-in-1 Umrah starter kit with all core travel essentials. Order online from YalaHaji.',
   'تمام بنیادی سفری ضروریات پر مشتمل سستا 6 اِن 1 عمرہ اسٹارٹر کٹ۔ یالا حاجی سے آن لائن آرڈر کریں۔',
   'طقم عمرة اقتصادي 6 في 1 يضم جميع أساسيات السفر الجوهرية. اطلبه أونلاين من يالا حاجي.',
   'umrah starter kit, budget umrah kit, first time umrah, cheap hajj kit pakistan, umrah essentials',
   'عمرہ اسٹارٹر کٹ, سستا عمرہ کٹ, پہلی بار عمرہ, حج کٹ پاکستان, عمرہ کی ضروری اشیاء',
   'طقم العمرة للمبتدئين, طقم عمرة اقتصادي, العمرة لأول مرة, طقم حج رخيص, أساسيات العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-KIT-ESS-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('b02fd0e5-ba55-5b44-b63e-8320e7e7ffb7', @pid, 'YH-KIT-ESS-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   499900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-KIT-ESS-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('668ccc94-cc72-5c15-ac0e-57a408b94944', @pid, 'umrah kit'),
  ('24b072d6-ef11-5fb6-b867-fbb97daebc25', @pid, 'starter kit'),
  ('cd63bfbc-5d10-5ae7-80f9-e978bdad1509', @pid, 'budget hajj kit');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 3. YalaHaji Family Hajj Kit Bundle (Set of 4)  [YH-KIT-FAM-003 → kits]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('cec6adee-c9a8-5c75-a2a8-d40b98b1b696',
   'family-hajj-kit-bundle-set-of-4',
   'YH-KIT-FAM-003',
   'YalaHaji Family Hajj Kit Bundle (Set of 4)',
   'یالا حاجی فیملی حج کٹ بنڈل (4 کا سیٹ)',
   'حزمة طقم الحج العائلية من يالا حاجي (طقم من 4)',
   'Travelling as a family? The YalaHaji Family Hajj Kit Bundle includes four individually packed essentials kits — ideal for parents and children performing Hajj or Umrah together. Each kit is customizable by gender and age, containing ihram or modest wear, toiletries, and prayer accessories, all bundled at a family-friendly price.',
   'خاندان کے ساتھ سفر کر رہے ہیں؟ یالا حاجی فیملی حج کٹ بنڈل میں الگ الگ پیک کیے گئے چار ایسنشلز کٹس شامل ہیں — والدین اور بچوں کے ایک ساتھ حج یا عمرہ کرنے کے لیے مثالی۔ ہر کٹ جنس اور عمر کے مطابق ترتیب دی جا سکتی ہے، جس میں احرام یا باپردہ لباس، ٹوائلٹریز اور نماز کی اشیاء شامل ہیں، اور یہ سب خاندان کے لیے مناسب قیمت پر دستیاب ہے۔',
   'هل تسافر بصحبة العائلة؟ تضم حزمة طقم الحج العائلية من يالا حاجي أربعة أطقم أساسيات معبّأة بشكل منفصل — مثالية للوالدين والأطفال الذين يؤدّون الحج أو العمرة معًا. يمكن تخصيص كل طقم بحسب الجنس والعمر، ويحتوي على إحرام أو ملابس محتشمة ومستلزمات نظافة ومستلزمات صلاة، وكل ذلك بسعر مناسب للعائلة.',
   'Four individually packed kits for families performing Hajj or Umrah together.',
   'ایک ساتھ حج یا عمرہ کرنے والے خاندانوں کے لیے الگ الگ پیک کیے گئے چار کٹس۔',
   'أربعة أطقم معبّأة بشكل منفصل للعائلات التي تؤدّي الحج أو العمرة معًا.',
   @cat_kits,
   1,
   1,
   0,
   'Family Hajj Kit Bundle Pakistan | YalaHaji',
   'Shop a complete family Hajj kit bundle — 4 individually packed kits for parents & children. Premium quality from YalaHaji.',
   'Family Hajj Kit Bundle Pakistan | YalaHaji',
   'فیملی حج کٹ بنڈل پاکستان | یالا حاجی',
   'حزمة طقم الحج العائلية في باكستان | يالا حاجي',
   'Shop a complete family Hajj kit bundle — 4 individually packed kits for parents & children. Premium quality from YalaHaji.',
   'مکمل فیملی حج کٹ بنڈل خریدیں — والدین اور بچوں کے لیے الگ الگ پیک کیے گئے 4 کٹس۔ یالا حاجی کی پریمیم کوالٹی۔',
   'تسوّق حزمة طقم الحج العائلية الكاملة — 4 أطقم معبّأة بشكل منفصل للوالدين والأطفال. جودة فاخرة من يالا حاجي.',
   'family hajj kit, umrah bundle, group pilgrimage kit, hajj kit for family pakistan, kids umrah kit',
   'فیملی حج کٹ, عمرہ بنڈل, گروپ حج کٹ, خاندان کے لیے حج کٹ پاکستان, بچوں کا عمرہ کٹ',
   'طقم الحج العائلي, حزمة العمرة, طقم الحج الجماعي, طقم حج للعائلة, طقم عمرة للأطفال',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-KIT-FAM-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('706101c3-a886-5cb6-94a2-0b6306704b8a', @pid, 'YH-KIT-FAM-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   3999900, 4499900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-KIT-FAM-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('48e2767c-e92e-5370-a186-c63d4baa503d', @pid, 'family hajj kit'),
  ('36842334-ae7f-5baf-ae81-59953e595419', @pid, 'umrah bundle'),
  ('3e067ff2-d518-52e3-a269-97f0d82f485d', @pid, 'group pilgrimage kit');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('99fe4b17-efdb-5436-9ec1-08a74101b047', @pid, 'sale');

-- 4. YalaHaji Premium Triple-Layer Ihram for Men (2-Piece Set)  [YH-IHR-MEN-001 → ihram]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('ae8d76f6-6930-578f-92a4-4200f70d43cc',
   'premium-triple-layer-ihram-men-2-piece-set',
   'YH-IHR-MEN-001',
   'YalaHaji Premium Triple-Layer Ihram for Men (2-Piece Set)',
   'یالا حاجی پریمیم ٹرپل لیئر احرام برائے مرد (2 پیس سیٹ)',
   'إحرام يالا حاجي الفاخر ثلاثي الطبقات للرجال (قطعتان)',
   'Crafted from breathable triple-layer terry cotton, this premium ihram set for men prevents see-through fabric while remaining lightweight in Makkah and Madinah heat. The unstitched two-piece set meets full Shariah requirements and includes a complimentary storage pouch and safety pins.',
   'ہوادار ٹرپل لیئر ٹیری کاٹن سے تیار کردہ یہ پریمیم احرام سیٹ مردوں کے لیے ہے، جو کپڑے کے آر پار نظر آنے سے بچاتا ہے اور مکہ و مدینہ کی گرمی میں ہلکا پھلکا رہتا ہے۔ بغیر سلائی دو ٹکڑوں کا یہ سیٹ شریعت کے تمام تقاضے پورا کرتا ہے اور اس کے ساتھ مفت اسٹوریج پاؤچ اور سیفٹی پِنیں شامل ہیں۔',
   'مصنوع من قطن التيري ثلاثي الطبقات القابل للتنفّس، يمنع طقم الإحرام الفاخر هذا للرجال شفافية القماش مع بقائه خفيفًا في حرّ مكة والمدينة. الطقم غير المخيط المكوّن من قطعتين يستوفي متطلبات الشريعة كاملة، ويشمل حقيبة تخزين ودبابيس أمان مجانًا.',
   'Ultra-soft, non-transparent triple-layer terry ihram fabric with secure wrap design.',
   'انتہائی نرم، غیر شفاف ٹرپل لیئر ٹیری احرام کپڑا، محفوظ لپیٹ ڈیزائن کے ساتھ۔',
   'قماش إحرام تيري ثلاثي الطبقات فائق النعومة وغير شفّاف بتصميم لفّ محكم.',
   @cat_ihram,
   0,
   1,
   0,
   'Premium Men''s Ihram 2-Piece Set | YalaHaji',
   'Buy premium triple-layer, non-transparent ihram for men online in Pakistan. Soft, breathable & Shariah-compliant.',
   'Premium Men''s Ihram 2-Piece Set | YalaHaji',
   'پریمیم مردانہ احرام 2 پیس سیٹ | یالا حاجی',
   'إحرام رجالي فاخر من قطعتين | يالا حاجي',
   'Buy premium triple-layer, non-transparent ihram for men online in Pakistan. Soft, breathable & Shariah-compliant.',
   'پاکستان میں آن لائن پریمیم ٹرپل لیئر، غیر شفاف مردانہ احرام خریدیں۔ نرم، ہوادار اور شریعت کے مطابق۔',
   'اشترِ إحرامًا رجاليًا فاخرًا ثلاثي الطبقات وغير شفّاف أونلاين في باكستان. ناعم وقابل للتنفّس وموافق للشريعة.',
   'ihram for men, ahram, ihram set pakistan, triple layer ihram, non transparent ihram, hajj clothing',
   'مردانہ احرام, احرام, احرام سیٹ پاکستان, ٹرپل لیئر احرام, غیر شفاف احرام, حج کا لباس',
   'إحرام رجالي, إحرام, طقم إحرام, إحرام ثلاثي الطبقات, إحرام غير شفاف, ملابس الحج',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-IHR-MEN-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('ba9e756d-99cc-5c7a-aacc-e24e6f026e5a', @pid, 'YH-IHR-MEN-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   349900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-IHR-MEN-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('26f8b275-7db7-5ec5-875e-2e07f7eaab8a', @pid, 'ihram for men'),
  ('d21e34e3-555d-57c8-8c50-5ec58a798aee', @pid, 'ahram'),
  ('ba7a175d-127f-575a-9d57-2cc070c491fc', @pid, 'ihram set');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 5. YalaHaji Button & Elastic Ihram for Boys  [YH-IHR-KID-002 → ihram]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('72a4b11e-dcde-5e7e-af5c-b514c1a71828',
   'button-elastic-ihram-for-boys',
   'YH-IHR-KID-002',
   'YalaHaji Button & Elastic Ihram for Boys',
   'یالا حاجی بٹن اور ایلاسٹک احرام برائے لڑکے',
   'إحرام يالا حاجي بالأزرار والحزام المطاطي للأولاد',
   'Designed specifically for young pilgrims, this stitched ihram uses a button-and-elastic waistband so it stays secure without constant readjustment. The soft, breathable cotton blend is gentle on children''s skin and available in multiple sizes for boys aged 3 to 12.',
   'خاص طور پر کم عمر حاجیوں کے لیے تیار کیا گیا یہ سِلا ہوا احرام بٹن اور ایلاسٹک کمربند استعمال کرتا ہے، تاکہ بار بار درست کیے بغیر محفوظ رہے۔ نرم، ہوادار کاٹن آمیزہ بچوں کی جِلد کے لیے ملائم ہے اور 3 سے 12 سال کے لڑکوں کے لیے متعدد سائزوں میں دستیاب ہے۔',
   'مصمّم خصيصًا للحجاج الصغار، يعتمد هذا الإحرام المخيط على حزام خصر بالأزرار والمطاط ليبقى ثابتًا دون الحاجة إلى تعديل مستمر. مزيج القطن الناعم القابل للتنفّس لطيف على بشرة الأطفال، ومتوفّر بمقاسات متعدّدة للأولاد من عمر 3 إلى 12 سنة.',
   'Soft stitched ihram with secure elastic waistband, designed for comfort during long prayers.',
   'محفوظ ایلاسٹک کمربند کے ساتھ نرم سِلا ہوا احرام، لمبی نمازوں کے دوران آرام کے لیے تیار کیا گیا۔',
   'إحرام مخيط ناعم بحزام خصر مطاطي محكم، مصمّم للراحة أثناء الصلوات الطويلة.',
   @cat_ihram,
   0,
   1,
   0,
   'Ihram for Kids Pakistan | YalaHaji Boys Ihram',
   'Shop comfortable, secure button & elastic ihram for boys. Soft cotton, easy to wear, available in all sizes.',
   'Ihram for Kids Pakistan | YalaHaji Boys Ihram',
   'بچوں کا احرام پاکستان | یالا حاجی',
   'إحرام للأطفال في باكستان | يالا حاجي',
   'Shop comfortable, secure button & elastic ihram for boys. Soft cotton, easy to wear, available in all sizes.',
   'لڑکوں کے لیے آرام دہ اور محفوظ بٹن و ایلاسٹک احرام خریدیں۔ نرم کاٹن، پہننے میں آسان، تمام سائزوں میں دستیاب۔',
   'تسوّق إحرامًا مريحًا ومحكمًا بالأزرار والمطاط للأولاد. قطن ناعم وسهل الارتداء ومتوفّر بجميع المقاسات.',
   'ihram for kids, boys ihram, kids hajj clothing, children umrah dress, ihram 3 to 12 years',
   'بچوں کا احرام, لڑکوں کا احرام, بچوں کا حج لباس, بچوں کا عمرہ لباس, 3 سے 12 سال احرام',
   'إحرام أطفال, إحرام أولاد, ملابس حج للأطفال, لباس عمرة للأطفال, إحرام من 3 إلى 12 سنة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-IHR-KID-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('d102fbbf-d4f0-5f90-a111-488141c03b7e', @pid, 'YH-IHR-KID-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   299900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-IHR-KID-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('ea11262d-de9b-5d4f-87de-7ea385908ba3', @pid, 'ihram for kids'),
  ('f780394b-75bb-5928-a85b-4bd9d011348f', @pid, 'boys ihram'),
  ('8de7afc8-20c1-5b6d-b219-0b1bde2acff1', @pid, 'kids hajj clothing');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 6. YalaHaji Zippered Ihram Money Belt  [YH-IHR-BLT-003 → ihram]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('07277278-11ca-5dcf-85e5-49c855e37121',
   'zippered-ihram-money-belt',
   'YH-IHR-BLT-003',
   'YalaHaji Zippered Ihram Money Belt',
   'یالا حاجی زپ والا احرام منی بیلٹ',
   'حزام النقود للإحرام بسحّاب من يالا حاجي',
   'This discreet zippered money belt is designed to sit comfortably beneath ihram fabric, keeping your passport, cash, and cards secure throughout Tawaf and Sa''i. The sweat-resistant lining prevents chafing even during long hours of movement in the heat.',
   'یہ غیر نمایاں زپ والا منی بیلٹ احرام کے کپڑے کے نیچے آرام سے بیٹھنے کے لیے بنایا گیا ہے، جو طواف اور سعی کے دوران آپ کے پاسپورٹ، نقدی اور کارڈز کو محفوظ رکھتا ہے۔ پسینہ جذب نہ کرنے والی لائننگ گرمی میں لمبے وقت تک حرکت کے باوجود رگڑ سے بچاتی ہے۔',
   'صُمّم حزام النقود هذا بسحّاب ليستقرّ بارتياح تحت قماش الإحرام دون أن يُلاحَظ، حافظًا جواز سفرك ونقودك وبطاقاتك آمنة طوال الطواف والسعي. البطانة المقاومة للعرق تمنع التسلّخ حتى خلال ساعات الحركة الطويلة في الحرّ.',
   'Hidden waist pouch that wears comfortably underneath ihram for cash, passport & cards.',
   'پوشیدہ کمر پاؤچ جو احرام کے نیچے آرام سے پہنا جاتا ہے — نقدی، پاسپورٹ اور کارڈز کے لیے۔',
   'حقيبة خصر مخفيّة تُلبس بارتياح تحت الإحرام لحفظ النقود وجواز السفر والبطاقات.',
   @cat_ihram,
   0,
   1,
   0,
   'Ihram Money Belt for Hajj Umrah | YalaHaji',
   'Secure zippered money belt designed to wear under ihram. Sweat-resistant, comfortable, and discreet.',
   'Ihram Money Belt for Hajj Umrah | YalaHaji',
   'حج و عمرہ کے لیے احرام منی بیلٹ | یالا حاجی',
   'حزام نقود الإحرام للحج والعمرة | يالا حاجي',
   'Secure zippered money belt designed to wear under ihram. Sweat-resistant, comfortable, and discreet.',
   'احرام کے نیچے پہننے کے لیے محفوظ زپ والا منی بیلٹ۔ پسینہ مزاحم، آرام دہ اور غیر نمایاں۔',
   'حزام نقود آمن بسحّاب مصمّم ليُلبس تحت الإحرام. مقاوم للعرق ومريح وغير ملحوظ.',
   'ihram belt, hajj money belt, umrah money pouch, passport belt hajj, hajj security belt',
   'احرام بیلٹ, حج منی بیلٹ, عمرہ منی پاؤچ, پاسپورٹ بیلٹ حج, حج سیکیورٹی بیلٹ',
   'حزام الإحرام, حزام نقود الحج, محفظة نقود العمرة, حزام جواز السفر, حزام أمان الحج',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-IHR-BLT-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('96f9b017-af69-542b-ae63-0cb8212b29a3', @pid, 'YH-IHR-BLT-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   129900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-IHR-BLT-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('dd909e05-686b-5d76-b847-3819f9bf4a7c', @pid, 'ihram belt'),
  ('5e6227ed-bd55-5312-8bcb-4a5c4a8e885d', @pid, 'money pouch'),
  ('cc4e7ea1-da23-530e-859c-4f70be333b29', @pid, 'hajj security belt');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 7. YalaHaji Classic Nida Butterfly Abaya - Black  [YH-ABY-BLK-001 → abaya]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('8ca03d1b-89a3-5d50-af06-7393bff8e25e',
   'classic-nida-butterfly-abaya-black',
   'YH-ABY-BLK-001',
   'YalaHaji Classic Nida Butterfly Abaya - Black',
   'یالا حاجی کلاسک نِدا بٹرفلائی عبایہ — سیاہ',
   'عباءة الفراشة الكلاسيكية من قماش النِدا من يالا حاجي — أسود',
   'Made from premium Nida fabric that drapes beautifully without clinging, this classic butterfly abaya offers full coverage with an elegant silhouette. Reinforced double stitching at the seams ensures it holds up to daily wear, prayer, and travel alike. Available in sizes S–XXL.',
   'پریمیم نِدا کپڑے سے تیار کردہ، جو جسم سے چپکے بغیر خوبصورتی سے گِرتا ہے، یہ کلاسک بٹرفلائی عبایہ مکمل پردے کے ساتھ ایک شائستہ سراپا پیش کرتا ہے۔ سِلائیوں پر مضبوط ڈبل اسٹچنگ اسے روزمرہ پہناوے، نماز اور سفر — تینوں کے لیے پائیدار بناتی ہے۔ سائز S تا XXL میں دستیاب۔',
   'مصنوعة من قماش النِدا الفاخر الذي ينسدل بجمال دون التصاق بالجسم، تمنح عباءة الفراشة الكلاسيكية هذه تغطية كاملة بإطلالة أنيقة. الخياطة المزدوجة المقوّاة عند الحواف تضمن تحمّلها للاستخدام اليومي والصلاة والسفر على حدّ سواء. متوفّرة بمقاسات S–XXL.',
   'Flowing butterfly-cut abaya in premium Nida fabric with reinforced stitching.',
   'پریمیم نِدا کپڑے میں بہتا ہوا بٹرفلائی کٹ عبایہ، مضبوط سلائی کے ساتھ۔',
   'عباءة انسيابية بقصّة الفراشة من قماش النِدا الفاخر بخياطة مقوّاة.',
   @cat_abaya,
   0,
   1,
   0,
   'Black Butterfly Abaya Online Pakistan | YalaHaji',
   'Shop the YalaHaji Classic Nida Butterfly Abaya in black. Premium fabric, elegant drape, full coverage. Free delivery.',
   'Black Butterfly Abaya Online Pakistan | YalaHaji',
   'سیاہ بٹرفلائی عبایہ آن لائن پاکستان | یالا حاجی',
   'عباءة الفراشة السوداء أونلاين | يالا حاجي',
   'Shop the YalaHaji Classic Nida Butterfly Abaya in black. Premium fabric, elegant drape, full coverage. Free delivery.',
   'یالا حاجی کا کلاسک نِدا بٹرفلائی عبایہ سیاہ رنگ میں خریدیں۔ پریمیم کپڑا، خوبصورت گرَاوٹ، مکمل پردہ۔ مفت ڈیلیوری۔',
   'تسوّق عباءة الفراشة الكلاسيكية من النِدا باللون الأسود من يالا حاجي. قماش فاخر وانسدال أنيق وتغطية كاملة. توصيل مجاني.',
   'black abaya, butterfly abaya, nida abaya, abaya online pakistan, umrah abaya, modest wear',
   'سیاہ عبایہ, بٹرفلائی عبایہ, نِدا عبایہ, عبایہ آن لائن پاکستان, عمرہ عبایہ, باپردہ لباس',
   'عباءة سوداء, عباءة فراشة, عباءة نِدا, عباءات أونلاين, عباءة العمرة, ملابس محتشمة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-ABY-BLK-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('87e34045-f4a0-50c3-86c1-b3f400f487bc', @pid, 'YH-ABY-BLK-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   549900, 649900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-ABY-BLK-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('2eccc0fc-7e57-5698-8ccf-a2de00f4e0bf', @pid, 'black abaya'),
  ('a601e77b-014d-5805-9182-fd810a77dcd0', @pid, 'butterfly abaya'),
  ('530fb8fc-79b9-5dac-81ea-e6b802c1b539', @pid, 'nida abaya');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('53e89155-8fe3-5128-b8a0-fa8cb0ea6005', @pid, 'sale');

-- 8. YalaHaji Open Kimono Abaya with Belt - Beige  [YH-ABY-KIM-002 → abaya]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('4d38cd91-e9f9-5e20-9dfe-ee9d9827df66',
   'open-kimono-abaya-with-belt-beige',
   'YH-ABY-KIM-002',
   'YalaHaji Open Kimono Abaya with Belt - Beige',
   'یالا حاجی اوپن کیمونو عبایہ بمع بیلٹ — بیج',
   'عباءة الكيمونو المفتوحة مع حزام من يالا حاجي — بيج',
   'This open kimono-style abaya combines modest styling with everyday versatility — wear it layered over daily outfits or as ceremonial modest wear. It comes with a matching self-fabric belt to cinch the waist and includes side pockets for practicality.',
   'یہ اوپن کیمونو طرز کا عبایہ باپردہ اسٹائل کو روزمرہ کی ہمہ جہت افادیت کے ساتھ جوڑتا ہے — اسے روزمرہ کے لباس کے اوپر پہنیں یا تقریباتی باپردہ لباس کے طور پر۔ اس کے ساتھ کمر کسنے کے لیے ہم رنگ کپڑے کی بیلٹ آتی ہے، اور عملی سہولت کے لیے سائیڈ جیبیں شامل ہیں۔',
   'تجمع عباءة الكيمونو المفتوحة هذه بين الاحتشام في التصميم والتنوّع في الاستخدام اليومي — ارتديها فوق ملابسك اليومية أو كزيّ محتشم للمناسبات. تأتي مع حزام من القماش نفسه لتحديد الخصر، وتتضمّن جيوبًا جانبية عملية.',
   'Modern open-front kimono abaya with matching fabric belt, layered over daily wear.',
   'جدید اوپن فرنٹ کیمونو عبایہ، ہم رنگ کپڑے کی بیلٹ کے ساتھ، روزمرہ لباس کے اوپر پہننے کے لیے۔',
   'عباءة كيمونو عصرية مفتوحة من الأمام مع حزام من القماش نفسه، تُلبس فوق الملابس اليومية.',
   @cat_abaya,
   0,
   1,
   0,
   'Open Kimono Abaya Pakistan | YalaHaji',
   'Shop the modern Open Kimono Abaya with belt in beige. Versatile, elegant modest wear from YalaHaji.',
   'Open Kimono Abaya Pakistan | YalaHaji',
   'اوپن کیمونو عبایہ پاکستان | یالا حاجی',
   'عباءة كيمونو مفتوحة في باكستان | يالا حاجي',
   'Shop the modern Open Kimono Abaya with belt in beige. Versatile, elegant modest wear from YalaHaji.',
   'بیج رنگ میں جدید اوپن کیمونو عبایہ بمع بیلٹ خریدیں۔ یالا حاجی کا ہمہ جہت، شائستہ باپردہ لباس۔',
   'تسوّق عباءة الكيمونو المفتوحة العصرية مع حزام باللون البيج. زيّ محتشم أنيق ومتعدّد الاستخدامات من يالا حاجي.',
   'kimono abaya, open abaya, beige abaya, modest wear pakistan, abaya with belt, front open abaya',
   'کیمونو عبایہ, اوپن عبایہ, بیج عبایہ, باپردہ لباس پاکستان, بیلٹ والا عبایہ, فرنٹ اوپن عبایہ',
   'عباءة كيمونو, عباءة مفتوحة, عباءة بيج, ملابس محتشمة, عباءة بحزام, عباءة مفتوحة من الأمام',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-ABY-KIM-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('2320acbb-8a9c-5352-b124-dc28da3918aa', @pid, 'YH-ABY-KIM-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   749900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-ABY-KIM-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('d7088554-0c2f-521a-969b-98744a5a184f', @pid, 'kimono abaya'),
  ('31a9e77a-5f6b-58b4-85c3-1b8c7ea33e50', @pid, 'open abaya'),
  ('910b88c2-d34a-5592-81ab-4bb8696a7511', @pid, 'modest wear pakistan');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 9. YalaHaji Lightweight Prayer Abaya - Emerald Green  [YH-ABY-PRY-003 → abaya]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('520e2d90-6349-5b02-89eb-908b23b6036d',
   'lightweight-prayer-abaya-emerald-green',
   'YH-ABY-PRY-003',
   'YalaHaji Lightweight Prayer Abaya - Emerald Green',
   'یالا حاجی ہلکا پھلکا نماز عبایہ — زمردی سبز',
   'عباءة الصلاة الخفيفة من يالا حاجي — أخضر زمرّدي',
   'Purpose-built for prayer and Tawaf, this abaya uses an ultra-lightweight breathable fabric that moves freely with you during Sujood and long hours of standing. The loose, non-restrictive cut ensures full coverage without any discomfort.',
   'نماز اور طواف کے لیے خاص طور پر بنایا گیا، یہ عبایہ انتہائی ہلکے اور ہوادار کپڑے سے تیار کیا گیا ہے جو سجدے اور گھنٹوں کھڑے رہنے کے دوران آپ کے ساتھ آزادانہ حرکت کرتا ہے۔ کھلا اور غیر تنگ کٹ بغیر کسی تکلیف کے مکمل پردہ یقینی بناتا ہے۔',
   'مصمّمة خصيصًا للصلاة والطواف، تعتمد هذه العباءة على قماش فائق الخفّة قابل للتنفّس يتحرّك بحرّية معك أثناء السجود وساعات الوقوف الطويلة. القصّة الفضفاضة غير المقيِّدة تضمن تغطية كاملة دون أي إزعاج.',
   'Featherlight prayer abaya designed for ease of movement during Salah and Tawaf.',
   'نماز اور طواف کے دوران آسان حرکت کے لیے تیار کیا گیا پَر جیسا ہلکا نماز عبایہ۔',
   'عباءة صلاة بخفّة الريشة مصمّمة لسهولة الحركة أثناء الصلاة والطواف.',
   @cat_abaya,
   0,
   1,
   0,
   'Prayer Abaya for Women | YalaHaji Emerald Green',
   'Buy YalaHaji''s lightweight prayer abaya, designed for comfort during Salah and Tawaf. Shop online now.',
   'Prayer Abaya for Women | YalaHaji Emerald Green',
   'خواتین کے لیے نماز عبایہ | یالا حاجی زمردی سبز',
   'عباءة صلاة للنساء | يالا حاجي أخضر زمرّدي',
   'Buy YalaHaji''s lightweight prayer abaya, designed for comfort during Salah and Tawaf. Shop online now.',
   'یالا حاجی کا ہلکا پھلکا نماز عبایہ خریدیں، جو نماز اور طواف کے دوران آرام کے لیے تیار کیا گیا ہے۔ ابھی آن لائن خریداری کریں۔',
   'اشترِ عباءة الصلاة الخفيفة من يالا حاجي، المصمّمة للراحة أثناء الصلاة والطواف. تسوّق أونلاين الآن.',
   'prayer abaya, salah abaya, tawaf abaya, lightweight abaya, green abaya, umrah abaya women',
   'نماز عبایہ, صلاۃ عبایہ, طواف عبایہ, ہلکا عبایہ, سبز عبایہ, خواتین عمرہ عبایہ',
   'عباءة الصلاة, عباءة الطواف, عباءة خفيفة, عباءة خضراء, عباءة العمرة للنساء',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-ABY-PRY-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('b0c4f420-6511-5a97-907c-42f347911006', @pid, 'YH-ABY-PRY-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   599900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-ABY-PRY-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('90ea4207-c80d-547c-896d-f40dca13f698', @pid, 'prayer abaya'),
  ('3e190cb9-0723-51db-8602-4b3236cd8855', @pid, 'salah abaya'),
  ('49c07697-f373-51ac-a98a-26360f79f0dc', @pid, 'tawaf abaya');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 10. YalaHaji Girls Abaya & Hijab Set - Dusty Rose  [YH-ABY-GRL-004 → abaya]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('b8da17be-e277-5860-8cf1-76f9dc42d6cd',
   'girls-abaya-hijab-set-dusty-rose',
   'YH-ABY-GRL-004',
   'YalaHaji Girls Abaya & Hijab Set - Dusty Rose',
   'یالا حاجی گرلز عبایہ اور حجاب سیٹ — ڈسٹی روز',
   'طقم عباءة وحجاب للبنات من يالا حاجي — وردي باهت',
   'Introduce modest dressing early with this coordinated abaya and hijab set for girls aged 4–12. Made from a soft cotton blend that''s gentle on young skin, it''s a favourite for family Umrah trips and Eid.',
   '4 سے 12 سال کی بچیوں کے لیے اس ہم آہنگ عبایہ اور حجاب سیٹ کے ساتھ باپردہ لباس کی ابتدا کریں۔ نرم کاٹن آمیزے سے تیار کردہ جو کمسن جِلد کے لیے ملائم ہے، یہ خاندانی عمرہ سفر اور عید کے لیے پسندیدہ انتخاب ہے۔',
   'عرّفي طفلتك على الاحتشام مبكرًا بهذا الطقم المتناسق من عباءة وحجاب للفتيات من عمر 4 إلى 12 سنة. مصنوع من مزيج قطني ناعم لطيف على البشرة الصغيرة، وهو الخيار المفضّل لرحلات العمرة العائلية والعيد.',
   'Matching mini abaya and hijab set for young girls, soft cotton blend.',
   'چھوٹی بچیوں کے لیے ہم رنگ منی عبایہ اور حجاب سیٹ، نرم کاٹن آمیزے میں۔',
   'طقم عباءة صغيرة وحجاب متناسق للفتيات الصغيرات من مزيج قطني ناعم.',
   @cat_abaya,
   0,
   1,
   0,
   'Girls Abaya & Hijab Set Pakistan | YalaHaji',
   'Shop matching abaya & hijab sets for girls. Soft, comfortable, and made for family Umrah travel.',
   'Girls Abaya & Hijab Set Pakistan | YalaHaji',
   'گرلز عبایہ اور حجاب سیٹ پاکستان | یالا حاجی',
   'طقم عباءة وحجاب للبنات في باكستان | يالا حاجي',
   'Shop matching abaya & hijab sets for girls. Soft, comfortable, and made for family Umrah travel.',
   'بچیوں کے لیے ہم رنگ عبایہ اور حجاب سیٹ خریدیں۔ نرم، آرام دہ اور خاندانی عمرہ سفر کے لیے موزوں۔',
   'تسوّقي أطقم العباءة والحجاب المتناسقة للبنات. ناعمة ومريحة ومصمّمة لرحلات العمرة العائلية.',
   'girls abaya, kids modest wear, abaya hijab set, children abaya pakistan, girls umrah dress',
   'گرلز عبایہ, بچوں کا باپردہ لباس, عبایہ حجاب سیٹ, بچیوں کا عبایہ پاکستان, بچیوں کا عمرہ لباس',
   'عباءة بنات, ملابس محتشمة للأطفال, طقم عباءة وحجاب, عباءة أطفال, لباس عمرة للبنات',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-ABY-GRL-004');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('3ebfb4dc-19ae-5059-b894-8dace3e03973', @pid, 'YH-ABY-GRL-004-STD', 'Standard', NULL, NULL, NULL, NULL,
   399900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-ABY-GRL-004-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('b9891459-5f43-5292-81cb-ccdfd9d5fd84', @pid, 'girls abaya'),
  ('f64674cb-4028-575c-8fd9-2e41731aca09', @pid, 'kids modest wear'),
  ('d2836401-8bcb-5165-b79b-c3a157a9a034', @pid, 'abaya hijab set');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 11. YalaHaji 3-Layer Chiffon Khimar - Burgundy  [YH-HIJ-KHM-001 → hijab]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('692f6536-5b79-59b4-a2e8-123a93410a5e',
   '3-layer-chiffon-khimar-burgundy',
   'YH-HIJ-KHM-001',
   'YalaHaji 3-Layer Chiffon Khimar - Burgundy',
   'یالا حاجی 3 لیئر شفون خِمار — برگنڈی',
   'خِمار الشيفون ثلاثي الطبقات من يالا حاجي — عنّابي',
   'This no-pin, pull-on khimar features three flowing chiffon layers for elegant, full coverage down to the waist. The soft under-layer prevents slipping, making it ideal for both daily wear and pilgrimage. Available in 8 rich colours.',
   'بغیر پِن، پہن کر چڑھانے والے اس خِمار میں تین بہتی ہوئی شفون پرتیں ہیں جو کمر تک شائستہ اور مکمل پردہ فراہم کرتی ہیں۔ نرم زیریں پرت پھسلنے سے روکتی ہے، جو اسے روزمرہ پہناوے اور سفرِ حج و عمرہ دونوں کے لیے مثالی بناتی ہے۔ 8 گہرے رنگوں میں دستیاب۔',
   'يتميّز هذا الخِمار الجاهز الذي يُلبس دون دبابيس بثلاث طبقات شيفون منسدلة تمنح تغطية كاملة أنيقة حتى الخصر. الطبقة الداخلية الناعمة تمنع الانزلاق، ما يجعله مثاليًا للاستخدام اليومي وللحج والعمرة على السواء. متوفّر بـ 8 ألوان غنيّة.',
   'Instant three-layer khimar with no pins required, full chest coverage.',
   'بغیر پِن کے فوری تین پرتوں والا خِمار، سینے تک مکمل پردہ۔',
   'خِمار جاهز من ثلاث طبقات بلا حاجة إلى دبابيس، بتغطية كاملة للصدر.',
   @cat_hijab,
   0,
   1,
   0,
   '3-Layer Khimar Hijab Pakistan | YalaHaji',
   'Shop the instant 3-layer chiffon khimar in 8 colours. No pins needed, full coverage. Free delivery Pakistan-wide.',
   '3-Layer Khimar Hijab Pakistan | YalaHaji',
   '3 لیئر خِمار حجاب پاکستان | یالا حاجی',
   'خِمار ثلاثي الطبقات في باكستان | يالا حاجي',
   'Shop the instant 3-layer chiffon khimar in 8 colours. No pins needed, full coverage. Free delivery Pakistan-wide.',
   '8 رنگوں میں فوری 3 لیئر شفون خِمار خریدیں۔ پِن کی ضرورت نہیں، مکمل پردہ۔ پاکستان بھر میں مفت ڈیلیوری۔',
   'تسوّق خِمار الشيفون الجاهز ثلاثي الطبقات بـ 8 ألوان. بلا دبابيس وبتغطية كاملة. توصيل مجاني لكل باكستان.',
   'khimar, instant hijab, chiffon hijab, 3 layer khimar, burgundy khimar, prayer khimar pakistan',
   'خِمار, انسٹنٹ حجاب, شفون حجاب, 3 لیئر خِمار, برگنڈی خِمار, نماز خِمار پاکستان',
   'خِمار, حجاب جاهز, حجاب شيفون, خِمار ثلاث طبقات, خِمار عنّابي, خِمار الصلاة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-HIJ-KHM-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('2e697f27-939f-5411-bad6-c7ddf9da797c', @pid, 'YH-HIJ-KHM-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   329900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-HIJ-KHM-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('1f7fbc36-97bc-5181-98b4-c3cc337248d2', @pid, 'khimar'),
  ('7730ab1c-0fc8-512c-831b-cf5fadbc779f', @pid, 'instant hijab'),
  ('f0ce8597-0766-5488-9ffa-f4715f524c2d', @pid, 'chiffon hijab');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 12. YalaHaji Premium Jersey Hijab - Milky White  [YH-HIJ-JER-002 → hijab]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('683f9fde-bce1-55de-9902-406bf1572b13',
   'premium-jersey-hijab-milky-white',
   'YH-HIJ-JER-002',
   'YalaHaji Premium Jersey Hijab - Milky White',
   'یالا حاجی پریمیم جرسی حجاب — دودھیا سفید',
   'حجاب الجيرسيه الفاخر من يالا حاجي — أبيض حليبي',
   'Our premium jersey hijab is cut from a soft, stretchable knit that holds its shape and drape all day without pins. Its breathable texture makes it a top pick for the heat of Makkah and Madinah.',
   'ہمارا پریمیم جرسی حجاب نرم، لچکدار نِٹ سے کاٹا گیا ہے جو بغیر پِن کے سارا دن اپنی شکل اور گرَاوٹ برقرار رکھتا ہے۔ اس کی ہوادار ساخت اسے مکہ اور مدینہ کی گرمی کے لیے بہترین انتخاب بناتی ہے۔',
   'حجاب الجيرسيه الفاخر لدينا مصنوع من نسيج ناعم قابل للتمدّد يحافظ على شكله وانسداله طوال اليوم دون دبابيس. ملمسه القابل للتنفّس يجعله خيارًا أوّل لحرّ مكة والمدينة.',
   'Soft, non-slip jersey hijab with excellent stretch and breathability.',
   'نرم، نہ پھسلنے والا جرسی حجاب، بہترین لچک اور ہواداری کے ساتھ۔',
   'حجاب جيرسيه ناعم لا ينزلق، بمرونة وقابلية تنفّس ممتازتين.',
   @cat_hijab,
   0,
   1,
   0,
   'Jersey Hijab Online Pakistan | YalaHaji',
   'Buy the premium non-slip jersey hijab in Milky White. Soft, breathable, and easy to style. Order from YalaHaji.',
   'Jersey Hijab Online Pakistan | YalaHaji',
   'جرسی حجاب آن لائن پاکستان | یالا حاجی',
   'حجاب جيرسيه أونلاين في باكستان | يالا حاجي',
   'Buy the premium non-slip jersey hijab in Milky White. Soft, breathable, and easy to style. Order from YalaHaji.',
   'دودھیا سفید رنگ میں پریمیم نہ پھسلنے والا جرسی حجاب خریدیں۔ نرم، ہوادار اور آسانی سے سیٹ ہونے والا۔ یالا حاجی سے آرڈر کریں۔',
   'اشترِ حجاب الجيرسيه الفاخر الذي لا ينزلق باللون الأبيض الحليبي. ناعم وقابل للتنفّس وسهل التنسيق. اطلبه من يالا حاجي.',
   'jersey hijab, plain hijab, everyday hijab, white hijab pakistan, non slip hijab, stretch hijab',
   'جرسی حجاب, سادہ حجاب, روزمرہ حجاب, سفید حجاب پاکستان, نہ پھسلنے والا حجاب, لچکدار حجاب',
   'حجاب جيرسيه, حجاب سادة, حجاب يومي, حجاب أبيض, حجاب لا ينزلق, حجاب مطاطي',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-HIJ-JER-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('9dd8c738-ab90-5fa5-9e98-aa6931a9a4db', @pid, 'YH-HIJ-JER-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   149900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-HIJ-JER-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('c27eff0f-b523-56c0-a7b9-5cb5d39f0b7b', @pid, 'jersey hijab'),
  ('949d0a3c-1bd9-5322-8b73-90e41735447e', @pid, 'plain hijab'),
  ('c6545ed4-cef9-5b3d-90fe-db6466912830', @pid, 'everyday hijab');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 13. YalaHaji Under-Scarf Bonnet Cap - Pack of 3  [YH-HIJ-CAP-003 → hijab]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('466b53fa-e8d0-5f33-8dfb-348550b9180f',
   'under-scarf-bonnet-cap-pack-of-3',
   'YH-HIJ-CAP-003',
   'YalaHaji Under-Scarf Bonnet Cap - Pack of 3',
   'یالا حاجی انڈر اسکارف بونٹ کیپ — 3 کا پیک',
   'قبعة الحجاب الداخلية من يالا حاجي — عبوة من 3',
   'This pack of three cotton under-scarf caps provides a smooth, secure base for any hijab style, preventing slippage during long prayer sessions. Lightweight and breathable, they''re an everyday essential for modest dressing.',
   'تین کاٹن انڈر اسکارف کیپس کا یہ پیک کسی بھی حجاب اسٹائل کے لیے ہموار اور محفوظ بنیاد فراہم کرتا ہے، جو لمبی نمازوں کے دوران پھسلنے سے روکتا ہے۔ ہلکی پھلکی اور ہوادار، یہ باپردہ لباس کے لیے روزمرہ کی ضروری شے ہیں۔',
   'توفّر هذه العبوة المكوّنة من ثلاث قبعات قطنية داخلية قاعدة ناعمة ومحكمة لأي أسلوب حجاب، وتمنع الانزلاق خلال جلسات الصلاة الطويلة. خفيفة وقابلة للتنفّس، وهي ضرورة يومية للّباس المحتشم.',
   'Breathable cotton under-caps that keep hijab secure and prevent slipping.',
   'ہوادار کاٹن انڈر کیپس جو حجاب کو محفوظ رکھتی اور پھسلنے سے روکتی ہیں۔',
   'قبعات داخلية قطنية قابلة للتنفّس تُثبّت الحجاب وتمنع انزلاقه.',
   @cat_hijab,
   0,
   1,
   0,
   'Hijab Under Cap Pakistan | YalaHaji Bonnet Cap',
   'Shop a 3-pack of breathable cotton under-scarf caps. Keeps hijab secure all day. Order online from YalaHaji.',
   'Hijab Under Cap Pakistan | YalaHaji Bonnet Cap',
   'حجاب انڈر کیپ پاکستان | یالا حاجی بونٹ کیپ',
   'قبعة الحجاب الداخلية في باكستان | يالا حاجي',
   'Shop a 3-pack of breathable cotton under-scarf caps. Keeps hijab secure all day. Order online from YalaHaji.',
   'ہوادار کاٹن انڈر اسکارف کیپس کا 3 کا پیک خریدیں۔ حجاب کو سارا دن محفوظ رکھتی ہیں۔ یالا حاجی سے آن لائن آرڈر کریں۔',
   'تسوّق عبوة من 3 قبعات قطنية داخلية قابلة للتنفّس. تُبقي الحجاب ثابتًا طوال اليوم. اطلبها أونلاين من يالا حاجي.',
   'hijab cap, under scarf, bonnet cap, hijab undercap pakistan, cotton hijab cap, pack of 3',
   'حجاب کیپ, انڈر اسکارف, بونٹ کیپ, حجاب انڈر کیپ پاکستان, کاٹن حجاب کیپ, 3 کا پیک',
   'قبعة حجاب, قبعة داخلية, بونيه حجاب, قبعة حجاب قطنية, عبوة من 3',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-HIJ-CAP-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('bb1cca61-e99c-598b-bff5-e296883ba362', @pid, 'YH-HIJ-CAP-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   99900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-HIJ-CAP-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('bf368993-5e53-5d60-8111-ecc0d2a435d4', @pid, 'hijab cap'),
  ('c426a74c-2176-5fc3-ba33-3d6866362fb1', @pid, 'under scarf'),
  ('fd25d77c-daa5-5cbc-8167-18565731764a', @pid, 'bonnet cap');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 14. YalaHaji Foldable Travel Prayer Mat with Compass  [YH-PRY-JNZ-001 → prayer-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('88d7a1e6-9e1a-56c2-97bf-12618bea5186',
   'foldable-travel-prayer-mat-with-compass',
   'YH-PRY-JNZ-001',
   'YalaHaji Foldable Travel Prayer Mat with Compass',
   'یالا حاجی فولڈ ہونے والی سفری جانماز بمع قبلہ نما',
   'سجادة صلاة سفر قابلة للطي مع بوصلة من يالا حاجي',
   'This travel prayer mat folds down to the size of a paperback, making it easy to carry through airports and hotel rooms. The waterproof base protects against damp or dusty floors, and the built-in compass helps locate the Qibla anywhere in the world.',
   'یہ سفری جانماز ایک کتاب کے سائز تک فولڈ ہو جاتی ہے، جس سے اسے ایئرپورٹس اور ہوٹل کے کمروں میں لے جانا آسان ہو جاتا ہے۔ واٹرپروف بنیاد نم یا گرد آلود فرش سے حفاظت کرتی ہے، اور اندرونی قبلہ نما دنیا میں کہیں بھی قبلہ کا رخ معلوم کرنے میں مدد دیتا ہے۔',
   'تُطوى سجادة الصلاة هذه حتى تصبح بحجم كتاب صغير، ما يسهّل حملها عبر المطارات وفي غرف الفنادق. القاعدة المقاومة للماء تحمي من الأرضيات الرطبة أو المغبرّة، والبوصلة المدمجة تساعد على تحديد اتجاه القبلة في أي مكان في العالم.',
   'Waterproof, lightweight janamaz that folds to pocket size with built-in Qibla compass.',
   'واٹرپروف، ہلکی پھلکی جانماز جو جیب کے سائز میں فولڈ ہو جاتی ہے، اندرونی قبلہ نما کے ساتھ۔',
   'سجادة صلاة خفيفة مقاومة للماء تُطوى بحجم الجيب مع بوصلة قبلة مدمجة.',
   @cat_prayer_accessories,
   0,
   1,
   0,
   'Travel Prayer Mat with Compass | YalaHaji',
   'Shop the foldable, waterproof travel prayer mat with built-in Qibla compass. Lightweight and pocket-sized.',
   'Travel Prayer Mat with Compass | YalaHaji',
   'قبلہ نما والی سفری جانماز | یالا حاجی',
   'سجادة صلاة سفر مع بوصلة | يالا حاجي',
   'Shop the foldable, waterproof travel prayer mat with built-in Qibla compass. Lightweight and pocket-sized.',
   'اندرونی قبلہ نما کے ساتھ فولڈ ہونے والی، واٹرپروف سفری جانماز خریدیں۔ ہلکی پھلکی اور جیبی سائز۔',
   'تسوّق سجادة الصلاة القابلة للطي والمقاومة للماء مع بوصلة قبلة مدمجة. خفيفة وبحجم الجيب.',
   'travel janamaz, prayer mat with compass, portable prayer rug, pocket janamaz, qibla compass mat',
   'سفری جانماز, قبلہ نما جانماز, پورٹیبل جانماز, جیبی جانماز, قبلہ کمپاس جانماز',
   'سجادة سفر, سجادة صلاة ببوصلة, سجادة محمولة, سجادة جيب, بوصلة القبلة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-PRY-JNZ-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('9fb970c0-0bef-5633-b666-2929b16aedfa', @pid, 'YH-PRY-JNZ-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   159900, 189900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-PRY-JNZ-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('723671ee-c9b9-58f8-a4b5-f385a0bcc000', @pid, 'travel janamaz'),
  ('793667ad-1a04-5610-aa90-4b2747697ed4', @pid, 'prayer mat'),
  ('05b3e29c-c487-5273-9802-724f6f17fbe1', @pid, 'portable prayer rug');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('96be2828-c998-5251-82f7-4b61a77ddd3d', @pid, 'sale');

-- 15. YalaHaji Handcrafted Wooden Tasbeeh - 99 Beads  [YH-PRY-TSB-002 → prayer-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('c57c8a16-55c8-5b2f-b967-b03f48a1f69f',
   'handcrafted-wooden-tasbeeh-99-beads',
   'YH-PRY-TSB-002',
   'YalaHaji Handcrafted Wooden Tasbeeh - 99 Beads',
   'یالا حاجی دستکاری لکڑی کی تسبیح — 99 دانے',
   'مسبحة خشبية يدوية الصنع من يالا حاجي — 99 حبّة',
   'Hand-strung from rosewood beads with a smooth, natural finish, this 99-bead tasbeeh is comfortable to hold through extended dhikr sessions. A durable tassel and reinforced cord ensure it lasts well beyond the journey.',
   'شیشم کے دانوں سے ہاتھ سے پروئی گئی اور ہموار، قدرتی فنش کے ساتھ، 99 دانوں والی یہ تسبیح طویل ذکر کے دوران پکڑنے میں آرام دہ ہے۔ مضبوط پھندنا اور تقویت یافتہ ڈوری اسے سفر کے بعد بھی برسوں چلنے کے قابل بناتی ہے۔',
   'منظومة يدويًا من حبّات خشب الورد بلمسة نهائية ناعمة وطبيعية، هذه المسبحة ذات الـ 99 حبّة مريحة في الإمساك خلال جلسات الذكر الطويلة. الشرّابة المتينة والخيط المقوّى يضمنان بقاءها لما بعد الرحلة بكثير.',
   'Premium rosewood tasbeeh with smooth, hand-polished beads for daily dhikr.',
   'روزانہ ذکر کے لیے پریمیم شیشم کی تسبیح، ہموار اور ہاتھ سے پالش کیے گئے دانوں کے ساتھ۔',
   'مسبحة من خشب الورد الفاخر بحبّات ناعمة مصقولة يدويًا للذكر اليومي.',
   @cat_prayer_accessories,
   0,
   1,
   0,
   'Wooden Tasbeeh 99 Beads Pakistan | YalaHaji',
   'Shop the handcrafted rosewood 99-bead tasbeeh. Smooth finish, durable cord. Perfect for daily dhikr or as a gift.',
   'Wooden Tasbeeh 99 Beads Pakistan | YalaHaji',
   'لکڑی کی تسبیح 99 دانے پاکستان | یالا حاجی',
   'مسبحة خشبية 99 حبّة في باكستان | يالا حاجي',
   'Shop the handcrafted rosewood 99-bead tasbeeh. Smooth finish, durable cord. Perfect for daily dhikr or as a gift.',
   'دستکاری شیشم کی 99 دانوں والی تسبیح خریدیں۔ ہموار فنش، مضبوط ڈوری۔ روزانہ ذکر یا تحفے کے لیے بہترین۔',
   'تسوّق المسبحة اليدوية من خشب الورد بـ 99 حبّة. لمسة ناعمة وخيط متين. مثالية للذكر اليومي أو كهدية.',
   'tasbeeh, dhikr beads, rosewood tasbeeh, 99 bead tasbih, wooden misbaha, tasbeeh pakistan',
   'تسبیح, ذکر کے دانے, شیشم تسبیح, 99 دانے تسبیح, لکڑی کی تسبیح, تسبیح پاکستان',
   'مسبحة, حبّات الذكر, مسبحة خشب الورد, مسبحة 99 حبّة, مسبحة خشبية, سبحة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-PRY-TSB-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('54e5605a-d8ea-54d8-a662-cb6c26ed36f6', @pid, 'YH-PRY-TSB-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   79900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-PRY-TSB-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('09c8ce98-fd15-59d1-90d2-4220a45812c8', @pid, 'tasbeeh'),
  ('7461f676-b064-5a2f-a141-72dc35feb574', @pid, 'dhikr beads'),
  ('0f14ad12-aefb-560e-a7a6-f8851f513304', @pid, 'rosewood tasbeeh');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 16. YalaHaji Digital Tasbeeh Counter - 7 Round Tally  [YH-PRY-TAW-003 → prayer-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('d4bf2151-9bac-5183-ac95-b2791afdc11f',
   'digital-tasbeeh-counter-7-round-tally',
   'YH-PRY-TAW-003',
   'YalaHaji Digital Tasbeeh Counter - 7 Round Tally',
   'یالا حاجی ڈیجیٹل تسبیح کاؤنٹر — 7 چکر شمار',
   'عدّاد المسبحة الرقمي من يالا حاجي — إحصاء 7 أشواط',
   'Never lose count during Tawaf or Sa''i again. This compact digital tasbeeh counter features a large, easy-to-read display and a dedicated 7-round tally mode, with a soft wrist strap for hands-free carrying.',
   'طواف یا سعی کے دوران دوبارہ کبھی شمار نہ بھولیں۔ اس کمپیکٹ ڈیجیٹل تسبیح کاؤنٹر میں بڑی، آسانی سے پڑھی جانے والی ڈسپلے اور 7 چکروں کے شمار کے لیے مخصوص موڈ شامل ہے، ساتھ ہی ہاتھ آزاد رکھنے کے لیے نرم کلائی پٹا بھی۔',
   'لن تفقد العدّ مرة أخرى أثناء الطواف أو السعي. يتميّز عدّاد المسبحة الرقمي الصغير هذا بشاشة كبيرة سهلة القراءة ووضع مخصّص لإحصاء 7 أشواط، مع سوار معصم ناعم لحمله دون استخدام اليدين.',
   'Compact digital tally counter for tracking Tawaf and Sa''i rounds accurately.',
   'طواف اور سعی کے چکر درست طور پر گننے کے لیے کمپیکٹ ڈیجیٹل کاؤنٹر۔',
   'عدّاد رقمي صغير لإحصاء أشواط الطواف والسعي بدقّة.',
   @cat_prayer_accessories,
   0,
   1,
   0,
   'Digital Tasbeeh Counter for Tawaf | YalaHaji',
   'Shop the digital 7-round tally tasbeeh counter, purpose-built for Tawaf and Sa''i. Order online from YalaHaji.',
   'Digital Tasbeeh Counter for Tawaf | YalaHaji',
   'طواف کے لیے ڈیجیٹل تسبیح کاؤنٹر | یالا حاجی',
   'عدّاد مسبحة رقمي للطواف | يالا حاجي',
   'Shop the digital 7-round tally tasbeeh counter, purpose-built for Tawaf and Sa''i. Order online from YalaHaji.',
   'طواف اور سعی کے لیے خاص طور پر بنایا گیا ڈیجیٹل 7 چکر شمار تسبیح کاؤنٹر خریدیں۔ یالا حاجی سے آن لائن آرڈر کریں۔',
   'تسوّق عدّاد المسبحة الرقمي لإحصاء 7 أشواط، المصمّم خصيصًا للطواف والسعي. اطلبه أونلاين من يالا حاجي.',
   'tawaf counter, digital tasbeeh, sa''i counter, hajj counter, umrah round counter, finger tasbeeh',
   'طواف کاؤنٹر, ڈیجیٹل تسبیح, سعی کاؤنٹر, حج کاؤنٹر, عمرہ چکر کاؤنٹر, انگلی تسبیح',
   'عدّاد الطواف, مسبحة رقمية, عدّاد السعي, عدّاد الحج, عدّاد أشواط العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-PRY-TAW-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('52e7839f-e708-5108-a47b-3f74f256bf7b', @pid, 'YH-PRY-TAW-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   59900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-PRY-TAW-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('d6e5a4fd-0c23-53e9-867f-5645c96dba54', @pid, 'tawaf counter'),
  ('e0936366-6825-5080-a4d7-d689c173e0a4', @pid, 'digital tasbeeh'),
  ('379c311d-0f3f-5115-a366-6aa8738a5510', @pid, 'sa''i counter');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 17. YalaHaji Embroidered Prayer Cap (Topi) - White  [YH-PRY-CAP-004 → prayer-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('805fdc54-c083-56a2-8809-d5428f041809',
   'embroidered-prayer-cap-topi-white',
   'YH-PRY-CAP-004',
   'YalaHaji Embroidered Prayer Cap (Topi) - White',
   'یالا حاجی کڑھائی والی نماز ٹوپی — سفید',
   'طاقية الصلاة المطرّزة من يالا حاجي — أبيض',
   'This finely embroidered cotton prayer cap combines comfort with traditional detailing. The breathable weave keeps the head cool during long prayers, and the one-size design fits most adult head sizes comfortably.',
   'باریک کڑھائی والی یہ کاٹن نماز ٹوپی آرام کو روایتی تفصیل کے ساتھ جوڑتی ہے۔ ہوادار بُنائی لمبی نمازوں کے دوران سر کو ٹھنڈا رکھتی ہے، اور ایک سائز کا ڈیزائن بالغوں کے اکثر سر کے ناپ پر آرام سے فٹ آتا ہے۔',
   'تجمع طاقية الصلاة القطنية المطرّزة بدقّة بين الراحة والتفاصيل التقليدية. النسيج القابل للتنفّس يُبقي الرأس منتعشًا خلال الصلوات الطويلة، والتصميم بمقاس واحد يناسب معظم مقاسات رؤوس البالغين بارتياح.',
   'Breathable cotton prayer cap with fine embroidery detailing, one-size-fits-most.',
   'باریک کڑھائی کی تفصیل کے ساتھ ہوادار کاٹن نماز ٹوپی، ایک سائز جو اکثر کو فٹ آئے۔',
   'طاقية صلاة قطنية قابلة للتنفّس بتطريز دقيق، بمقاس واحد يناسب معظم الرؤوس.',
   @cat_prayer_accessories,
   0,
   1,
   0,
   'Embroidered Prayer Cap Pakistan | YalaHaji',
   'Shop the breathable embroidered cotton prayer cap (topi) in white. Comfortable, traditional design.',
   'Embroidered Prayer Cap Pakistan | YalaHaji',
   'کڑھائی والی نماز ٹوپی پاکستان | یالا حاجی',
   'طاقية صلاة مطرّزة في باكستان | يالا حاجي',
   'Shop the breathable embroidered cotton prayer cap (topi) in white. Comfortable, traditional design.',
   'سفید رنگ میں ہوادار کڑھائی والی کاٹن نماز ٹوپی خریدیں۔ آرام دہ، روایتی ڈیزائن۔',
   'تسوّق طاقية الصلاة القطنية المطرّزة القابلة للتنفّس باللون الأبيض. تصميم تقليدي مريح.',
   'prayer cap, topi, islamic cap, namaz topi, white prayer cap pakistan, embroidered kufi',
   'نماز ٹوپی, ٹوپی, اسلامی ٹوپی, سفید نماز ٹوپی پاکستان, کڑھائی والی ٹوپی',
   'طاقية صلاة, طاقية, كوفية إسلامية, طاقية بيضاء, طاقية مطرّزة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-PRY-CAP-004');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('8717b867-ea33-5696-aca1-4c785d7070a1', @pid, 'YH-PRY-CAP-004-STD', 'Standard', NULL, NULL, NULL, NULL,
   69900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-PRY-CAP-004-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('ff371d8b-a040-5eff-aa42-bac3f2f349b0', @pid, 'prayer cap'),
  ('c06e618c-592c-57d1-b313-32dbfbde370e', @pid, 'topi'),
  ('5f7d206b-7fd0-51e8-9b7c-0e51b5411af9', @pid, 'islamic cap');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 18. YalaHaji Royal Oud Attar - 12ml  [YH-FRG-OUD-001 → fragrances]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('ed3bfaab-86ae-5c0d-bd69-4ab06c2ed8e8',
   'royal-oud-attar-12ml',
   'YH-FRG-OUD-001',
   'YalaHaji Royal Oud Attar - 12ml',
   'یالا حاجی رائل عود عطر — 12 ملی لیٹر',
   'عطر العود الملكي من يالا حاجي — 12 مل',
   'A deep, warm woody fragrance with smoky oud at its heart, this alcohol-free attar is halal-compliant and long-lasting on skin. Presented in an elegant roll-on glass bottle, it''s a signature scent for Ihram and everyday wear alike.',
   'گہری، گرم لکڑی جیسی خوشبو جس کے مرکز میں دھواں دار عود ہے — یہ الکوحل فری عطر حلال کے مطابق اور جِلد پر دیرپا ہے۔ خوبصورت رول آن شیشے کی بوتل میں پیش کیا گیا، یہ احرام اور روزمرہ دونوں کے لیے ایک مخصوص خوشبو ہے۔',
   'عبير خشبي دافئ وعميق يتصدّره العود الدخاني، وهذا العطر الخالي من الكحول موافق للحلال وطويل الثبات على البشرة. يأتي في زجاجة أنيقة بكرة دوّارة، وهو عطر مميّز للإحرام وللاستخدام اليومي على السواء.',
   'Rich, long-lasting alcohol-free oud attar with warm woody notes.',
   'گرم لکڑی کے نوٹس کے ساتھ بھرپور، دیرپا اور الکوحل فری عود عطر۔',
   'عطر عود غني وطويل الثبات خالٍ من الكحول بنفحات خشبية دافئة.',
   @cat_fragrances,
   0,
   1,
   0,
   'Royal Oud Attar Alcohol-Free | YalaHaji',
   'Shop the Royal Oud Attar — alcohol-free, long-lasting, halal-compliant. 12ml roll-on. Order from YalaHaji.',
   'Royal Oud Attar Alcohol-Free | YalaHaji',
   'رائل عود عطر الکوحل فری | یالا حاجی',
   'عطر العود الملكي خالٍ من الكحول | يالا حاجي',
   'Shop the Royal Oud Attar — alcohol-free, long-lasting, halal-compliant. 12ml roll-on. Order from YalaHaji.',
   'رائل عود عطر خریدیں — الکوحل فری، دیرپا، حلال کے مطابق۔ 12 ملی لیٹر رول آن۔ یالا حاجی سے آرڈر کریں۔',
   'تسوّق عطر العود الملكي — خالٍ من الكحول وطويل الثبات وموافق للحلال. 12 مل بكرة دوّارة. اطلبه من يالا حاجي.',
   'oud attar, alcohol free perfume, ihram fragrance, halal attar pakistan, roll on attar, 12ml oud',
   'عود عطر, الکوحل فری خوشبو, احرام کی خوشبو, حلال عطر پاکستان, رول آن عطر, 12 ملی عود',
   'عطر عود, عطر خالٍ من الكحول, عطر الإحرام, عطر حلال, عطر بكرة دوّارة, عود 12 مل',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-FRG-OUD-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('5a9d657f-6e48-51bb-a516-9c4d5272e558', @pid, 'YH-FRG-OUD-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   129900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-FRG-OUD-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('499185b3-6ba5-592a-9fcd-3e8aae0986b4', @pid, 'oud attar'),
  ('44f2382d-7709-5f4a-b40c-572b48e7c1db', @pid, 'alcohol free perfume'),
  ('086c4646-c53e-59f3-842a-916dc0aa97bb', @pid, 'ihram fragrance');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 19. YalaHaji White Musk Attar - 12ml  [YH-FRG-MSK-002 → fragrances]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('c1756e06-dfa0-55b4-9092-4594c993e850',
   'white-musk-attar-12ml',
   'YH-FRG-MSK-002',
   'YalaHaji White Musk Attar - 12ml',
   'یالا حاجی وائٹ مشک عطر — 12 ملی لیٹر',
   'عطر المسك الأبيض من يالا حاجي — 12 مل',
   'Light and powdery with a soft skin-like finish, White Musk is a favourite among pilgrims for its gentle, non-overpowering scent — ideal for wear during Ihram when strong fragrances are discouraged after entering the state of Ihram, and perfect for daily use before or after.',
   'ہلکی اور پاؤڈری، جِلد جیسی نرم فنش کے ساتھ، وائٹ مشک اپنی ملائم اور غیر بھاری خوشبو کی وجہ سے حاجیوں میں پسندیدہ ہے — احرام کے دوران پہننے کے لیے موزوں، جبکہ حالتِ احرام میں داخل ہونے کے بعد تیز خوشبوؤں سے گریز کیا جاتا ہے، اور اس سے پہلے یا بعد میں روزمرہ استعمال کے لیے بہترین۔',
   'خفيف وبودري بلمسة نهائية ناعمة قريبة من رائحة البشرة، المسك الأبيض مفضّل لدى الحجاج لعبيره اللطيف غير الطاغي — مناسب للاستخدام في فترة الإحرام، حيث يُتجنّب استعمال العطور القوية بعد الدخول في الإحرام، ومثالي للاستخدام اليومي قبله أو بعده.',
   'Clean, soft musk fragrance perfect for sensitive skin during Ihram.',
   'صاف، نرم مشک خوشبو جو احرام کے دوران حساس جِلد کے لیے بہترین ہے۔',
   'عطر مسك نقي وناعم مثالي للبشرة الحسّاسة أثناء الإحرام.',
   @cat_fragrances,
   0,
   1,
   0,
   'White Musk Attar Pakistan | YalaHaji',
   'Shop the soft, alcohol-free White Musk Attar. Gentle scent ideal for sensitive skin. 12ml roll-on.',
   'White Musk Attar Pakistan | YalaHaji',
   'وائٹ مشک عطر پاکستان | یالا حاجی',
   'عطر المسك الأبيض في باكستان | يالا حاجي',
   'Shop the soft, alcohol-free White Musk Attar. Gentle scent ideal for sensitive skin. 12ml roll-on.',
   'نرم، الکوحل فری وائٹ مشک عطر خریدیں۔ ملائم خوشبو جو حساس جِلد کے لیے مثالی ہے۔ 12 ملی لیٹر رول آن۔',
   'تسوّق عطر المسك الأبيض الناعم الخالي من الكحول. عبير لطيف مثالي للبشرة الحسّاسة. 12 مل بكرة دوّارة.',
   'white musk, musk attar, alcohol free attar, sensitive skin perfume, ihram safe attar, 12ml musk',
   'وائٹ مشک, مشک عطر, الکوحل فری عطر, حساس جِلد کی خوشبو, احرام کے لیے عطر, 12 ملی مشک',
   'مسك أبيض, عطر مسك, عطر خالٍ من الكحول, عطر للبشرة الحسّاسة, عطر آمن للإحرام',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-FRG-MSK-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('93e65f8c-5dc4-5288-976f-55ba4cdf6ff9', @pid, 'YH-FRG-MSK-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   109900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-FRG-MSK-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('45f47b56-f139-5178-97c5-42f3d6dbc0d2', @pid, 'white musk'),
  ('d266a25e-f5c5-5552-9a9a-e31839f1a9ac', @pid, 'musk attar'),
  ('4d8b3642-83a6-5164-89c6-185c1c7e5ab0', @pid, 'alcohol free attar');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 20. YalaHaji Attar Gift Set - 3 Signature Scents  [YH-FRG-SET-003 → fragrances]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('237fb7a5-56be-5d48-8a5f-87843a03f058',
   'attar-gift-set-3-signature-scents',
   'YH-FRG-SET-003',
   'YalaHaji Attar Gift Set - 3 Signature Scents',
   'یالا حاجی عطر گفٹ سیٹ — 3 مخصوص خوشبوئیں',
   'طقم هدايا العطور من يالا حاجي — 3 عطور مميّزة',
   'This gift-boxed trio pairs our three signature attars — Royal Oud, White Musk, and Golden Amber — for a complete fragrance wardrobe. Beautifully packaged, it''s a popular after-Umrah gift for family and friends.',
   'گفٹ باکس میں پیش کی گئی یہ تینوں کی جوڑی ہمارے تین مخصوص عطر — رائل عود، وائٹ مشک اور گولڈن عنبر — یکجا کرتی ہے تاکہ خوشبو کا مکمل ذخیرہ بن جائے۔ خوبصورت پیکنگ کے ساتھ، یہ عمرہ کے بعد اہلِ خانہ اور دوستوں کے لیے مقبول تحفہ ہے۔',
   'تجمع هذه الثلاثية المعبّأة في علبة هدايا عطورنا المميّزة الثلاثة — العود الملكي والمسك الأبيض والعنبر الذهبي — لتشكّل خزانة عطور متكاملة. بتغليف أنيق، وهي هدية شائعة بعد العمرة للأهل والأصدقاء.',
   'Curated trio of Oud, Musk & Amber attars in a premium gift box.',
   'پریمیم گفٹ باکس میں عود، مشک اور عنبر عطروں کی منتخب تینوں کی جوڑی۔',
   'ثلاثية منتقاة من عطور العود والمسك والعنبر في علبة هدايا فاخرة.',
   @cat_fragrances,
   0,
   1,
   0,
   'Attar Gift Set Pakistan | YalaHaji',
   'Shop the YalaHaji 3-piece Attar Gift Set — Oud, Musk & Amber. Beautifully boxed, perfect Umrah gift.',
   'Attar Gift Set Pakistan | YalaHaji',
   'عطر گفٹ سیٹ پاکستان | یالا حاجی',
   'طقم هدايا العطور في باكستان | يالا حاجي',
   'Shop the YalaHaji 3-piece Attar Gift Set — Oud, Musk & Amber. Beautifully boxed, perfect Umrah gift.',
   'یالا حاجی کا 3 عطروں کا گفٹ سیٹ خریدیں — عود، مشک اور عنبر۔ خوبصورت باکس میں، عمرہ کا بہترین تحفہ۔',
   'تسوّق طقم هدايا العطور من 3 قطع من يالا حاجي — عود ومسك وعنبر. بعلبة أنيقة، هدية عمرة مثالية.',
   'attar gift set, perfume gift box, umrah gift, oud musk amber set, islamic gift pakistan',
   'عطر گفٹ سیٹ, پرفیوم گفٹ باکس, عمرہ تحفہ, عود مشک عنبر سیٹ, اسلامی تحفہ پاکستان',
   'طقم هدايا عطور, علبة عطور هدية, هدية العمرة, طقم عود ومسك وعنبر, هدية إسلامية',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-FRG-SET-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('c376044f-29b8-52a5-8655-c4ea8fa61eec', @pid, 'YH-FRG-SET-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   249900, 299900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-FRG-SET-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('63cb4e45-75a6-5960-a40d-0a92c2f9f8ed', @pid, 'attar gift set'),
  ('ce2d46d8-b74e-5152-b4d0-a5b610eccea1', @pid, 'perfume gift box'),
  ('ac47e5a2-1c50-51b7-b68b-01268a552254', @pid, 'umrah gift');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('dc4de12a-555f-5ec8-b274-57efae60e1a6', @pid, 'sale');

-- 21. YalaHaji Premium Ajwa Dates Box - 500g  [YH-GFT-DTS-001 → gifts]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('f20a3081-9341-5272-a17f-cfa735a91a21',
   'premium-ajwa-dates-box-500g',
   'YH-GFT-DTS-001',
   'YalaHaji Premium Ajwa Dates Box - 500g',
   'یالا حاجی پریمیم عجوہ کھجور باکس — 500 گرام',
   'علبة تمر العجوة الفاخر من يالا حاجي — 500 غرام',
   'Sourced and hand-sorted for size and freshness, these Ajwa dates arrive in a premium presentation box that''s ready to gift straight from your suitcase. A cherished after-return gift rooted in Sunnah tradition.',
   'سائز اور تازگی کی بنیاد پر منتخب اور ہاتھ سے چھانٹی گئی، یہ عجوہ کھجوریں ایک پریمیم پیشکش باکس میں آتی ہیں جو سیدھا آپ کے سوٹ کیس سے تحفہ دینے کے لیے تیار ہے۔ سنت کی روایت سے جُڑا ایک قدر کی نگاہ سے دیکھا جانے والا واپسی کا تحفہ۔',
   'مُنتقى ومفروز يدويًا بحسب الحجم والطزاجة، يأتي تمر العجوة هذا في علبة تقديم فاخرة جاهزة للإهداء مباشرة من حقيبتك. هدية عودة عزيزة متجذّرة في السنّة النبوية.',
   'Hand-selected Ajwa dates from Madinah, packed in a premium gift box.',
   'مدینہ منورہ سے ہاتھ سے چُنی گئی عجوہ کھجوریں، پریمیم گفٹ باکس میں پیک۔',
   'تمر عجوة منتقى يدويًا من المدينة المنورة، معبّأ في علبة هدايا فاخرة.',
   @cat_gifts,
   0,
   1,
   0,
   'Ajwa Dates Gift Box Pakistan | YalaHaji',
   'Shop premium hand-selected Ajwa dates, 500g gift box. Fresh, authentic, and beautifully packaged.',
   'Ajwa Dates Gift Box Pakistan | YalaHaji',
   'عجوہ کھجور گفٹ باکس پاکستان | یالا حاجی',
   'علبة هدايا تمر العجوة في باكستان | يالا حاجي',
   'Shop premium hand-selected Ajwa dates, 500g gift box. Fresh, authentic, and beautifully packaged.',
   'پریمیم ہاتھ سے چُنی گئی عجوہ کھجوریں، 500 گرام گفٹ باکس خریدیں۔ تازہ، اصلی اور خوبصورت پیکنگ میں۔',
   'تسوّق تمر العجوة الفاخر المنتقى يدويًا في علبة هدايا 500 غرام. طازج وأصلي وبتغليف أنيق.',
   'ajwa dates, dates gift box, madinah dates, ajwa khajoor pakistan, 500g ajwa, umrah return gift',
   'عجوہ کھجور, کھجور گفٹ باکس, مدینہ کھجور, عجوہ کھجور پاکستان, 500 گرام عجوہ, عمرہ واپسی تحفہ',
   'تمر العجوة, علبة تمر هدية, تمر المدينة, عجوة 500 غرام, هدية العودة من العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-GFT-DTS-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('3553dc3b-f374-515d-88e4-78d75ea3f348', @pid, 'YH-GFT-DTS-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   279900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-GFT-DTS-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('3f8a0aaa-c3ad-5c54-9552-6a5c62f408e8', @pid, 'ajwa dates'),
  ('a1d1b3ec-51e1-5362-b378-e91e82409dfb', @pid, 'dates gift box'),
  ('95269212-b816-59ca-88d1-2c88f781ce21', @pid, 'madinah dates');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 22. YalaHaji Zamzam Water - 5 Litre  [YH-GFT-ZAM-002 → gifts]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('0240326c-450b-5e14-add9-f07c0965685d',
   'zamzam-water-5-litre',
   'YH-GFT-ZAM-002',
   'YalaHaji Zamzam Water - 5 Litre',
   'یالا حاجی آبِ زم زم — 5 لیٹر',
   'ماء زمزم من يالا حاجي — 5 لتر',
   'Bringing home authentic Zamzam water is a meaningful part of the pilgrimage tradition. Our 5-litre containers are sealed for freshness and safety, delivered securely to your doorstep anywhere in Pakistan.',
   'اصلی آبِ زم زم گھر لانا سفرِ حج و عمرہ کی روایت کا ایک بامعنی حصہ ہے۔ ہمارے 5 لیٹر کے کنٹینر تازگی اور حفاظت کے لیے سیل بند کیے جاتے ہیں، اور پاکستان میں کہیں بھی محفوظ طریقے سے آپ کی دہلیز تک پہنچائے جاتے ہیں۔',
   'إحضار ماء زمزم الأصلي إلى البيت جزء ذو معنى من تقاليد الحج والعمرة. عبواتنا سعة 5 لتر مختومة للحفاظ على الطزاجة والسلامة، وتُوصَّل بأمان إلى باب منزلك في أي مكان داخل باكستان.',
   'Authentic Zamzam water sourced and sealed for safe delivery across Pakistan.',
   'اصلی آبِ زم زم، پاکستان بھر میں محفوظ ترسیل کے لیے حاصل اور سیل بند کیا گیا۔',
   'ماء زمزم أصلي مُستجلب ومختوم لتوصيل آمن في كل أنحاء باكستان.',
   @cat_gifts,
   0,
   1,
   0,
   'Zamzam Water 5 Litre Pakistan | YalaHaji',
   'Order authentic sealed Zamzam water, 5 litre container, delivered safely across Pakistan.',
   'Zamzam Water 5 Litre Pakistan | YalaHaji',
   'آبِ زم زم 5 لیٹر پاکستان | یالا حاجی',
   'ماء زمزم 5 لتر في باكستان | يالا حاجي',
   'Order authentic sealed Zamzam water, 5 litre container, delivered safely across Pakistan.',
   'اصلی سیل بند آبِ زم زم، 5 لیٹر کنٹینر آرڈر کریں، پاکستان بھر میں محفوظ ڈیلیوری۔',
   'اطلب ماء زمزم الأصلي المختوم في عبوة 5 لتر، مع توصيل آمن في كل أنحاء باكستان.',
   'zamzam water, zamzam 5 litre, holy water pakistan, umrah gift, buy zamzam online',
   'آبِ زم زم, زم زم 5 لیٹر, مقدس پانی پاکستان, عمرہ تحفہ, زم زم آن لائن خریدیں',
   'ماء زمزم, زمزم 5 لتر, ماء مبارك, هدية العمرة, شراء زمزم أونلاين',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-GFT-ZAM-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('d6e6db1f-233c-5e53-a89c-ef085c71c7bb', @pid, 'YH-GFT-ZAM-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   349900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-GFT-ZAM-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('b31b174d-ef87-5c36-bef6-0e76ce6b7444', @pid, 'zamzam water'),
  ('0db2254f-7f5c-53f0-945c-158ab5663cfe', @pid, 'holy water'),
  ('af8722cb-9c87-5044-8a18-b3875e326d32', @pid, 'umrah gift');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 23. YalaHaji After-Return Hamper - Deluxe Edition  [YH-GFT-HMP-003 → gifts]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('6c2d8078-b527-55ee-a316-3163a2d51726',
   'after-return-hamper-deluxe-edition',
   'YH-GFT-HMP-003',
   'YalaHaji After-Return Hamper - Deluxe Edition',
   'یالا حاجی واپسی ہیمپر — ڈیلکس ایڈیشن',
   'سلّة هدايا العودة من يالا حاجي — الإصدار الفاخر',
   'This deluxe hamper combines our most-loved after-return gifts — Ajwa dates, a signature attar, handcrafted tasbeeh, and an embroidered prayer cap — presented in a reusable keepsake box. A complete, ready-to-gift package for loved ones.',
   'یہ ڈیلکس ہیمپر ہمارے سب سے پسندیدہ واپسی کے تحائف — عجوہ کھجور، ایک مخصوص عطر، دستکاری تسبیح اور کڑھائی والی نماز ٹوپی — کو یکجا کرتا ہے، جو دوبارہ استعمال ہونے والے یادگاری باکس میں پیش کیے جاتے ہیں۔ عزیزوں کے لیے ایک مکمل، تحفہ دینے کے لیے تیار پیکج۔',
   'تجمع هذه السلّة الفاخرة أحبّ هدايا العودة لدينا — تمر العجوة، وعطر مميّز، ومسبحة يدوية الصنع، وطاقية صلاة مطرّزة — مقدَّمة في علبة تذكارية قابلة لإعادة الاستخدام. حزمة متكاملة جاهزة للإهداء لمن تحب.',
   'Curated gift hamper with dates, attar, tasbeeh & prayer cap in a keepsake box.',
   'یادگاری باکس میں کھجور، عطر، تسبیح اور نماز ٹوپی پر مشتمل منتخب گفٹ ہیمپر۔',
   'سلّة هدايا منسّقة تضم التمر والعطر والمسبحة وطاقية الصلاة في علبة تذكارية.',
   @cat_gifts,
   0,
   1,
   0,
   'Umrah Return Gift Hamper | YalaHaji Deluxe',
   'Shop the YalaHaji Deluxe After-Return Hamper — dates, attar, tasbeeh & prayer cap in one gift box.',
   'Umrah Return Gift Hamper | YalaHaji Deluxe',
   'عمرہ واپسی گفٹ ہیمپر | یالا حاجی ڈیلکس',
   'سلّة هدايا العودة من العمرة | يالا حاجي',
   'Shop the YalaHaji Deluxe After-Return Hamper — dates, attar, tasbeeh & prayer cap in one gift box.',
   'یالا حاجی ڈیلکس واپسی ہیمپر خریدیں — کھجور، عطر، تسبیح اور نماز ٹوپی ایک گفٹ باکس میں۔',
   'تسوّق سلّة العودة الفاخرة من يالا حاجي — تمر وعطر ومسبحة وطاقية صلاة في علبة هدايا واحدة.',
   'umrah gift hamper, after return gift, hajj gift box, islamic gift hamper pakistan, deluxe gift set',
   'عمرہ گفٹ ہیمپر, واپسی کا تحفہ, حج گفٹ باکس, اسلامی گفٹ ہیمپر پاکستان, ڈیلکس گفٹ سیٹ',
   'سلّة هدايا العمرة, هدية العودة, علبة هدايا الحج, سلّة هدايا إسلامية, طقم هدايا فاخر',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-GFT-HMP-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('7e8935bf-d9c5-586e-a1b2-2d31aebbb86f', @pid, 'YH-GFT-HMP-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   499900, 599900, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-GFT-HMP-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('fab8cf08-6a86-5714-9c7a-7f8d9fa39571', @pid, 'umrah gift hamper'),
  ('38432ee9-c87f-54bd-9199-5aad22a482b8', @pid, 'after return gift'),
  ('96371c82-0453-5c7a-8109-6c6f07699fe4', @pid, 'hajj gift box');

DELETE FROM `product_badges` WHERE `productId` = @pid;

INSERT INTO `product_badges` (`id`, `productId`, `badge`) VALUES
  ('1e893bfc-9058-5450-89cb-1693b64c73a8', @pid, 'sale');

-- 24. YalaHaji Waterproof Shoe Bag - Set of 2  [YH-TRV-BAG-001 → travel-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('f57e9ed7-4d36-5c3b-bb55-157099384617',
   'waterproof-shoe-bag-set-of-2',
   'YH-TRV-BAG-001',
   'YalaHaji Waterproof Shoe Bag - Set of 2',
   'یالا حاجی واٹرپروف شو بیگ — 2 کا سیٹ',
   'كيس أحذية مقاوم للماء من يالا حاجي — طقم من 2',
   'Keep shoes separate and clean with this set of two waterproof drawstring shoe bags, generously sized to fit most footwear. Ideal for daily mosque visits where shoes must be removed and carried.',
   'دو واٹرپروف ڈرا اسٹرنگ شو بیگز کے اس سیٹ کے ساتھ جوتے الگ اور صاف رکھیں، جو کشادہ سائز میں ہیں تاکہ اکثر جوتے آ جائیں۔ مسجد کی روزانہ حاضری کے لیے مثالی، جہاں جوتے اُتار کر ساتھ رکھنے پڑتے ہیں۔',
   'حافظ على أحذيتك منفصلة ونظيفة مع هذا الطقم من كيسَي أحذية مقاومَين للماء برباط، بمقاس واسع يتّسع لمعظم الأحذية. مثالي لزيارات المسجد اليومية حيث يلزم خلع الحذاء وحمله.',
   'Spacious, waterproof drawstring shoe bags for Haram visits and travel.',
   'حرم کی حاضری اور سفر کے لیے کشادہ، واٹرپروف ڈرا اسٹرنگ شو بیگز۔',
   'أكياس أحذية واسعة مقاومة للماء برباط، لزيارات الحرم والسفر.',
   @cat_travel_accessories,
   0,
   1,
   0,
   'Waterproof Shoe Bag for Umrah Hajj | YalaHaji',
   'Shop the spacious waterproof shoe bag set — perfect for Haram visits and travel. Order online from YalaHaji.',
   'Waterproof Shoe Bag for Umrah Hajj | YalaHaji',
   'عمرہ و حج کے لیے واٹرپروف شو بیگ | یالا حاجی',
   'كيس أحذية مقاوم للماء للعمرة والحج | يالا حاجي',
   'Shop the spacious waterproof shoe bag set — perfect for Haram visits and travel. Order online from YalaHaji.',
   'کشادہ واٹرپروف شو بیگ سیٹ خریدیں — حرم کی حاضری اور سفر کے لیے بہترین۔ یالا حاجی سے آن لائن آرڈر کریں۔',
   'تسوّق طقم أكياس الأحذية الواسعة المقاومة للماء — مثالي لزيارات الحرم والسفر. اطلبه أونلاين من يالا حاجي.',
   'shoe bag, umrah accessories, mosque shoe bag, waterproof shoe pouch, haram shoe bag pakistan',
   'شو بیگ, عمرہ لوازمات, مسجد شو بیگ, واٹرپروف شو پاؤچ, حرم شو بیگ پاکستان',
   'كيس أحذية, مستلزمات العمرة, كيس أحذية للمسجد, كيس مقاوم للماء, كيس أحذية الحرم',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-TRV-BAG-001');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('b1d5365d-130f-538b-87be-a85bb87f4c26', @pid, 'YH-TRV-BAG-001-STD', 'Standard', NULL, NULL, NULL, NULL,
   59900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-TRV-BAG-001-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('6608743a-c7f1-5126-9d1a-1e710beeda93', @pid, 'shoe bag'),
  ('ca310f99-4f4c-5baf-8c95-1ea4ad492180', @pid, 'umrah accessories'),
  ('3b1cbab5-3092-5708-827e-0dce1c946779', @pid, 'mosque shoe bag');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 25. YalaHaji Hands-Free Head Umbrella  [YH-TRV-UMB-002 → travel-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('3fbf5d77-774e-53b1-bf99-deb96e20f22c',
   'hands-free-head-umbrella',
   'YH-TRV-UMB-002',
   'YalaHaji Hands-Free Head Umbrella',
   'یالا حاجی ہینڈز فری ہیڈ چھتری',
   'مظلّة الرأس بلا استخدام اليدين من يالا حاجي',
   'Designed for the long hours pilgrims spend outdoors, this hands-free head umbrella straps on comfortably and pivots to block sun or rain, leaving both hands free for tasbeeh, luggage, or holding a child''s hand.',
   'حاجیوں کے کھلے میں گزارے جانے والے طویل گھنٹوں کے لیے تیار کی گئی، یہ ہینڈز فری ہیڈ چھتری آرام سے باندھی جاتی ہے اور دھوپ یا بارش روکنے کے لیے گھومتی ہے، جس سے دونوں ہاتھ تسبیح، سامان یا بچے کا ہاتھ تھامنے کے لیے آزاد رہتے ہیں۔',
   'مصمّمة للساعات الطويلة التي يقضيها الحجاج في الخارج، تُثبَّت مظلّة الرأس هذه بارتياح وتدور لحجب الشمس أو المطر، تاركةً كلتا اليدين حرّتين للمسبحة أو الأمتعة أو الإمساك بيد طفل.',
   'Adjustable, hands-free umbrella for sun and rain protection during outdoor prayer & Tawaf.',
   'کھلے میں نماز اور طواف کے دوران دھوپ اور بارش سے بچاؤ کے لیے ایڈجسٹ ہونے والی ہینڈز فری چھتری۔',
   'مظلّة قابلة للتعديل بلا استخدام اليدين للحماية من الشمس والمطر أثناء الصلاة في الخارج والطواف.',
   @cat_travel_accessories,
   0,
   1,
   0,
   'Hands-Free Head Umbrella Pakistan | YalaHaji',
   'Shop the adjustable hands-free head umbrella — sun & rain protection during outdoor prayer and Tawaf.',
   'Hands-Free Head Umbrella Pakistan | YalaHaji',
   'ہینڈز فری ہیڈ چھتری پاکستان | یالا حاجی',
   'مظلّة رأس بلا استخدام اليدين | يالا حاجي',
   'Shop the adjustable hands-free head umbrella — sun & rain protection during outdoor prayer and Tawaf.',
   'ایڈجسٹ ہونے والی ہینڈز فری ہیڈ چھتری خریدیں — کھلے میں نماز اور طواف کے دوران دھوپ اور بارش سے بچاؤ۔',
   'تسوّق مظلّة الرأس القابلة للتعديل بلا استخدام اليدين — حماية من الشمس والمطر أثناء الصلاة في الخارج والطواف.',
   'head umbrella, hands free umbrella, hajj sun protection, tawaf umbrella, umrah sun hat',
   'ہیڈ چھتری, ہینڈز فری چھتری, حج دھوپ سے بچاؤ, طواف چھتری, عمرہ سن پروٹیکشن',
   'مظلّة رأس, مظلّة بلا يدين, حماية من شمس الحج, مظلّة الطواف, واقي شمس العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-TRV-UMB-002');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('85fbce21-2276-590a-8384-0726b529f405', @pid, 'YH-TRV-UMB-002-STD', 'Standard', NULL, NULL, NULL, NULL,
   149900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-TRV-UMB-002-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('10126f11-634e-5380-ae59-499344600091', @pid, 'head umbrella'),
  ('aacc0a90-b104-5f55-97e0-95cb9825dc18', @pid, 'hands free umbrella'),
  ('40253be7-1e65-5c78-973d-4a3ee3699d5d', @pid, 'hajj sun protection');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 26. YalaHaji Universal Travel Adapter - 3 Pin  [YH-TRV-PLG-003 → travel-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('56b27a65-eb62-5061-a468-0e9241065a20',
   'universal-travel-adapter-3-pin',
   'YH-TRV-PLG-003',
   'YalaHaji Universal Travel Adapter - 3 Pin',
   'یالا حاجی یونیورسل ٹریول اڈاپٹر — 3 پن',
   'محوّل سفر عالمي من يالا حاجي — 3 أطراف',
   'This compact 3-pin universal adapter is pre-configured for Saudi Arabian sockets, letting you charge phones and small devices without hunting for the right converter at your hotel.',
   'یہ کمپیکٹ 3 پن یونیورسل اڈاپٹر سعودی عرب کے ساکٹس کے لیے پہلے سے ترتیب دیا گیا ہے، جس سے آپ ہوٹل میں صحیح کنورٹر ڈھونڈے بغیر فون اور چھوٹے آلات چارج کر سکتے ہیں۔',
   'هذا المحوّل العالمي الصغير بثلاثة أطراف مُهيَّأ مسبقًا للمقابس السعودية، ما يتيح لك شحن الهواتف والأجهزة الصغيرة دون البحث عن المحوّل المناسب في الفندق.',
   'Compact universal adapter compatible with Saudi Arabia''s power sockets.',
   'سعودی عرب کے بجلی کے ساکٹس کے موافق کمپیکٹ یونیورسل اڈاپٹر۔',
   'محوّل عالمي صغير متوافق مع مقابس الكهرباء في السعودية.',
   @cat_travel_accessories,
   0,
   1,
   0,
   'Travel Adapter for Saudi Arabia | YalaHaji',
   'Shop the universal 3-pin travel adapter, compatible with Saudi Arabia sockets. Order from YalaHaji.',
   'Travel Adapter for Saudi Arabia | YalaHaji',
   'سعودی عرب کے لیے ٹریول اڈاپٹر | یالا حاجی',
   'محوّل سفر للسعودية | يالا حاجي',
   'Shop the universal 3-pin travel adapter, compatible with Saudi Arabia sockets. Order from YalaHaji.',
   'یونیورسل 3 پن ٹریول اڈاپٹر خریدیں، جو سعودی عرب کے ساکٹس کے موافق ہے۔ یالا حاجی سے آرڈر کریں۔',
   'تسوّق محوّل السفر العالمي بثلاثة أطراف المتوافق مع المقابس السعودية. اطلبه من يالا حاجي.',
   'travel adapter, saudi arabia plug, umrah electronics, 3 pin adapter, hajj travel adapter',
   'ٹریول اڈاپٹر, سعودی عرب پلگ, عمرہ الیکٹرانکس, 3 پن اڈاپٹر, حج ٹریول اڈاپٹر',
   'محوّل سفر, قابس السعودية, إلكترونيات العمرة, محوّل 3 أطراف, محوّل سفر الحج',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-TRV-PLG-003');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('a466700e-1450-591d-9c9e-6cec7986da27', @pid, 'YH-TRV-PLG-003-STD', 'Standard', NULL, NULL, NULL, NULL,
   79900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-TRV-PLG-003-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('ca00c2a5-94f0-5749-9d7d-7b40e48e048a', @pid, 'travel adapter'),
  ('81ee7df7-b966-53ce-8793-8e414e66d628', @pid, 'saudi arabia plug'),
  ('5719b95c-64a9-5773-91b9-922c745eaf22', @pid, 'umrah electronics');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 27. YalaHaji Fragrance-Free Travel Toiletries Set (4x100ml)  [YH-TRV-TOI-004 → travel-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('0844bad9-9ed0-5b84-8178-87619c84375a',
   'fragrance-free-travel-toiletries-set-4x100ml',
   'YH-TRV-TOI-004',
   'YalaHaji Fragrance-Free Travel Toiletries Set (4x100ml)',
   'یالا حاجی بغیر خوشبو ٹریول ٹوائلٹریز سیٹ (4x100 ملی لیٹر)',
   'طقم مستلزمات السفر الخالي من العطر من يالا حاجي (4×100 مل)',
   'This fragrance-free toiletries set covers essential hygiene needs while respecting the restrictions of Ihram, which prohibits scented products. The travel-sized 100ml bottles are TSA-friendly and packed in a reusable pouch.',
   'یہ بغیر خوشبو ٹوائلٹریز سیٹ صفائی کی بنیادی ضروریات پوری کرتا ہے، اور ساتھ ہی احرام کی پابندیوں کا احترام بھی کرتا ہے، جن میں خوشبودار مصنوعات ممنوع ہیں۔ سفری سائز کی 100 ملی لیٹر بوتلیں TSA کے موافق ہیں اور دوبارہ استعمال ہونے والے پاؤچ میں پیک ہیں۔',
   'يلبّي طقم مستلزمات النظافة الخالي من العطر هذا الاحتياجات الأساسية مع احترام قيود الإحرام التي تمنع استعمال المنتجات المعطّرة. العبوات بحجم السفر سعة 100 مل متوافقة مع اشتراطات أمن المطارات ومعبّأة في حقيبة قابلة لإعادة الاستخدام.',
   'Unscented shampoo, face wash, hand wash & body lotion set for Ihram-safe hygiene.',
   'احرام کے لیے محفوظ صفائی کے لیے بغیر خوشبو شیمپو، فیس واش، ہینڈ واش اور باڈی لوشن سیٹ۔',
   'طقم شامبو وغسول وجه وغسول يدين ولوشن جسم خالٍ من العطر لنظافة آمنة أثناء الإحرام.',
   @cat_travel_accessories,
   0,
   1,
   0,
   'Fragrance Free Travel Toiletries Set | YalaHaji',
   'Shop the unscented 4-piece travel toiletries set — Ihram-safe, TSA-friendly. Order online from YalaHaji.',
   'Fragrance Free Travel Toiletries Set | YalaHaji',
   'بغیر خوشبو ٹریول ٹوائلٹریز سیٹ | یالا حاجی',
   'طقم مستلزمات سفر خالٍ من العطر | يالا حاجي',
   'Shop the unscented 4-piece travel toiletries set — Ihram-safe, TSA-friendly. Order online from YalaHaji.',
   'بغیر خوشبو 4 اشیاء پر مشتمل ٹریول ٹوائلٹریز سیٹ خریدیں — احرام کے لیے محفوظ، TSA کے موافق۔ یالا حاجی سے آن لائن آرڈر کریں۔',
   'تسوّق طقم مستلزمات السفر من 4 قطع الخالي من العطر — آمن للإحرام ومتوافق مع أمن المطارات. اطلبه أونلاين من يالا حاجي.',
   'toiletries set, unscented soap, ihram safe toiletries, fragrance free shampoo, umrah hygiene kit',
   'ٹوائلٹریز سیٹ, بغیر خوشبو صابن, احرام کے لیے ٹوائلٹریز, بغیر خوشبو شیمپو, عمرہ صفائی کٹ',
   'طقم مستلزمات نظافة, صابون غير معطّر, مستلزمات آمنة للإحرام, شامبو خالٍ من العطر, طقم نظافة العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-TRV-TOI-004');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('7262f01e-84ef-59af-9213-25943108bb10', @pid, 'YH-TRV-TOI-004-STD', 'Standard', NULL, NULL, NULL, NULL,
   199900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-TRV-TOI-004-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('0a451f13-d57b-5830-ada9-4431d6f07e57', @pid, 'toiletries set'),
  ('585f128b-5f64-5c95-90e3-ee16b085bcb4', @pid, 'unscented soap'),
  ('a2b4ef55-4996-5ade-9707-dd191845da15', @pid, 'ihram safe toiletries');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- 28. YalaHaji Leather Ankle Socks - Unisex  [YH-TRV-SOC-005 → travel-accessories]

INSERT INTO `products`
  (`id`, `slug`, `sku`, `nameEn`, `nameUr`, `nameAr`, `descEn`, `descUr`, `descAr`, `shortDescEn`, `shortDescUr`, `shortDescAr`, `categoryId`, `isKit`, `isActive`, `isFeatured`, `metaTitle`, `metaDesc`, `seoTitleEn`, `seoTitleUr`, `seoTitleAr`, `seoDescEn`, `seoDescUr`, `seoDescAr`, `seoKeywordsEn`, `seoKeywordsUr`, `seoKeywordsAr`, `createdAt`, `updatedAt`)
VALUES
  ('c2776d8c-3f54-5d66-8a30-3add56b68b7d',
   'leather-ankle-socks-unisex',
   'YH-TRV-SOC-005',
   'YalaHaji Leather Ankle Socks - Unisex',
   'یالا حاجی چمڑے کی ٹخنہ جرابیں — مرد و خواتین',
   'جوارب جلدية قصيرة من يالا حاجي — للجنسين',
   'These breathable leather ankle socks are a popular Ihram-compliant alternative to closed shoes, keeping feet protected on hot pavement while meeting the requirement of leaving the top of the foot uncovered.',
   'یہ ہوادار چمڑے کی ٹخنہ جرابیں بند جوتوں کا ایک مقبول اور احرام کے مطابق متبادل ہیں، جو گرم فرش پر پاؤں کو محفوظ رکھتی ہیں اور ساتھ ہی پاؤں کی اوپری سطح کھلی رکھنے کی شرط بھی پوری کرتی ہیں۔',
   'تُعدّ هذه الجوارب الجلدية القصيرة القابلة للتنفّس بديلاً شائعًا وموافقًا لأحكام الإحرام عن الأحذية المغلقة، إذ تحمي القدمين على الأرضيات الساخنة مع استيفاء شرط كشف ظهر القدم.',
   'Breathable leather ankle socks worn as Ihram-compliant footwear alternative.',
   'ہوادار چمڑے کی ٹخنہ جرابیں، جو احرام کے مطابق جوتوں کے متبادل کے طور پر پہنی جاتی ہیں۔',
   'جوارب جلدية قصيرة قابلة للتنفّس تُلبس كبديل للأحذية موافق لأحكام الإحرام.',
   @cat_travel_accessories,
   0,
   1,
   0,
   'Leather Ankle Socks for Ihram | YalaHaji',
   'Shop breathable leather ankle socks — Ihram-compliant footwear alternative for men and women.',
   'Leather Ankle Socks for Ihram | YalaHaji',
   'احرام کے لیے چمڑے کی ٹخنہ جرابیں | یالا حاجی',
   'جوارب جلدية قصيرة للإحرام | يالا حاجي',
   'Shop breathable leather ankle socks — Ihram-compliant footwear alternative for men and women.',
   'ہوادار چمڑے کی ٹخنہ جرابیں خریدیں — مردوں اور خواتین کے لیے احرام کے مطابق جوتوں کا متبادل۔',
   'تسوّق الجوارب الجلدية القصيرة القابلة للتنفّس — بديل أحذية موافق للإحرام للرجال والنساء.',
   'leather ankle socks, ihram footwear, hajj shoes, ihram socks pakistan, umrah sandals alternative',
   'چمڑے کی ٹخنہ جرابیں, احرام کے جوتے, حج جوتے, احرام جرابیں پاکستان, عمرہ چپل متبادل',
   'جوارب جلدية قصيرة, أحذية الإحرام, أحذية الحج, جوارب الإحرام, بديل صنادل العمرة',
   NOW(3),
   NOW(3))
ON DUPLICATE KEY UPDATE
  `slug` = VALUES(`slug`),
  `nameEn` = VALUES(`nameEn`),
  `nameUr` = VALUES(`nameUr`),
  `nameAr` = VALUES(`nameAr`),
  `descEn` = VALUES(`descEn`),
  `descUr` = VALUES(`descUr`),
  `descAr` = VALUES(`descAr`),
  `shortDescEn` = VALUES(`shortDescEn`),
  `shortDescUr` = VALUES(`shortDescUr`),
  `shortDescAr` = VALUES(`shortDescAr`),
  `categoryId` = VALUES(`categoryId`),
  `isKit` = VALUES(`isKit`),
  `isActive` = VALUES(`isActive`),
  `isFeatured` = VALUES(`isFeatured`),
  `metaTitle` = VALUES(`metaTitle`),
  `metaDesc` = VALUES(`metaDesc`),
  `seoTitleEn` = VALUES(`seoTitleEn`),
  `seoTitleUr` = VALUES(`seoTitleUr`),
  `seoTitleAr` = VALUES(`seoTitleAr`),
  `seoDescEn` = VALUES(`seoDescEn`),
  `seoDescUr` = VALUES(`seoDescUr`),
  `seoDescAr` = VALUES(`seoDescAr`),
  `seoKeywordsEn` = VALUES(`seoKeywordsEn`),
  `seoKeywordsUr` = VALUES(`seoKeywordsUr`),
  `seoKeywordsAr` = VALUES(`seoKeywordsAr`),
  `updatedAt` = NOW(3);

SET @pid = (SELECT `id` FROM `products` WHERE `sku` = 'YH-TRV-SOC-005');

INSERT INTO `product_variants`
  (`id`, `productId`, `sku`, `tier`, `size`, `color`, `colorHex`, `scent`,
   `price`, `compareAtPrice`, `stock`, `lowStockThreshold`, `isActive`, `createdAt`, `updatedAt`)
VALUES
  ('91873c0f-be5f-5467-bae7-2cfc920ac5bb', @pid, 'YH-TRV-SOC-005-STD', 'Standard', NULL, NULL, NULL, NULL,
   129900, NULL, 50, 10, 1, NOW(3), NOW(3))
ON DUPLICATE KEY UPDATE
  `productId` = VALUES(`productId`), `tier` = VALUES(`tier`),
  `size` = VALUES(`size`), `color` = VALUES(`color`),
  `colorHex` = VALUES(`colorHex`), `scent` = VALUES(`scent`),
  `price` = VALUES(`price`), `compareAtPrice` = VALUES(`compareAtPrice`),
  `stock` = VALUES(`stock`), `lowStockThreshold` = VALUES(`lowStockThreshold`),
  `isActive` = 1, `updatedAt` = NOW(3);

UPDATE `product_variants` SET `isActive` = 0, `updatedAt` = NOW(3)
WHERE `productId` = @pid AND `sku` <> 'YH-TRV-SOC-005-STD' AND `isActive` = 1;

DELETE FROM `product_tags` WHERE `productId` = @pid;

INSERT INTO `product_tags` (`id`, `productId`, `tag`) VALUES
  ('fad94bc4-29a4-5667-933b-affe854abc0b', @pid, 'leather ankle socks'),
  ('72fc7cbc-8308-540f-ada1-0515425fd777', @pid, 'ihram footwear'),
  ('23af82e8-a4f5-5947-b9ff-a1bae9e488d9', @pid, 'hajj shoes');

DELETE FROM `product_badges` WHERE `productId` = @pid;

-- ── Clean up the two replaced demo products ──────────────────
-- Scoped to exactly the two SKUs the seed collides on. Deliberately not run
-- across all 28: on any other product these rows would be staff's own work.
DELETE FROM `product_media`
WHERE `productId` IN (SELECT `id` FROM `products` WHERE `sku` IN ('YH-IHR-MEN-001', 'YH-FRG-OUD-001'));

DELETE FROM `size_guide_entries`
WHERE `productId` IN (SELECT `id` FROM `products` WHERE `sku` IN ('YH-IHR-MEN-001', 'YH-FRG-OUD-001'));

COMMIT;
