-- FEMZYK MARKET database schema
-- Portable relational schema (SQLite for dev/self-host, PostgreSQL-compatible design).
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ─────────────────────────── USERS & AUTH ───────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  role TEXT NOT NULL DEFAULT 'CUSTOMER' CHECK (role IN ('CUSTOMER','ADMIN','SUPPORT')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS password_resets (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS addresses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  label TEXT DEFAULT 'Home',
  full_name TEXT,
  line1 TEXT NOT NULL,
  line2 TEXT,
  city TEXT NOT NULL,
  state TEXT,
  postal_code TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT,
  is_default INTEGER NOT NULL DEFAULT 0
);

-- ─────────────────────────── CATALOG ───────────────────────────
CREATE TABLE IF NOT EXISTS product_types (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  requires_shipping INTEGER NOT NULL DEFAULT 1,
  has_inventory INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id INTEGER REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  image TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  seo_title TEXT,
  seo_description TEXT
);
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);

CREATE TABLE IF NOT EXISTS suppliers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_email TEXT,
  country TEXT,
  lead_time_days INTEGER,
  notes TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type_code TEXT NOT NULL REFERENCES product_types(code),
  sku TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  brand TEXT,
  short_description TEXT,
  description TEXT,
  price_cents INTEGER NOT NULL,
  compare_at_cents INTEGER,
  cost_cents INTEGER,
  currency TEXT NOT NULL DEFAULT 'USD',
  supplier_id INTEGER REFERENCES suppliers(id),
  supplier_sku TEXT,
  -- inventory (meaningful only when type has_inventory)
  track_inventory INTEGER NOT NULL DEFAULT 1,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  allow_backorder INTEGER NOT NULL DEFAULT 0,
  requires_shipping INTEGER NOT NULL DEFAULT 1,
  -- shipping
  weight_grams INTEGER,
  shipping_class TEXT,
  -- publishing
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','scheduled','archived')),
  publish_at TEXT,
  is_featured INTEGER NOT NULL DEFAULT 0,
  is_bestseller INTEGER NOT NULL DEFAULT 0,
  is_new INTEGER NOT NULL DEFAULT 1,
  -- flags/meta (flexible per-type content, JSON)
  specs_json TEXT DEFAULT '[]',
  features_json TEXT DEFAULT '[]',
  faq_json TEXT DEFAULT '[]',
  included_json TEXT DEFAULT '[]',
  care_json TEXT DEFAULT '[]',
  tags_json TEXT DEFAULT '[]',
  -- trust
  warranty_text TEXT,
  return_eligible INTEGER NOT NULL DEFAULT 1,
  return_notes TEXT,
  -- digital commerce metadata
  digital_file_type TEXT,
  digital_file_size TEXT,
  digital_version TEXT DEFAULT '1.0',
  digital_download_limit INTEGER DEFAULT 10,
  digital_expiry_days INTEGER DEFAULT 365,
  -- services metadata
  service_quote_type TEXT CHECK (service_quote_type IN ('fixed','starting','custom')),
  service_delivery_min_days INTEGER,
  service_delivery_max_days INTEGER,
  service_revisions INTEGER,
  service_included_json TEXT DEFAULT '[]',
  service_excluded_json TEXT DEFAULT '[]',
  service_process_json TEXT DEFAULT '[]',
  service_requirements_json TEXT DEFAULT '[]',
  -- seo
  seo_title TEXT,
  seo_description TEXT,
  seo_keywords TEXT,
  -- counters
  views INTEGER NOT NULL DEFAULT 0,
  sales_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status, publish_at);
CREATE INDEX IF NOT EXISTS idx_products_type ON products(type_code);
CREATE INDEX IF NOT EXISTS idx_products_featured ON products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);
CREATE INDEX IF NOT EXISTS idx_products_price ON products(price_cents);

CREATE TABLE IF NOT EXISTS product_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  alt TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL DEFAULT 'gallery',
  position INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_pimages_product ON product_images(product_id);

CREATE TABLE IF NOT EXISTS product_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  poster TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS product_variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku TEXT UNIQUE,
  name TEXT NOT NULL,
  options_json TEXT NOT NULL DEFAULT '{}',
  price_delta_cents INTEGER NOT NULL DEFAULT 0,
  stock_qty INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_categories (
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, category_id)
);
CREATE INDEX IF NOT EXISTS idx_pc_category ON product_categories(category_id);

