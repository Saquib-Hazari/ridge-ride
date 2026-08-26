-- Ridge & Ride commerce schema. Safe to run repeatedly against PostgreSQL/Neon.
-- Monetary values are stored as integer cents; inventory is tracked per sellable variant.

CREATE TABLE IF NOT EXISTS brands (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  brand_id TEXT NOT NULL REFERENCES brands(id),
  category_id TEXT NOT NULL REFERENCES categories(id),
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  short_description TEXT NOT NULL,
  description TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  compare_at_price_cents INTEGER CHECK (compare_at_price_cents IS NULL OR compare_at_price_cents >= price_cents),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  wheel_size TEXT NOT NULL,
  frame_material TEXT NOT NULL,
  travel_mm INTEGER NOT NULL CHECK (travel_mm > 0),
  brake_system TEXT NOT NULL,
  featured_rank INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS products_catalog_index
  ON products (status, category_id, featured_rank, created_at DESC);

CREATE TABLE IF NOT EXISTS product_variants (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL UNIQUE,
  color_name TEXT NOT NULL,
  color_hex CHAR(7) NOT NULL CHECK (color_hex ~ '^#[0-9A-Fa-f]{6}$'),
  frame_size TEXT NOT NULL,
  price_cents INTEGER NOT NULL CHECK (price_cents >= 0),
  stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, color_name, frame_size)
);

CREATE INDEX IF NOT EXISTS product_variants_product_index
  ON product_variants (product_id, is_active, color_name, frame_size);

CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  alt_text TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0 CHECK (sort_order >= 0),
  width INTEGER NOT NULL DEFAULT 1254 CHECK (width > 0),
  height INTEGER NOT NULL DEFAULT 1254 CHECK (height > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, variant_id, sort_order)
);

CREATE TABLE IF NOT EXISTS inventory_movements (
  id BIGSERIAL PRIMARY KEY,
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  quantity_delta INTEGER NOT NULL CHECK (quantity_delta <> 0),
  reason TEXT NOT NULL CHECK (reason IN ('seed', 'adjustment', 'reservation', 'release', 'sale', 'return')),
  reference_type TEXT,
  reference_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_profiles (
  clerk_user_id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE customer_profiles ADD COLUMN IF NOT EXISTS avatar_data_url TEXT;

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  author_clerk_user_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS blog_posts_public_index ON blog_posts (status, published_at DESC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  clerk_user_id TEXT REFERENCES customer_profiles(clerk_user_id) ON DELETE SET NULL,
  reviewer_name TEXT NOT NULL,
  reviewer_avatar_url TEXT,
  rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('pending', 'published', 'rejected')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(product_id, clerk_user_id)
);

CREATE INDEX IF NOT EXISTS reviews_product_index
  ON reviews (product_id, status, created_at DESC);

-- Tables used by the later cart, checkout, payment, and shipping implementation.
CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT,
  session_token TEXT UNIQUE,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CHECK (clerk_user_id IS NOT NULL OR session_token IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  variant_id TEXT NOT NULL REFERENCES product_variants(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(cart_id, variant_id)
);

CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  region TEXT NOT NULL,
  postal_code TEXT NOT NULL,
  country_code CHAR(2) NOT NULL,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  clerk_user_id TEXT,
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  subtotal_cents INTEGER NOT NULL CHECK (subtotal_cents >= 0),
  discount_cents INTEGER NOT NULL DEFAULT 0 CHECK (discount_cents >= 0),
  shipping_cents INTEGER NOT NULL DEFAULT 0 CHECK (shipping_cents >= 0),
  tax_cents INTEGER NOT NULL DEFAULT 0 CHECK (tax_cents >= 0),
  total_cents INTEGER NOT NULL CHECK (total_cents >= 0),
  shipping_address_id TEXT REFERENCES addresses(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_order_id TEXT UNIQUE;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS provider_payment_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  variant_id TEXT REFERENCES product_variants(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  sku TEXT NOT NULL,
  unit_price_cents INTEGER NOT NULL CHECK (unit_price_cents >= 0),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupons (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  starts_at TIMESTAMPTZ,
  ends_at TIMESTAMPTZ,
  max_redemptions INTEGER CHECK (max_redemptions > 0),
  redemption_count INTEGER NOT NULL DEFAULT 0 CHECK (redemption_count >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id TEXT PRIMARY KEY,
  coupon_id TEXT NOT NULL REFERENCES coupons(id),
  order_id TEXT NOT NULL REFERENCES orders(id),
  clerk_user_id TEXT,
  amount_cents INTEGER NOT NULL CHECK (amount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(coupon_id, order_id)
);

CREATE TABLE IF NOT EXISTS service_bookings (
  id TEXT PRIMARY KEY,
  clerk_user_id TEXT,
  customer_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  bike_model TEXT NOT NULL,
  service_type TEXT NOT NULL,
  preferred_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'confirmed', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contact_messages (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  topic TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'read', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO brands (id, name, slug, description) VALUES
  ('brand-santa-cruz', 'Santa Cruz', 'santa-cruz', 'California-built mountain bikes for demanding trail and gravity riding.'),
  ('brand-specialized', 'Specialized', 'specialized', 'Performance mountain bikes engineered around confident control.'),
  ('brand-trek', 'Trek', 'trek', 'Trail, enduro, and downhill bikes built for a broad range of riders.'),
  ('brand-yeti', 'Yeti Cycles', 'yeti-cycles', 'High-country mountain bikes with a focus on precise suspension performance.'),
  ('brand-canyon', 'Canyon', 'canyon', 'Direct-to-rider mountain bikes with modern geometry and race-ready components.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description;

INSERT INTO categories (id, name, slug, description) VALUES
  ('cat-trail', 'Trail', 'trail', 'Versatile full-suspension mountain bikes for all-day technical riding.'),
  ('cat-enduro', 'Enduro', 'enduro', 'Long-travel bikes for steep, demanding descents and capable climbs.'),
  ('cat-downhill', 'Downhill', 'downhill', 'Gravity-focused bikes for bike parks, racing, and repeated hard laps.')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, description = EXCLUDED.description;

INSERT INTO products (id, brand_id, category_id, slug, name, short_description, description, price_cents, wheel_size, frame_material, travel_mm, brake_system, featured_rank) VALUES
  ('p-hightower', 'brand-santa-cruz', 'cat-trail', 'hightower-c-x0', 'Hightower C X0', 'A composed 29er trail bike for fast, technical days.', 'A versatile long-travel 29er with a stable, confident ride and a climbing position built for all-day mountain missions.', 679900, '29 in', 'Carbon composite', 150, 'Four-piston hydraulic disc', 1),
  ('p-5010', 'brand-santa-cruz', 'cat-trail', '5010-c-s', '5010 C S', 'A playful mixed-wheel trail bike with quick direction changes.', 'A lively mixed-wheel trail platform for riders who value a responsive feel without sacrificing composure on rough terrain.', 549900, 'Mixed 29/27.5 in', 'Carbon composite', 140, 'Four-piston hydraulic disc', 2),
  ('p-nomad', 'brand-santa-cruz', 'cat-enduro', 'nomad-c-s', 'Nomad C S', 'A long-travel enduro bike designed for steep, high-speed lines.', 'A gravity-biased enduro build with confident suspension, modern reach, and the range to tackle long technical descents.', 639900, 'Mixed 29/27.5 in', 'Carbon composite', 170, 'Four-piston hydraulic disc', 3),
  ('p-v10', 'brand-santa-cruz', 'cat-downhill', 'v10-cc-x0', 'V10 CC X0', 'A race-bred downhill bike for committed park and race runs.', 'A full-gas downhill platform with dual-crown capability, durable components, and a calm ride when the course gets fast.', 899900, 'Mixed 29/27.5 in', 'Carbon composite', 215, 'Four-piston hydraulic disc', 4),
  ('p-stumpjumper', 'brand-specialized', 'cat-trail', 'stumpjumper-15-expert', 'Stumpjumper 15 Expert', 'A responsive trail bike tuned for technical, varied terrain.', 'A modern all-mountain trail bike balancing efficient pedaling with a planted, forgiving feel through rough, natural trails.', 620000, '29 in', 'Carbon composite', 145, 'Four-piston hydraulic disc', 5),
  ('p-epic-evo', 'brand-specialized', 'cat-trail', 'epic-8-evo-pro', 'Epic 8 EVO Pro', 'A lightweight downcountry bike with real trail confidence.', 'A fast, efficient 29er intended for riders who want race-day speed with enough suspension and geometry for proper singletrack.', 760000, '29 in', 'Carbon composite', 120, 'Four-piston hydraulic disc', 6),
  ('p-enduro', 'brand-specialized', 'cat-enduro', 'enduro-expert', 'Enduro Expert', 'A planted enduro platform for big mountain descents.', 'A long-travel enduro bike with a low, stable stance and suspension tuned to stay composed on sustained rough terrain.', 750000, '29 in', 'Carbon composite', 170, 'Four-piston hydraulic disc', 7),
  ('p-demo', 'brand-specialized', 'cat-downhill', 'demo-race', 'Demo Race', 'A downhill race bike with a controlled, quiet ride feel.', 'A dedicated downhill build with confidence-inspiring geometry, adjustable setup options, and components ready for hard park use.', 800000, 'Mixed 29/27.5 in', 'Carbon composite', 200, 'Four-piston hydraulic disc', 8),
  ('p-fuel-exe', 'brand-trek', 'cat-trail', 'fuel-exe-9-9', 'Fuel EXe 9.9', 'A refined light-assist trail bike for longer mountain days.', 'A premium trail bike built around natural ride handling, modern suspension, and a discreet assist system for deeper days in the mountains.', 1129999, '29 in', 'Carbon composite', 150, 'Four-piston hydraulic disc', 9),
  ('p-fuel-ex', 'brand-trek', 'cat-trail', 'fuel-ex-9-8', 'Fuel EX 9.8', 'An adaptable all-mountain bike with a capable, balanced chassis.', 'An adjustable trail bike for riders seeking a confident platform that remains fun and efficient across varied terrain.', 640000, '29 in', 'Carbon composite', 150, 'Four-piston hydraulic disc', 10),
  ('p-slash', 'brand-trek', 'cat-enduro', 'slash-9-9', 'Slash 9.9', 'A hard-charging enduro bike for rough, steep trails.', 'A long-travel enduro bike that favors stability, traction, and controlled speed when the terrain turns steep and unpredictable.', 930000, 'Mixed 29/27.5 in', 'Carbon composite', 170, 'Four-piston hydraulic disc', 11),
  ('p-session', 'brand-trek', 'cat-downhill', 'session-9-x', 'Session 9 X', 'A park-ready downhill machine with a durable gravity build.', 'A downhill bike built for riders who want dependable suspension and a stable base for lift-accessed riding and race weekends.', 590000, 'Mixed 29/27.5 in', 'Aluminum alloy', 200, 'Four-piston hydraulic disc', 12),
  ('p-sb140', 'brand-yeti', 'cat-trail', 'sb140-t3', 'SB140 T3', 'A nimble trail bike with responsive suspension and precision.', 'A compact-feeling trail bike designed to carry speed through technical terrain while retaining a useful all-day climbing position.', 850000, 'Mixed 29/27.5 in', 'Carbon composite', 140, 'Four-piston hydraulic disc', 13),
  ('p-sb120', 'brand-yeti', 'cat-trail', 'sb120-t3', 'SB120 T3', 'A fast, modern 29er for efficient technical trail riding.', 'A lightweight trail platform that brings precise handling and pedal-friendly efficiency to long rides with real technical depth.', 830000, '29 in', 'Carbon composite', 120, 'Four-piston hydraulic disc', 14),
  ('p-sb160', 'brand-yeti', 'cat-enduro', 'sb160-t3', 'SB160 T3', 'A confident enduro bike built around speed and composure.', 'A modern enduro machine tuned for deep travel, neutral handling, and carrying speed through rough, high-consequence trail features.', 920000, '29 in', 'Carbon composite', 160, 'Four-piston hydraulic disc', 15),
  ('p-sb165', 'brand-yeti', 'cat-enduro', 'sb165-t3', 'SB165 T3', 'A mixed-wheel enduro bike for technical, aggressive terrain.', 'A playful but serious enduro bike with generous travel, a low stance, and responsive handling on steep, technical descents.', 890000, 'Mixed 29/27.5 in', 'Carbon composite', 165, 'Four-piston hydraulic disc', 16),
  ('p-spectral', 'brand-canyon', 'cat-trail', 'spectral-cf-9', 'Spectral CF 9', 'A versatile trail bike for rough, fast all-mountain riding.', 'A capable carbon trail bike that combines a balanced climbing position with confident handling for technical descents.', 499900, '29 in', 'Carbon composite', 150, 'Four-piston hydraulic disc', 17),
  ('p-neuron', 'brand-canyon', 'cat-trail', 'neuron-cf-9', 'Neuron CF 9', 'An efficient trail bike for long mixed-terrain days.', 'A well-rounded trail bike focused on comfort, efficient pedaling, and dependable confidence across long, varied rides.', 429900, '29 in', 'Carbon composite', 140, 'Four-piston hydraulic disc', 18),
  ('p-strive', 'brand-canyon', 'cat-enduro', 'strive-cfr-underdog', 'Strive CFR Underdog', 'A race-focused enduro bike for steep and rough terrain.', 'A competition-minded enduro platform with long travel and composed handling designed for high-speed technical riding.', 579900, '29 in', 'Carbon composite', 170, 'Four-piston hydraulic disc', 19),
  ('p-sender', 'brand-canyon', 'cat-downhill', 'sender-cfr-underdog', 'Sender CFR Underdog', 'A downhill bike made for repeated hard park laps.', 'A gravity-first downhill bike with a durable build, adjustable stance, and suspension support for demanding courses.', 499900, 'Mixed 29/27.5 in', 'Carbon composite', 200, 'Four-piston hydraulic disc', 20)
ON CONFLICT (id) DO UPDATE SET
  brand_id = EXCLUDED.brand_id, category_id = EXCLUDED.category_id, slug = EXCLUDED.slug, name = EXCLUDED.name,
  short_description = EXCLUDED.short_description, description = EXCLUDED.description, price_cents = EXCLUDED.price_cents,
  wheel_size = EXCLUDED.wheel_size, frame_material = EXCLUDED.frame_material, travel_mm = EXCLUDED.travel_mm,
  brake_system = EXCLUDED.brake_system, featured_rank = EXCLUDED.featured_rank, updated_at = NOW();

-- Every color/size is a sellable SKU. A few intentional zero-stock combinations exercise the storefront's unavailable state.
INSERT INTO product_variants (id, product_id, sku, color_name, color_hex, frame_size, price_cents, stock_quantity, is_active)
SELECT
  'v-' || p.id || '-' || lower(replace(c.color_name, ' ', '-')) || '-' || lower(s.frame_size),
  p.id,
  upper(replace(p.slug, '-', '')) || '-' || upper(left(replace(c.color_name, ' ', ''), 3)) || '-' || s.frame_size,
  c.color_name,
  c.color_hex,
  s.frame_size,
  p.price_cents,
  CASE WHEN s.frame_size = 'XL' AND c.color_name = 'Sand' THEN 0 ELSE 4 + ((length(p.id) + length(c.color_name) + length(s.frame_size)) % 11) END,
  TRUE
FROM products p
CROSS JOIN (VALUES ('Graphite', '#25272A'), ('Forest Green', '#1D5948'), ('Clay', '#B65F3C'), ('Sand', '#C6B79B')) AS c(color_name, color_hex)
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL')) AS s(frame_size)
ON CONFLICT (product_id, color_name, frame_size) DO UPDATE SET
  sku = EXCLUDED.sku, color_hex = EXCLUDED.color_hex, price_cents = EXCLUDED.price_cents,
  stock_quantity = EXCLUDED.stock_quantity, is_active = EXCLUDED.is_active, updated_at = NOW();

INSERT INTO product_images (id, product_id, variant_id, image_url, alt_text, sort_order, width, height)
SELECT
  'img-' || p.id || '-' || lower(replace(c.color_name, ' ', '-')),
  p.id,
  MIN(v.id),
  CASE c.color_name
    WHEN 'Forest Green' THEN '/images/mtb-enduro-studio.png'
    WHEN 'Clay' THEN '/images/mtb-downhill-studio.png'
    WHEN 'Sand' THEN '/images/mtb-trail-studio.png'
    WHEN 'Graphite' THEN CASE
      WHEN p.category_id = 'cat-downhill' THEN '/images/mtb-downhill-studio.png'
      WHEN p.category_id = 'cat-enduro' THEN '/images/mtb-enduro-studio.png'
      ELSE '/images/mtb-trail-studio.png'
    END
  END,
  p.name || ' in ' || c.color_name || ' frame color',
  0,
  1254,
  1254
FROM products p
CROSS JOIN (VALUES ('Graphite'), ('Forest Green'), ('Clay'), ('Sand')) AS c(color_name)
JOIN product_variants v ON v.product_id = p.id AND v.color_name = c.color_name
GROUP BY p.id, p.category_id, p.name, c.color_name
ON CONFLICT (product_id, variant_id, sort_order) DO UPDATE SET
  image_url = EXCLUDED.image_url, alt_text = EXCLUDED.alt_text, width = EXCLUDED.width, height = EXCLUDED.height;

INSERT INTO inventory_movements (variant_id, quantity_delta, reason, reference_type, reference_id)
SELECT v.id, v.stock_quantity, 'seed', 'seed_catalog', v.id
FROM product_variants v
WHERE v.stock_quantity > 0
  AND NOT EXISTS (
    SELECT 1 FROM inventory_movements i WHERE i.variant_id = v.id AND i.reason = 'seed' AND i.reference_id = v.id
  );

INSERT INTO reviews (id, product_id, reviewer_name, reviewer_avatar_url, rating, title, body, is_verified_purchase, status) VALUES
  ('r-hightower-1', 'p-hightower', 'Maya Chen', 'https://i.pravatar.cc/96?img=47', 5, 'Confident without feeling sluggish', 'It stays calm through roots and turns, then still feels comfortable on a long climb. The fit guide put me between sizes and the smaller option was right.', TRUE, 'published'),
  ('r-hightower-2', 'p-hightower', 'Jon Bell', 'https://i.pravatar.cc/96?img=12', 5, 'A true all-day trail bike', 'The suspension has plenty of support for hard trail riding, but it does not make mellow rides feel like work.', TRUE, 'published'),
  ('r-nomad-1', 'p-nomad', 'Sofia Reyes', 'https://i.pravatar.cc/96?img=32', 5, 'Built for steep lines', 'Stable when the trail gets fast and the component spec held up through a full week in the bike park.', TRUE, 'published'),
  ('r-enduro-1', 'p-enduro', 'Malik Thompson', 'https://i.pravatar.cc/96?img=68', 4, 'Fast and composed', 'A very capable bike on rough trails. I would recommend booking the fit service if you are between sizes.', TRUE, 'published'),
  ('r-sb160-1', 'p-sb160', 'Avery Grant', 'https://i.pravatar.cc/96?img=49', 5, 'Exceptional traction', 'It is quiet, planted, and gave me more confidence on technical descents straight away.', TRUE, 'published'),
  ('r-spectral-1', 'p-spectral', 'Lena Ortiz', 'https://i.pravatar.cc/96?img=5', 5, 'Exactly the trail bike I wanted', 'Great balance between playfulness and stability. Shipping setup notes were also clear.', TRUE, 'published'),
  ('r-sender-1', 'p-sender', 'Ethan Price', 'https://i.pravatar.cc/96?img=14', 4, 'Ready for park laps', 'A solid downhill build with a very predictable feel on steep tracks.', TRUE, 'published')
ON CONFLICT (id) DO UPDATE SET
  reviewer_name = EXCLUDED.reviewer_name, reviewer_avatar_url = EXCLUDED.reviewer_avatar_url,
  rating = EXCLUDED.rating, title = EXCLUDED.title, body = EXCLUDED.body,
  is_verified_purchase = EXCLUDED.is_verified_purchase, status = EXCLUDED.status;

INSERT INTO reviews (id, product_id, reviewer_name, reviewer_avatar_url, rating, title, body, is_verified_purchase, status)
SELECT
  'r-' || p.id || '-seed',
  p.id,
  CASE (p.featured_rank % 5)
    WHEN 0 THEN 'Jordan Ellis' WHEN 1 THEN 'Casey Morgan' WHEN 2 THEN 'Taylor Brooks'
    WHEN 3 THEN 'Riley Park' ELSE 'Cameron Lee'
  END,
  'https://i.pravatar.cc/96?img=' || (10 + (p.featured_rank % 60)),
  CASE WHEN p.featured_rank % 4 = 0 THEN 4 ELSE 5 END,
  'A confident mountain bike',
  'The setup was straightforward and the bike feels composed on technical trails. The fit information made choosing a size much easier.',
  TRUE,
  'published'
FROM products p
WHERE NOT EXISTS (
  SELECT 1 FROM reviews r WHERE r.product_id = p.id AND r.status = 'published'
)
ON CONFLICT (id) DO NOTHING;