CREATE TABLE IF NOT EXISTS inventory_adjustments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT,
  actor_id INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Collections (dynamic merchandising groups)
CREATE TABLE IF NOT EXISTS collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  rule_json TEXT DEFAULT '{}',
  is_active INTEGER NOT NULL DEFAULT 1,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS collection_products (
  collection_id INTEGER NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (collection_id, product_id)
);

-- ─────────────────────────── CARTS & WISHLISTS ───────────────────────────
CREATE TABLE IF NOT EXISTS carts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL DEFAULT 'USD',
  coupon_code TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  saved_for_later INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (cart_id, product_id, variant_id)
);

CREATE TABLE IF NOT EXISTS wishlist_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, product_id)
);

-- ─────────────────────────── ORDERS & PAYMENTS ───────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_PAYMENT',
  kind TEXT NOT NULL DEFAULT 'MIXED' CHECK (kind IN ('PHYSICAL','DIGITAL','SERVICE','MIXED')),
  currency TEXT NOT NULL DEFAULT 'USD',
  fx_rate REAL NOT NULL DEFAULT 1,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  shipping_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  coupon_code TEXT,
  shipping_address_json TEXT,
  shipping_zone TEXT,
  shipping_method TEXT,
  est_delivery_min_days INTEGER,
  est_delivery_max_days INTEGER,
  customer_note TEXT,
  ip TEXT,
  cart_id INTEGER REFERENCES carts(id) ON DELETE SET NULL,
  cart_restored INTEGER NOT NULL DEFAULT 0,
  confirmation_token TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  paid_at TEXT,
  completed_at TEXT,
  cancelled_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_orders_user ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_email ON orders(email);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  variant_id INTEGER REFERENCES product_variants(id) ON DELETE SET NULL,
  product_type TEXT NOT NULL,
  sku TEXT,
  name TEXT NOT NULL,
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL,
  total_cents INTEGER NOT NULL,
  meta_json TEXT DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_oitems_order ON order_items(order_id);

CREATE TABLE IF NOT EXISTS payments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  reference TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  provider_ref TEXT,
  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN ('INITIATED','PENDING','SUCCESS','FAILED','CANCELLED','REFUNDED')),
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL,
  method TEXT,
  verified INTEGER NOT NULL DEFAULT 0,
  raw_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_payments_order ON payments(order_id);

CREATE TABLE IF NOT EXISTS payment_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  payment_id INTEGER NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  payload_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS shipments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  carrier TEXT,
  tracking_number TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','LABEL_CREATED','SHIPPED','IN_TRANSIT','OUT_FOR_DELIVERY','DELIVERED','EXCEPTION')),
  shipped_at TEXT,
  delivered_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);

-- ─────────────────────────── SHIPPING CONFIG ───────────────────────────
CREATE TABLE IF NOT EXISTS shipping_zones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  countries_json TEXT NOT NULL DEFAULT '[]',
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS shipping_methods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  zone_id INTEGER NOT NULL REFERENCES shipping_zones(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  free_threshold_cents INTEGER,
  min_days INTEGER NOT NULL DEFAULT 3,
  max_days INTEGER NOT NULL DEFAULT 7,
  is_active INTEGER NOT NULL DEFAULT 1
);

-- ─────────────────────────── REVIEWS ───────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title TEXT,
  body TEXT NOT NULL,
  author_name TEXT NOT NULL,
  is_verified INTEGER NOT NULL DEFAULT 0,
  is_seed INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  helpful_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_reviews_product ON reviews(product_id, status);

CREATE TABLE IF NOT EXISTS review_reports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  review_id INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────── PROMOTIONS ───────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('percent','fixed')),
  value_cents INTEGER NOT NULL,
  applies_to_json TEXT DEFAULT '{}',
  min_subtotal_cents INTEGER DEFAULT 0,
  usage_limit INTEGER,
  times_used INTEGER NOT NULL DEFAULT 0,
  starts_at TEXT,
  ends_at TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  coupon_id INTEGER NOT NULL REFERENCES coupons(id) ON DELETE CASCADE,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  discount_cents INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────── DIGITAL COMMERCE ───────────────────────────
CREATE TABLE IF NOT EXISTS digital_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'Main file',
  stored_path TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT,
  size_bytes INTEGER,
  version TEXT DEFAULT '1.0',
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_dfiles_product ON digital_files(product_id);

CREATE TABLE IF NOT EXISTS digital_entitlements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_item_id INTEGER NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  download_limit INTEGER NOT NULL DEFAULT 10,
  downloads_used INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  revoked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_entitlements_user ON digital_entitlements(user_id);
CREATE INDEX IF NOT EXISTS idx_entitlements_email ON digital_entitlements(email);

CREATE TABLE IF NOT EXISTS digital_downloads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  entitlement_id INTEGER NOT NULL REFERENCES digital_entitlements(id) ON DELETE CASCADE,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────── SERVICES & PROJECTS ───────────────────────────
CREATE TABLE IF NOT EXISTS service_packages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  description TEXT,
  features_json TEXT DEFAULT '[]',
  is_popular INTEGER NOT NULL DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  order_id INTEGER REFERENCES orders(id),
  order_item_id INTEGER REFERENCES order_items(id),
  product_id INTEGER REFERENCES products(id),
  package_id INTEGER REFERENCES service_packages(id),
  user_id INTEGER REFERENCES users(id),
  email TEXT NOT NULL,
  business_name TEXT,
  status TEXT NOT NULL DEFAULT 'INQUIRY' CHECK (status IN ('INQUIRY','PAYMENT_PENDING','PAID','REQUIREMENTS_PENDING','REQUIREMENTS_RECEIVED','IN_PROGRESS','CLIENT_REVIEW','REVISION_REQUESTED','COMPLETED','CANCELLED','REFUNDED')),
  brief_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_user ON projects(user_id);

CREATE TABLE IF NOT EXISTS project_requirements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  content_json TEXT NOT NULL DEFAULT '{}',
  submitted_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_files (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  stored_path TEXT NOT NULL,
  size_bytes INTEGER,
  uploaded_by TEXT NOT NULL DEFAULT 'customer',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('customer','team')),
  sender_name TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS project_milestones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'TODO' CHECK (status IN ('TODO','IN_PROGRESS','DONE')),
  due_at TEXT,
  completed_at TEXT
);

-- ─────────────────────────── SUPPORT & CONTENT ───────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  reference TEXT NOT NULL UNIQUE,
  user_id INTEGER REFERENCES users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'general',
  order_number TEXT,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','pending','resolved','closed')),
  assigned_to TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_replies (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ticket_id INTEGER NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  author_type TEXT NOT NULL CHECK (author_type IN ('customer','team')),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL DEFAULT 'general',
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS content_pages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  body_md TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value_json TEXT NOT NULL
);

-- ─────────────────────────── NOTIFICATIONS & EMAIL ───────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  payload_json TEXT DEFAULT '{}',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS email_outbox (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  to_email TEXT NOT NULL,
  template TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_md TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','sent','failed')),
  provider TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ─────────────────────────── ANALYTICS & AUDIT ───────────────────────────
CREATE TABLE IF NOT EXISTS analytics_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT,
  event TEXT NOT NULL,
  payload_json TEXT DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_analytics_event ON analytics_events(event, created_at);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id INTEGER,
  previous_json TEXT,
  new_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);

-- ─────────────────────────── FUTURE: LMS & BLOG (architecture-ready) ───────────────────────────
CREATE TABLE IF NOT EXISTS blog_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  excerpt TEXT,
  body_md TEXT,
  author_id INTEGER REFERENCES users(id),
  featured_image TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS courses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  product_id INTEGER REFERENCES products(id),
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS course_modules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_lessons (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  module_id INTEGER NOT NULL REFERENCES course_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_md TEXT,
  video_url TEXT,
  position INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS course_progress (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, lesson_id)
);

-- ─────────────────────────── MARKETPLACE READINESS ───────────────────────────
-- Suppliers table above doubles as future vendor table; vendor payout fields
-- can be added without schema redesign. No vendor-facing features exposed yet.
