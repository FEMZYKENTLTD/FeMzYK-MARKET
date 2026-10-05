import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./passwords";

/**
 * First-boot seed. Creates the FEMZYK MARKET launch catalog, category tree,
 * shipping configuration, policies and an admin account. Everything seeded
 * here is editable from the admin dashboard afterwards.
 */

function now(): string {
  return new Date().toISOString().replace("T", " ").slice(0, 19);
}
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 864e5).toISOString().replace("T", " ").slice(0, 19);
}

export function runSeed(db: DatabaseSync) {
  const ins = (sql: string) => db.prepare(sql);
  const t = now();

  // ── Admin & demo accounts ────────────────────────────────────────────────
  ins(
    "INSERT OR IGNORE INTO users (email, password_hash, first_name, last_name, role, email_verified) VALUES (?, ?, ?, ?, 'ADMIN', 1)"
  ).run("admin@femzykmarket.com", hashPassword("Femzyk!Admin2026"), "FEMZYK", "Admin");

  // ── Product types ────────────────────────────────────────────────────────
  const types = [
    ["PHYSICAL_PRODUCT", "Physical Product", "Tangible goods shipped to the customer.", 1, 1],
    ["DIGITAL_PRODUCT", "Digital Product", "Guides, ebooks, templates and other downloadable content.", 0, 0],
    ["SERVICE", "Service", "Professional services such as web development.", 0, 0],
    ["SERVICE_PACKAGE", "Service Package", "Productized service tiers.", 0, 0],
    ["DOWNLOADABLE_RESOURCE", "Downloadable Resource", "Templates, checklists, assets and code.", 0, 0],
    ["FUTURE_SUBSCRIPTION", "Subscription", "Reserved for future subscription products.", 0, 0],
  ] as const;
  for (const [code, name, desc, ship, inv] of types) {
    ins("INSERT OR IGNORE INTO product_types (code, name, description, requires_shipping, has_inventory) VALUES (?, ?, ?, ?, ?)").run(code, name, desc, ship, inv);
  }

  // ── Categories ───────────────────────────────────────────────────────────
  const cat = (slug: string, name: string, desc: string, image: string, parentSlug?: string, pos = 0) => {
    const parent = parentSlug ? (db.prepare("SELECT id FROM categories WHERE slug = ?").get(parentSlug) as any)?.id ?? null : null;
    ins("INSERT OR IGNORE INTO categories (parent_id, slug, name, description, image, position) VALUES (?, ?, ?, ?, ?, ?)").run(
      parent, slug, name, desc, image, pos
    );
  };
  cat("home", "Home", "Thoughtful products for a calmer, more organized home.", "/images/cat-home.jpg", undefined, 1);
  cat("home-fragrance", "Home Fragrance", "Warmth and ambiance, the safe way.", "/images/products/lumora.jpg", "home");
  cat("organization", "Organization", "Systems that keep everyday things in their place.", "/images/products/neatspace.jpg", "home");
  cat("decor", "Decor", "Simple pieces that make a room feel finished.", "/images/cat-home.jpg", "home");
  cat("cleaning", "Cleaning", "Practical tools for an easier clean.", "/images/cat-home.jpg", "home");
  cat("everyday-home", "Everyday Home", "Small upgrades for daily routines.", "/images/cat-home.jpg", "home");

  cat("pets", "Pets", "Considered gear for the animals we share our lives with.", "/images/cat-pets.jpg", undefined, 2);
  cat("dogs", "Dogs", "Care, travel and play for dogs.", "/images/products/nova.jpg", "pets");
  cat("cats", "Cats", "Comfort and enrichment for cats.", "/images/products/cathome.jpg", "pets");
  cat("grooming", "Grooming", "Gentle, effective grooming tools.", "/images/products/nova.jpg", "pets");
  cat("pet-travel", "Pet Travel", "Organized, stress-free trips together.", "/images/products/rover.jpg", "pets");
  cat("feeding", "Feeding", "Bowls, feeders and feeding accessories.", "/images/cat-pets.jpg", "pets");
  cat("pet-accessories", "Pet Accessories", "Everyday extras for pets and their people.", "/images/cat-pets.jpg", "pets");

  cat("kitchen", "Kitchen", "Well-made tools for cooking and serving.", "/images/cat-kitchen.jpg", undefined, 3);
  cat("kitchen-tools", "Kitchen Tools", "Reliable tools you'll reach for daily.", "/images/products/pressmate.jpg", "kitchen");
  cat("drinkware", "Drinkware", "Cups, mugs and sets for slow mornings.", "/images/products/slowmorning.jpg", "kitchen");
  cat("food-preparation", "Food Preparation", "Prep made simpler.", "/images/products/pressmate.jpg", "kitchen");
  cat("storage", "Storage", "Keep pantry and counter in order.", "/images/cat-kitchen.jpg", "kitchen");

  cat("desk-work", "Desk & Work", "Everything your workspace needs — nothing it doesn't.", "/images/cat-desk.jpg", undefined, 4);
  cat("desk-organization", "Desk Organization", "Tidy surfaces, clearer thinking.", "/images/products/creatordesk.jpg", "desk-work");
  cat("workspace", "Workspace", "Lighting, stands and workspace essentials.", "/images/products/creatordesk.jpg", "desk-work");
  cat("productivity", "Productivity", "Tools and resources that protect your focus.", "/images/products/creatordesk.jpg", "desk-work");
  cat("desk-accessories", "Desk Accessories", "Finishing touches for your setup.", "/images/products/creatordesk.jpg", "desk-work");

  cat("lifestyle", "Lifestyle", "Everyday essentials designed to be used and enjoyed.", "/images/cat-lifestyle.jpg", undefined, 5);
  cat("everyday-essentials", "Everyday Essentials", "Practical picks for daily life.", "/images/cat-lifestyle.jpg", "lifestyle");
  cat("personal-lifestyle", "Personal Lifestyle", "Small luxuries, honestly made.", "/images/products/slowmorning.jpg", "lifestyle");
  cat("travel", "Travel", "Pack smarter, travel lighter.", "/images/products/rover.jpg", "lifestyle");

  cat("gifts", "Gifts", "Considered gifts for people and pets.", "/images/cat-gifts.jpg", undefined, 6);
  cat("gifts-for-her", "Gifts for Her", "Warm, useful, well-packaged.", "/images/products/lumora.jpg", "gifts");
  cat("gifts-for-him", "Gifts for Him", "Practical picks that get used.", "/images/products/pressmate.jpg", "gifts");
  cat("home-gifts", "Home Gifts", "For new homes and favorite rooms.", "/images/products/createbox.jpg", "gifts");
  cat("pet-gifts", "Pet Gifts", "For the ones who greet you at the door.", "/images/products/rover.jpg", "gifts");
  cat("digital-gifts", "Digital Gifts", "Instant delivery, no shipping wait.", "/images/digital/template-bundle.jpg", "gifts");

  cat("digital", "Digital", "Guides, templates and resources delivered instantly.", "/images/digital/webdev-guide.jpg", undefined, 7);
  cat("guides", "Guides", "In-depth, beginner-friendly guides.", "/images/digital/python-guide.jpg", "digital");
  cat("templates", "Templates", "Templates you can actually build on.", "/images/digital/template-bundle.jpg", "digital");
  cat("business-resources", "Business Resources", "Documents and systems for small businesses.", "/images/digital/template-bundle.jpg", "digital");
  cat("programming", "Programming", "Learn to code with practical, project-based guides.", "/images/digital/python-guide.jpg", "digital");
  cat("web-development", "Web Development", "Everything about building for the web.", "/images/digital/webdev-guide.jpg", "digital");
  cat("design-resources", "Design Resources", "Assets and systems for designers.", "/images/digital/template-bundle.jpg", "digital");
  cat("educational-resources", "Educational Resources", "Learning materials that respect your time.", "/images/digital/python-guide.jpg", "digital");

  cat("web-dev-services", "Web Development Services", "Professional web design and development by the FEMZYK team.", "/images/services/webdev.jpg", undefined, 8);
  cat("websites", "Websites", "Complete website builds.", "/images/services/webdev.jpg", "web-dev-services");
  cat("landing-pages", "Landing Pages", "Focused pages that convert.", "/images/services/webdev.jpg", "web-dev-services");
  cat("business-websites", "Business Websites", "Professional sites for growing businesses.", "/images/services/webdev.jpg", "web-dev-services");
  cat("web-applications", "Web Applications", "Custom tools and applications.", "/images/services/webdev.jpg", "web-dev-services");
  cat("backend-development", "Backend Development", "APIs, databases and integrations.", "/images/services/webdev.jpg", "web-dev-services");
  cat("api-integration", "API Integration", "Connect the systems you already use.", "/images/services/webdev.jpg", "web-dev-services");
  cat("maintenance", "Maintenance", "Keep your site fast, safe and up to date.", "/images/services/webdev.jpg", "web-dev-services");
  cat("custom-development", "Custom Development", "Scoped, quoted and built to specification.", "/images/services/webdev.jpg", "web-dev-services");

  // ── Suppliers (marketplace-ready architecture) ──────────────────────────
  const sup = ins("INSERT INTO suppliers (name, contact_email, country, lead_time_days, notes) VALUES (?, ?, ?, ?, ?)");
  sup.run("Northwind Home Goods", "orders@northwind.example", "US", 3, "Home and kitchen products. Ships from US warehouse.");
  sup.run("Companion Pet Supply Co.", "supply@companionpet.example", "CA", 4, "Pet accessories and grooming.");
  sup.run("Studio Ceramics Collective", "hello@studiocc.example", "GB", 6, "Ceramic drinkware, small-batch.");
  sup.run("FEMZYK Digital Studio", "studio@femzykmarket.com", "—", 0, "In-house digital products and services. Instant delivery.");

  const suppliers = db.prepare("SELECT id, name FROM suppliers").all() as any[];
  const supId = (name: string) => suppliers.find((s) => s.name === name)?.id ?? null;

  // ── Products ─────────────────────────────────────────────────────────────
  const P = db.prepare(
    `INSERT INTO products (type_code, sku, slug, name, brand, short_description, description, price_cents, compare_at_cents,
      track_inventory, stock_qty, low_stock_threshold, requires_shipping, weight_grams, status, publish_at,
      is_featured, is_bestseller, is_new, specs_json, features_json, faq_json, included_json, tags_json,
      warranty_text, return_eligible, return_notes, digital_file_type, digital_file_size, digital_version,
      digital_download_limit, digital_expiry_days, service_quote_type, service_delivery_min_days, service_delivery_max_days,
      service_revisions, service_included_json, service_excluded_json, service_process_json, service_requirements_json,
      seo_title, seo_description, supplier_id, supplier_sku, created_at)
     VALUES (@type_code, @sku, @slug, @name, @brand, @short_description, @description, @price_cents, @compare_at_cents,
      @track_inventory, @stock_qty, @low_stock_threshold, @requires_shipping, @weight_grams, @status, @publish_at,
      @is_featured, @is_bestseller, @is_new, @specs_json, @features_json, @faq_json, @included_json, @tags_json,
      @warranty_text, @return_eligible, @return_notes, @digital_file_type, @digital_file_size, @digital_version,
      @digital_download_limit, @digital_expiry_days, @service_quote_type, @service_delivery_min_days, @service_delivery_max_days,
      @service_revisions, @service_included_json, @service_excluded_json, @service_process_json, @service_requirements_json,
      @seo_title, @seo_description, @supplier_id, @supplier_sku, @created_at)`
  );

  const base = {
    brand: "FEMZYK",
    track_inventory: 1, stock_qty: 40, low_stock_threshold: 6, requires_shipping: 1,
    weight_grams: 800, status: "published", publish_at: daysAgo(20),
    is_featured: 0, is_bestseller: 0, is_new: 1,
    warranty_text: "12-month limited warranty against manufacturing defects.",
    return_eligible: 1,
    return_notes: "30-day returns in original condition. Digital products are non-returnable; see Digital Product Policy.",
    digital_file_type: null, digital_file_size: null, digital_version: null,
    digital_download_limit: null, digital_expiry_days: null,
    service_quote_type: null, service_delivery_min_days: null, service_delivery_max_days: null,
    service_revisions: null, service_included_json: "[]", service_excluded_json: "[]",
    service_process_json: "[]", service_requirements_json: "[]",
    supplier_id: null, supplier_sku: null, compare_at_cents: null, created_at: daysAgo(20),
  };

  const products: any[] = [
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-LUM-001", slug: "femzyk-lumora-candle-warmer",
      name: "FEMZYK LUMORA Candle Warmer Lamp",
      short_description: "A flameless way to enjoy your favorite candles — warm light, full fragrance, zero open flame.",
      description: `LUMORA melts your candle from the top down using an adjustable warm lamp, so you get the fragrance and glow without an open flame, soot or tunneling.\n\nThe dimmable bulb lets you control warmth and brightness, and the adjustable arm fits most jar candles up to 3.5 inches tall. It's a calmer way to enjoy candles in bedrooms, offices and small spaces.`,
      price_cents: 5999, compare_at_cents: 7499,
      stock_qty: 46, weight_grams: 1400,
      is_featured: 1, is_bestseller: 1, publish_at: daysAgo(24), created_at: daysAgo(24),
      specs_json: JSON.stringify([
        ["Material", "Powder-coated steel, glass shade"],
        ["Power", "110–240V, 35W warm bulb (included)"],
        ["Fits candles", "Jar candles up to 3.5 in / 9 cm tall"],
        ["Cable", "59 in / 1.5 m with inline dimmer"],
        ["Dimensions", "10.6 × 6.3 × 6.3 in"],
      ]),
      features_json: JSON.stringify([
        "Flameless candle enjoyment — no soot, no open flame",
        "Dimmable warmth and brightness",
        "Prevents candle tunneling by melting evenly from the top",
        "Adjustable arm fits most jar candles",
        "Quiet operation, suitable for bedrooms and offices",
      ]),
      faq_json: JSON.stringify([
        { q: "Does it work with any candle?", a: "It fits most jar candles up to 3.5 inches tall. Pillar candles and very wide jars may not sit under the arm." },
        { q: "Is a bulb included?", a: "Yes — one 35W warm bulb is included, plus a spare." },
        { q: "How long until I can smell the fragrance?", a: "Most candles begin releasing fragrance within 15–25 minutes." },
      ]),
      included_json: JSON.stringify(["LUMORA warmer lamp", "35W warm bulb (fitted) + 1 spare", "Quick-start guide"]),
      tags_json: JSON.stringify(["candle", "home-fragrance", "gift", "lamp"]),
      seo_title: "FEMZYK LUMORA Candle Warmer Lamp — Flameless Candle Lamp",
      seo_description: "Enjoy your favorite candles without an open flame. The LUMORA candle warmer lamp melts candles evenly with dimmable warmth. Free US shipping over $75.",
      supplier_id: supId("Northwind Home Goods"), supplier_sku: "NW-LUM-2101",
      warranty_text: "2-year limited warranty including bulb replacements.",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-NOV-002", slug: "femzyk-nova-dog-grooming-kit",
      name: "FEMZYK NOVA Dog Grooming Kit",
      short_description: "A complete 8-piece home grooming set for dogs — gentle on coats, easy on hands.",
      description: `NOVA brings professional-style grooming home. The set covers brushing, de-shedding, detangling and finishing for short, medium and long coats.\n\nErgonomic, non-slip handles reduce hand strain, and rounded stainless pins are gentle on skin. Everything stores in the included zip case — one kit for the whole routine.`,
      price_cents: 5499, stock_qty: 38, weight_grams: 950,
      is_featured: 1, publish_at: daysAgo(22), created_at: daysAgo(22),
      specs_json: JSON.stringify([
        ["Pieces", "8"],
        ["Coat types", "Short, medium, long, double coats"],
        ["Materials", "Stainless steel pins, TPE non-slip handles"],
        ["Case", "Zip storage case included"],
      ]),
      features_json: JSON.stringify([
        "8-piece set covers the full grooming routine",
        "Rounded stainless pins are gentle on skin",
        "Non-slip ergonomic handles",
        "Works for dogs of all sizes",
        "Zip case keeps everything together",
      ]),
      faq_json: JSON.stringify([
        { q: "Is it suitable for sensitive skin?", a: "The pins are rounded and polished. Use light pressure on sensitive areas and stop if your dog shows discomfort." },
        { q: "Can I use it on cats?", a: "The brushes work on long-haired cats; the de-shedding blade is designed for dog coats." },
      ]),
      included_json: JSON.stringify(["Slicker brush", "De-shedding comb", "Pin brush", "Dematting rake", "Steel comb", "Nail clippers", "Nail file", "Zip storage case"]),
      tags_json: JSON.stringify(["dog", "grooming", "pet-care"]),
      seo_title: "FEMZYK NOVA Dog Grooming Kit — 8-Piece Home Grooming Set",
      seo_description: "Complete 8-piece dog grooming kit with gentle stainless tools and a storage case. Suitable for all coat types.",
      supplier_id: supId("Companion Pet Supply Co."), supplier_sku: "CP-NOVA-88",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-ROV-003", slug: "femzyk-rover-travel-organizer",
      name: "FEMZYK Rover Travel Organizer",
      short_description: "Keep car trips tidy: one organized seat-back system for water, treats, toys and wipes.",
      description: `Rover turns the back seat into an organized travel station. Reinforced pockets hold bottles, treats, leads and toys, while the insulated sleeve keeps water cool on longer trips.\n\nIt installs in under a minute with adjustable straps around the headrest, wipes clean easily, and folds flat when not in use.`,
      price_cents: 4999, stock_qty: 52, weight_grams: 700,
      publish_at: daysAgo(18), created_at: daysAgo(18),
      specs_json: JSON.stringify([
        ["Material", "600D water-resistant polyester"],
        ["Insulated sleeve", "Fits bottles up to 750 ml"],
        ["Installation", "Adjustable headrest straps, tool-free"],
        ["Cleaning", "Wipe clean; removable liner"],
      ]),
      features_json: JSON.stringify([
        "Insulated bottle sleeve",
        "Reinforced pockets for treats, toys and leads",
        "Installs in under a minute",
        "Folds flat for storage",
        "Wipe-clean water-resistant fabric",
      ]),
      faq_json: JSON.stringify([
        { q: "Will it fit my car?", a: "Rover uses adjustable straps and fits most standard headrests, including SUVs and hatchbacks." },
        { q: "Is it machine washable?", a: "The removable liner is hand-washable; the main panel wipes clean." },
      ]),
      included_json: JSON.stringify(["Rover organizer", "Adjustable mounting straps", "Removable washable liner"]),
      tags_json: JSON.stringify(["dog", "travel", "car", "organizer"]),
      seo_title: "FEMZYK Rover Dog Travel Organizer — Car Seat-Back Storage",
      seo_description: "Organized dog car travel: insulated bottle sleeve, reinforced pockets and tool-free installation.",
      supplier_id: supId("Companion Pet Supply Co."), supplier_sku: "CP-ROV-41",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-NEA-004", slug: "femzyk-neatspace-organization-set",
      name: "FEMZYK NeatSpace Organization Set",
      short_description: "A modular 6-piece storage system for shelves, drawers and counters.",
      description: `NeatSpace is a set of six modular bins and dividers that adapt to your space instead of forcing your space to adapt to them.\n\nThe matte finish and neutral tone keep shelves looking calm, while the stackable design means the system grows with you. Use them in the kitchen, bathroom, office or entryway — they're built to be moved and reused.`,
      price_cents: 5999, compare_at_cents: 6999, stock_qty: 33, weight_grams: 1800,
      is_featured: 1, publish_at: daysAgo(16), created_at: daysAgo(16),
      specs_json: JSON.stringify([
        ["Pieces", "6 (3 bins, 3 adjustable dividers)"],
        ["Material", "Recycled PP with matte finish"],
        ["Sizes", "Small 9×6×4 in · Medium 12×8×4 in · Large 15×10×5 in"],
        ["Care", "Wipe clean; not dishwasher-safe"],
      ]),
      features_json: JSON.stringify([
        "Modular pieces mix and match across rooms",
        "Stackable design saves shelf space",
        "Adjustable dividers create custom compartments",
        "Neutral matte finish suits any room",
        "Made from recycled material",
      ]),
      faq_json: JSON.stringify([
        { q: "Can I buy additional pieces later?", a: "Yes — individual NeatSpace bins are planned as separate listings, and the sizes will remain compatible." },
        { q: "Are they food-safe?", a: "They are suitable for packaged foods. For loose food storage, use sealed containers." },
      ]),
      included_json: JSON.stringify(["3 stackable bins (S, M, L)", "3 adjustable dividers", "Layout ideas card"]),
      tags_json: JSON.stringify(["organization", "storage", "home"]),
      seo_title: "FEMZYK NeatSpace Organization Set — Modular 6-Piece Storage",
      seo_description: "A modular 6-piece organization system for shelves, drawers and counters. Stackable, adjustable, calm.",
      supplier_id: supId("Northwind Home Goods"), supplier_sku: "NW-NEA-330",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-SLO-005", slug: "femzyk-slow-morning-ceramic-set",
      name: "FEMZYK Slow Morning Ceramic Set",
      short_description: "A hand-glazed 4-piece ceramic set for slower, warmer mornings.",
      description: `Two mugs, two bowls — glazed in a warm oat finish with an unglazed base. The set is designed for everyday use: microwave-safe, comfortable to hold, and sized for real portions.\n\nEach piece is kiln-fired and finished by hand, so subtle variation between sets is normal and part of the character.`,
      price_cents: 4999, stock_qty: 27, weight_grams: 1600,
      publish_at: daysAgo(14), created_at: daysAgo(14),
      specs_json: JSON.stringify([
        ["Pieces", "4 (2 mugs, 2 bowls)"],
        ["Material", "Stoneware, lead-free glaze"],
        ["Capacity", "Mugs 12 oz · Bowls 22 oz"],
        ["Care", "Microwave and dishwasher safe"],
      ]),
      features_json: JSON.stringify([
        "Hand-glazed stoneware with warm oat finish",
        "Microwave and dishwasher safe",
        "Comfortable, balanced handles",
        "Subtle hand-finished variation in every set",
      ]),
      faq_json: JSON.stringify([
        { q: "Is the glaze food-safe?", a: "Yes — all glazes are lead-free and food-safe." },
        { q: "Why does my set look slightly different from the photos?", a: "Each piece is finished by hand; small tone and texture variations are expected." },
      ]),
      included_json: JSON.stringify(["2 stoneware mugs (12 oz)", "2 stoneware bowls (22 oz)", "Care card"]),
      tags_json: JSON.stringify(["ceramic", "kitchen", "drinkware", "gift"]),
      seo_title: "FEMZYK Slow Morning Ceramic Set — 4-Piece Stoneware",
      seo_description: "Hand-glazed 4-piece ceramic set: two mugs, two bowls. Microwave and dishwasher safe stoneware.",
      supplier_id: supId("Studio Ceramics Collective"), supplier_sku: "SCC-SM-4P",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-CRE-006", slug: "femzyk-creator-desk-kit",
      name: "FEMZYK Creator Desk Kit",
      short_description: "Five desk essentials in one box — everything a focused workspace needs.",
      description: `The Creator Desk Kit bundles the five pieces we think every focused desk deserves: a weighted cable organizer, a monitor-height phone stand, a catch-all tray, a felt desk mat and a set of reusable cable ties.\n\nEverything is finished in matte charcoal so it disappears into your setup — until you notice how much tidier your desk looks.`,
      price_cents: 5499, stock_qty: 41, weight_grams: 1100,
      is_featured: 1, is_bestseller: 1, publish_at: daysAgo(26), created_at: daysAgo(26),
      specs_json: JSON.stringify([
        ["Pieces", "5"],
        ["Desk mat", "31.5 × 15.7 in, 3 mm felt"],
        ["Finish", "Matte charcoal"],
        ["Compatibility", "Fits phones and tablets up to 12.9 in"],
      ]),
      features_json: JSON.stringify([
        "Complete desk setup in one box",
        "Weighted cable organizer keeps chargers in place",
        "Phone stand doubles as a tablet stand",
        "Large felt desk mat protects your surface",
        "Reusable cable ties included",
      ]),
      faq_json: JSON.stringify([
        { q: "Will the mat fit a 27-inch monitor?", a: "Yes — the 31.5-inch mat sits comfortably under monitors up to 32 inches." },
        { q: "Can I buy the pieces separately?", a: "Individually listed pieces are on our roadmap; the kit is the best value today." },
      ]),
      included_json: JSON.stringify(["Felt desk mat", "Weighted cable organizer", "Phone/tablet stand", "Catch-all tray", "6 reusable cable ties"]),
      tags_json: JSON.stringify(["desk", "workspace", "productivity", "creator"]),
      seo_title: "FEMZYK Creator Desk Kit — 5-Piece Workspace Set",
      seo_description: "Desk mat, cable organizer, phone stand, tray and cable ties — a complete workspace upgrade in one box.",
      supplier_id: supId("Northwind Home Goods"), supplier_sku: "NW-CRE-520",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-PMS-007", slug: "femzyk-pressmate-manual-juicer",
      name: "FEMZYK PressMate Manual Juicer",
      short_description: "A lever-press citrus juicer that gets more juice with less effort — no cords, no noise.",
      description: `PressMate uses compound leverage to press citrus fully in one smooth motion. More juice per fruit, no motor noise, and nothing to plug in.\n\nThe pressing cone fits lemons, limes, oranges and grapefruit halves. Every part that touches fruit detaches and is dishwasher-safe, and the non-slip base stays put on wet counters.`,
      price_cents: 5999, stock_qty: 29, weight_grams: 2100,
      publish_at: daysAgo(12), created_at: daysAgo(12),
      specs_json: JSON.stringify([
        ["Mechanism", "Compound-leverage lever press"],
        ["Material", "Food-grade aluminum + stainless cone"],
        ["Fits", "Lemons, limes, oranges, grapefruit"],
        ["Cleaning", "Removable parts, dishwasher-safe"],
      ]),
      features_json: JSON.stringify([
        "Presses citrus fully in one motion",
        "No electricity, no noise",
        "Catches seeds and most pulp",
        "Dishwasher-safe removable parts",
        "Non-slip weighted base",
      ]),
      faq_json: JSON.stringify([
        { q: "Can it juice pomegranates?", a: "PressMate is designed for citrus. Pomegranate seeds can jam the cone." },
        { q: "Is it sturdy enough for daily use?", a: "The frame is cast aluminum rated for daily kitchen use." },
      ]),
      included_json: JSON.stringify(["PressMate juicer body", "Stainless pressing cone", "Recipe card"]),
      tags_json: JSON.stringify(["kitchen", "juicer", "citrus"]),
      seo_title: "FEMZYK PressMate Manual Citrus Juicer — Lever Press",
      seo_description: "Lever-press citrus juicer: more juice, less effort. No cords, dishwasher-safe parts, non-slip base.",
      supplier_id: supId("Northwind Home Goods"), supplier_sku: "NW-PMS-115",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-CBX-008", slug: "femzyk-createbox-diy-craft-kit",
      name: "FEMZYK CreateBox DIY Craft Kit",
      short_description: "A complete weekend craft project in one box — materials, tools and a step-by-step guide.",
      description: `CreateBox is a complete project, not a box of loose supplies. Each kit includes pre-cut materials, the tools you need and an illustrated step-by-step guide, so you can start immediately and finish with something you actually made.\n\nThis season's project: a woven wall hanging with two color palettes to choose from. No experience needed — the guide assumes none.`,
      price_cents: 4499, stock_qty: 36, weight_grams: 900,
      publish_at: daysAgo(10), created_at: daysAgo(10),
      specs_json: JSON.stringify([
        ["Project", "Woven wall hanging, 16 × 20 in"],
        ["Skill level", "Beginner — no experience needed"],
        ["Time", "Approximately 3–4 hours"],
        ["Palettes", "Terracotta Dusk or Coastal Calm"],
      ]),
      features_json: JSON.stringify([
        "Everything included — start immediately",
        "Illustrated step-by-step guide",
        "Pre-cut, quality-checked materials",
        "A finished piece you made yourself",
        "Great solo project or shared activity",
      ]),
      faq_json: JSON.stringify([
        { q: "Is it suitable for kids?", a: "The kit is designed for ages 14+. Younger crafters can complete it with an adult." },
        { q: "Do I need any extra tools?", a: "No — all required tools are included." },
      ]),
      included_json: JSON.stringify(["Pre-cut yarn and warp threads", "Wooden loom frame", "Weaving tools", "Hanging hardware", "Illustrated guide"]),
      tags_json: JSON.stringify(["craft", "diy", "gift", "creative"]),
      seo_title: "FEMZYK CreateBox DIY Craft Kit — Woven Wall Hanging",
      seo_description: "Complete DIY craft kit: materials, tools and an illustrated guide. Make a woven wall hanging in a weekend.",
      supplier_id: supId("Northwind Home Goods"), supplier_sku: "NW-CBX-072",
    },
    {
      ...base,
      type_code: "PHYSICAL_PRODUCT",
      sku: "FZ-MCT-009", slug: "femzyk-modern-cat-home",
      name: "FEMZYK Modern Cat Home Accessory",
      short_description: "A felt-and-wood cat hideaway your cat will claim — and your living room won't mind.",
      description: `Most cat furniture looks like cat furniture. This one doesn't.\n\nThe hideaway combines a sturdy birch-ply frame with a dense felt cave, positioned at a height cats actually prefer. The felt pad is removable for washing, and the footprint fits comfortably beside a sofa or under a shelf.`,
      price_cents: 4999, stock_qty: 24, weight_grams: 2600,
      publish_at: daysAgo(8), created_at: daysAgo(8),
      specs_json: JSON.stringify([
        ["Material", "Birch plywood frame, dense felt cave"],
        ["Dimensions", "18 × 15 × 16 in"],
        ["Weight limit", "Cats up to 18 lb"],
        ["Care", "Removable, hand-washable felt pad"],
      ]),
      features_json: JSON.stringify([
        "Low-profile design that suits real interiors",
        "Elevated platform cats prefer for resting",
        "Removable washable felt pad",
        "Sturdy birch-ply construction",
        "Assembles in about five minutes",
      ]),
      faq_json: JSON.stringify([
        { q: "Will my cat actually use it?", a: "Most cats take to enclosed, elevated spots quickly. Placing it near a window or your seating area helps." },
        { q: "Is it stable?", a: "The frame is rated to 18 lb and includes anti-slip feet." },
      ]),
      included_json: JSON.stringify(["Birch-ply frame (flat-packed)", "Felt cave + pad", "Anti-slip feet", "Assembly tool"]),
      tags_json: JSON.stringify(["cat", "furniture", "pet", "home"]),
      seo_title: "FEMZYK Modern Cat Home — Felt & Wood Cat Hideaway",
      seo_description: "A modern cat hideaway in birch ply and washable felt. Elevated, sturdy, living-room friendly.",
      supplier_id: supId("Companion Pet Supply Co."), supplier_sku: "CP-MCT-19",
    },
    {
      ...base,
      type_code: "DIGITAL_PRODUCT",
      sku: "FZ-DIG-010", slug: "femzyk-business-creator-template-bundle",
      name: "FEMZYK Business Creator Template Bundle",
      short_description: "Twelve ready-to-use business templates: proposals, invoices, launch checklists and a content planner.",
      description: `The Business Creator Bundle gives small-business owners and freelancers the documents they need on day one — professionally structured, easy to edit, and formatted for US, Canadian, UK and international use.\n\nIncludes 12 templates: proposal, invoice, quote, service agreement outline, project brief, content calendar, launch checklist, pricing worksheet, client onboarding checklist, social post planner, expense tracker and a simple one-page business plan.\n\nInstant download after purchase. Free updates when templates improve.`,
      price_cents: 3999, compare_at_cents: 4999,
      track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      is_featured: 1, is_bestseller: 1, publish_at: daysAgo(15), created_at: daysAgo(15),
      warranty_text: null, return_eligible: 0,
      return_notes: "Digital product — see our Digital Product Policy. Support is available if your files don't work.",
      digital_file_type: "PDF + editable formats", digital_file_size: "≈ 24 MB", digital_version: "2.3",
      digital_download_limit: 12, digital_expiry_days: 365,
      specs_json: JSON.stringify([
        ["Templates", "12"],
        ["Formats", "PDF, DOCX and Google Docs links"],
        ["Pages", "140+ pages of editable content"],
        ["Updates", "Free lifetime updates"],
      ]),
      features_json: JSON.stringify([
        "12 business templates covering proposals to launch",
        "Editable in Word and Google Docs",
        "Structured for real client and finance workflows",
        "Free updates as templates improve",
        "Instant secure download after purchase",
      ]),
      faq_json: JSON.stringify([
        { q: "What formats are included?", a: "Every template ships as PDF plus DOCX, with Google Docs links where applicable." },
        { q: "Can I use these for client work?", a: "Yes — use them for your own business and clients. Redistribution of the raw files is not permitted." },
        { q: "How do I get the files?", a: "Immediately after payment you'll receive a secure download link, also available in your account under Downloads." },
      ]),
      included_json: JSON.stringify(["Proposal template", "Invoice & quote templates", "Launch checklist", "Content calendar", "Pricing worksheet", "+ 7 more templates"]),
      tags_json: JSON.stringify(["business", "templates", "freelance", "digital"]),
      seo_title: "FEMZYK Business Creator Template Bundle — 12 Editable Templates",
      seo_description: "Proposals, invoices, checklists and planners — 12 editable business templates delivered instantly.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-BCB-23",
    },
    {
      ...base,
      type_code: "DIGITAL_PRODUCT",
      sku: "FZ-DIG-011", slug: "complete-beginners-guide-to-building-websites",
      name: "Complete Beginner's Guide to Building Websites",
      short_description: "A practical, project-based guide that takes you from zero to a published website.",
      description: `This guide walks you through building and publishing a real website — no prior experience assumed.\n\nYou'll learn how the web actually works, plan a site structure, build pages with HTML and CSS, make them responsive, and publish to a live domain. Each chapter ends with a working milestone, so you ship progress as you learn.\n\nIncludes code examples, checklists and a bonus deployment cheat sheet.`,
      price_cents: 1999, track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      publish_at: daysAgo(9), created_at: daysAgo(9),
      warranty_text: null, return_eligible: 0,
      return_notes: "Digital product — see our Digital Product Policy.",
      digital_file_type: "PDF + code examples", digital_file_size: "≈ 18 MB", digital_version: "1.4",
      digital_download_limit: 12, digital_expiry_days: 365,
      specs_json: JSON.stringify([
        ["Pages", "212"],
        ["Format", "PDF + ZIP of code examples"],
        ["Level", "Complete beginner"],
        ["Updates", "Free lifetime updates"],
      ]),
      features_json: JSON.stringify([
        "From zero to a published website",
        "Project-based: build as you read",
        "Covers structure, design basics, HTML/CSS and deployment",
        "Bonus deployment cheat sheet",
      ]),
      faq_json: JSON.stringify([
        { q: "Do I need to know how to code?", a: "No. The guide starts from absolute zero." },
        { q: "Is it up to date?", a: "Yes — updated regularly, and every purchase includes lifetime updates." },
      ]),
      included_json: JSON.stringify(["212-page PDF guide", "Code example ZIP", "Deployment cheat sheet"]),
      tags_json: JSON.stringify(["web-development", "guide", "beginner", "digital"]),
      seo_title: "Beginner's Guide to Building Websites — FEMZYK Digital",
      seo_description: "A practical 212-page guide: build and publish your first website from scratch. Instant download.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-WBG-14",
    },
    {
      ...base,
      type_code: "DIGITAL_PRODUCT",
      sku: "FZ-DIG-012", slug: "python-programming-for-complete-beginners",
      name: "Python Programming for Complete Beginners",
      short_description: "Learn Python by building small, real projects — from your first line of code onward.",
      description: `A friendly, practical introduction to Python for people who have never programmed before.\n\nYou'll write code from chapter one, building small projects as you go: a guessing game, a to-do list, a file organizer and a simple web scraper. Every concept is introduced with a reason — why it exists, where you'll use it.\n\nIncludes exercise solutions and a what-to-learn-next roadmap.`,
      price_cents: 1999, track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      publish_at: daysAgo(7), created_at: daysAgo(7),
      warranty_text: null, return_eligible: 0,
      return_notes: "Digital product — see our Digital Product Policy.",
      digital_file_type: "PDF + exercise files", digital_file_size: "≈ 15 MB", digital_version: "1.2",
      digital_download_limit: 12, digital_expiry_days: 365,
      specs_json: JSON.stringify([
        ["Pages", "186"],
        ["Format", "PDF + exercise ZIP"],
        ["Level", "Complete beginner"],
        ["Python version", "3.11+"],
      ]),
      features_json: JSON.stringify([
        "Project-based learning from chapter one",
        "Clear explanations of why, not just how",
        "Exercise solutions included",
        "What-to-learn-next roadmap",
      ]),
      faq_json: JSON.stringify([
        { q: "Do I need a powerful computer?", a: "No — any laptop from the last ~8 years runs Python comfortably." },
        { q: "Will it prepare me for a job?", a: "It builds a solid foundation. Pair it with practice and further study; we include a roadmap for that." },
      ]),
      included_json: JSON.stringify(["186-page PDF guide", "Exercise files ZIP", "Solutions PDF", "Learning roadmap"]),
      tags_json: JSON.stringify(["python", "programming", "beginner", "digital"]),
      seo_title: "Python Programming for Complete Beginners — FEMZYK Digital",
      seo_description: "Learn Python by building real mini-projects. Beginner-friendly, with exercises and solutions. Instant download.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-PYB-12",
    },
    {
      ...base,
      type_code: "SERVICE",
      sku: "FZ-SVC-101", slug: "business-website-development",
      name: "Business Website Development",
      short_description: "A professionally designed, fast, mobile-ready website for your business — scoped, quoted and delivered on a timeline.",
      description: `We design and build professional business websites: clear structure, fast loading, mobile-first and easy for you to update.\n\nYou'll start by choosing a package or requesting a custom quote. After payment, you submit your requirements through your project dashboard, and our team handles design, build, review rounds and launch.\n\nEvery site ships with basic SEO setup, contact form, analytics-ready structure and a handover guide.`,
      price_cents: 49900, track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      is_featured: 1, publish_at: daysAgo(30), created_at: daysAgo(30),
      warranty_text: "30-day post-launch support included.",
      return_eligible: 0, return_notes: "Services are governed by our Service Terms. Milestone-based reviews protect both sides.",
      service_quote_type: "starting", service_delivery_min_days: 7, service_delivery_max_days: 21,
      service_revisions: 2,
      service_included_json: JSON.stringify([
        "Custom design matched to your brand",
        "Mobile-first responsive build",
        "Up to 5 content pages (package-dependent)",
        "Contact form with spam protection",
        "Basic on-page SEO",
        "Performance optimization",
        "Launch support and handover guide",
      ]),
      service_excluded_json: JSON.stringify([
        "Logo and full brand identity design",
        "Copywriting (we structure your copy; writing is yours or add-on)",
        "Domain and hosting fees",
        "Third-party paid plugin licenses",
      ]),
      service_process_json: JSON.stringify([
        ["Brief", "You share requirements and references in your project dashboard."],
        ["Design", "We prepare a design direction for your approval."],
        ["Build", "We develop the site with your content."],
        ["Review", "Two structured revision rounds."],
        ["Launch", "We deploy, test and hand over with documentation."],
      ]),
      service_requirements_json: JSON.stringify([
        { id: "business_name", label: "Business name", type: "text", required: true },
        { id: "purpose", label: "What should the website achieve?", type: "textarea", required: true },
        { id: "audience", label: "Who are your customers?", type: "textarea", required: false },
        { id: "references", label: "Websites you like (links)", type: "textarea", required: false },
        { id: "brand", label: "Brand colors / logo (describe or upload)", type: "textarea", required: false },
        { id: "content", label: "Do you have text and images ready?", type: "select", options: ["Yes, ready", "Partially", "Not yet"], required: true },
        { id: "timeline", label: "Any deadline we should know about?", type: "text", required: false },
      ]),
      tags_json: JSON.stringify(["web-development", "website", "service"]),
      seo_title: "Business Website Development — FEMZYK Web Development",
      seo_description: "Professional business websites: custom design, mobile-first build, SEO-ready. Packages from $499.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-SVC-BWD",
    },
    {
      ...base,
      type_code: "SERVICE",
      sku: "FZ-SVC-102", slug: "landing-page-development",
      name: "Landing Page Development",
      short_description: "One focused page, built to convert — for launches, campaigns and lead generation.",
      description: `A landing page has one job: turn visitors into leads or customers. We design and build a single high-performance page around your offer.\n\nYou'll get a clean, fast, mobile-first page with clear sections, your call-to-action wired up (form, booking or checkout link) and the basics of conversion-friendly structure handled for you.\n\nIdeal for product launches, campaigns, events and validating new offers.`,
      price_cents: 24900, track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      publish_at: daysAgo(28), created_at: daysAgo(28),
      warranty_text: "14-day post-launch support included.",
      return_eligible: 0, return_notes: "Services are governed by our Service Terms.",
      service_quote_type: "starting", service_delivery_min_days: 4, service_delivery_max_days: 10,
      service_revisions: 2,
      service_included_json: JSON.stringify([
        "One conversion-focused page",
        "Mobile-first responsive design",
        "CTA wiring (form / link / booking)",
        "Fast loading, clean code",
        "Launch checklist",
      ]),
      service_excluded_json: JSON.stringify(["Multi-page site structure", "Paid ad management", "Copywriting (we'll structure yours)"]),
      service_process_json: JSON.stringify([
        ["Brief", "Tell us the offer, audience and goal."],
        ["Design", "A single strong direction, fast."],
        ["Build", "Pixel-careful implementation."],
        ["Launch", "Deploy and verify everything works."],
      ]),
      service_requirements_json: JSON.stringify([
        { id: "offer", label: "What is the page promoting?", type: "textarea", required: true },
        { id: "goal", label: "Primary goal (leads, sales, signups…)", type: "text", required: true },
        { id: "audience", label: "Who is it for?", type: "textarea", required: false },
        { id: "references", label: "Pages you like (links)", type: "textarea", required: false },
        { id: "cta", label: "What should the button do?", type: "text", required: true },
      ]),
      tags_json: JSON.stringify(["web-development", "landing-page", "service"]),
      seo_title: "Landing Page Development — FEMZYK Web Development",
      seo_description: "High-converting landing pages for launches and campaigns. Fast, mobile-first, from $249.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-SVC-LPD",
    },
    {
      ...base,
      type_code: "SERVICE",
      sku: "FZ-SVC-103", slug: "website-maintenance-care",
      name: "Website Maintenance & Care",
      short_description: "Keep an existing website fast, secure and up to date — one clear monthly service.",
      description: `Websites need ongoing care: updates, backups, speed and security checks. This service covers it in one clear monthly scope.\n\nEach month we update software and dependencies, verify backups, check performance and security basics, and make small content changes (up to 2 hours) so your site stays current without you touching code.\n\nYou'll receive a short monthly report of what was done. No lock-in: cancel any month.`,
      price_cents: 7900, track_inventory: 0, stock_qty: 0, requires_shipping: 0, weight_grams: null,
      publish_at: daysAgo(25), created_at: daysAgo(25),
      warranty_text: null,
      return_eligible: 0, return_notes: "Billed monthly. Cancel anytime per Service Terms.",
      service_quote_type: "fixed", service_delivery_min_days: 1, service_delivery_max_days: 3,
      service_revisions: 0,
      service_included_json: JSON.stringify([
        "Software & dependency updates",
        "Backup verification",
        "Performance and security checks",
        "Up to 2 hours of small content changes",
        "Monthly summary report",
      ]),
      service_excluded_json: JSON.stringify(["Major redesigns", "New feature development (quoted separately)", "Hosting fees"]),
      service_process_json: JSON.stringify([
        ["Onboarding", "We get access and take a baseline."],
        ["Monthly cycle", "Updates, checks and your content changes."],
        ["Report", "A clear summary of everything done."],
      ]),
      service_requirements_json: JSON.stringify([
        { id: "site_url", label: "Website URL", type: "text", required: true },
        { id: "platform", label: "Platform / how it was built", type: "text", required: false },
        { id: "access", label: "How should we get access? (we'll follow up securely)", type: "textarea", required: true },
        { id: "priority", label: "Anything that needs attention first?", type: "textarea", required: false },
      ]),
      tags_json: JSON.stringify(["web-development", "maintenance", "service"]),
      seo_title: "Website Maintenance & Care — FEMZYK Web Development",
      seo_description: "Monthly website care: updates, backups, speed and security checks plus small content changes. $79/month, no lock-in.",
      supplier_id: supId("FEMZYK Digital Studio"), supplier_sku: "FD-SVC-WMC",
    },
  ];

  for (const p of products) {
    P.run(p);
  }

  // Product ↔ categories
  const pc = ins("INSERT OR IGNORE INTO product_categories (product_id, category_id) VALUES (?, ?)");
  const catId = (slug: string) => (db.prepare("SELECT id FROM categories WHERE slug = ?").get(slug) as any)?.id;
  const prodId = (slug: string) => (db.prepare("SELECT id FROM products WHERE slug = ?").get(slug) as any)?.id;
  const assign = (slug: string, cats: string[]) => {
    const pid = prodId(slug);
    for (const c of cats) {
      const cid = catId(c);
      if (cid && pid) pc.run(pid, cid);
    }
  };
  assign("femzyk-lumora-candle-warmer", ["home", "home-fragrance", "decor", "gifts", "gifts-for-her", "home-gifts"]);
  assign("femzyk-nova-dog-grooming-kit", ["pets", "dogs", "grooming", "pet-gifts"]);
  assign("femzyk-rover-travel-organizer", ["pets", "pet-travel", "dogs", "travel"]);
  assign("femzyk-neatspace-organization-set", ["home", "organization", "storage"]);
  assign("femzyk-slow-morning-ceramic-set", ["kitchen", "drinkware", "lifestyle", "personal-lifestyle", "gifts", "home-gifts"]);
  assign("femzyk-creator-desk-kit", ["desk-work", "desk-organization", "workspace", "desk-accessories"]);
  assign("femzyk-pressmate-manual-juicer", ["kitchen", "kitchen-tools", "food-preparation", "gifts-for-him"]);
  assign("femzyk-createbox-diy-craft-kit", ["gifts", "home-gifts", "lifestyle", "everyday-essentials"]);
  assign("femzyk-modern-cat-home", ["pets", "cats", "pet-accessories", "pet-gifts"]);
  assign("femzyk-business-creator-template-bundle", ["digital", "templates", "business-resources", "digital-gifts"]);
  assign("complete-beginners-guide-to-building-websites", ["digital", "guides", "web-development", "educational-resources"]);
  assign("python-programming-for-complete-beginners", ["digital", "guides", "programming", "educational-resources"]);
  assign("business-website-development", ["web-dev-services", "websites", "business-websites"]);
  assign("landing-page-development", ["web-dev-services", "landing-pages"]);
  assign("website-maintenance-care", ["web-dev-services", "maintenance"]);

  // ── Images ───────────────────────────────────────────────────────────────
  const img = ins("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)");
  const imgFor = (slug: string, file: string, alt: string, role = "primary") => img.run(prodId(slug), `/images/products/${file}`, alt, role, 0);
  imgFor("femzyk-lumora-candle-warmer", "lumora.jpg", "FEMZYK LUMORA candle warmer lamp glowing beside a jar candle on a side table");
  imgFor("femzyk-nova-dog-grooming-kit", "nova.jpg", "FEMZYK NOVA dog grooming kit laid out with brushes and case");
  imgFor("femzyk-rover-travel-organizer", "rover.jpg", "FEMZYK Rover travel organizer installed on a car seat-back with bottles and toys");
  imgFor("femzyk-neatspace-organization-set", "neatspace.jpg", "FEMZYK NeatSpace modular bins organized on a shelf");
  imgFor("femzyk-slow-morning-ceramic-set", "slowmorning.jpg", "FEMZYK Slow Morning ceramic mugs and bowls on a breakfast table");
  imgFor("femzyk-creator-desk-kit", "creatordesk.jpg", "FEMZYK Creator Desk Kit arranged on a tidy desk with laptop");
  imgFor("femzyk-pressmate-manual-juicer", "pressmate.jpg", "FEMZYK PressMate manual juicer pressing a citrus half");
  imgFor("femzyk-createbox-diy-craft-kit", "createbox.jpg", "FEMZYK CreateBox craft kit with loom and yarn colors");
  imgFor("femzyk-modern-cat-home", "cathome.jpg", "FEMZYK modern cat home with felt cave beside a sofa");
  const digitalImg = db.prepare("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)");
  digitalImg.run(prodId("femzyk-business-creator-template-bundle"), "/images/digital/template-bundle.jpg", "Business Creator Template Bundle preview showing template covers", "primary", 0);
  digitalImg.run(prodId("complete-beginners-guide-to-building-websites"), "/images/digital/webdev-guide.jpg", "Complete Beginner's Guide to Building Websites cover", "primary", 0);
  digitalImg.run(prodId("python-programming-for-complete-beginners"), "/images/digital/python-guide.jpg", "Python Programming for Complete Beginners cover", "primary", 0);
  const svcImg = db.prepare("INSERT INTO product_images (product_id, url, alt, role, position) VALUES (?, ?, ?, ?, ?)");
  for (const s of ["business-website-development", "landing-page-development", "website-maintenance-care"]) {
    svcImg.run(prodId(s), "/images/services/webdev.jpg", "FEMZYK web development workspace with website designs on screen", "primary", 0);
  }

  // ── Variants ─────────────────────────────────────────────────────────────
  const v = ins("INSERT INTO product_variants (product_id, sku, name, options_json, price_delta_cents, stock_qty) VALUES (?, ?, ?, ?, ?, ?)");
  v.run(prodId("femzyk-lumora-candle-warmer"), "FZ-LUM-001-BLK", "Charcoal Black", JSON.stringify({ Color: "Charcoal Black" }), 0, 26);
  v.run(prodId("femzyk-lumora-candle-warmer"), "FZ-LUM-001-IVR", "Warm Ivory", JSON.stringify({ Color: "Warm Ivory" }), 0, 20);
  v.run(prodId("femzyk-modern-cat-home"), "FZ-MCT-009-GRY", "Slate Grey", JSON.stringify({ Color: "Slate Grey" }), 0, 14);
  v.run(prodId("femzyk-modern-cat-home"), "FZ-MCT-009-SND", "Sand Beige", JSON.stringify({ Color: "Sand Beige" }), 0, 10);
  v.run(prodId("femzyk-business-creator-template-bundle"), "FZ-DIG-010-ESS", "Essentials (8 templates)", JSON.stringify({ Edition: "Essentials" }), -1000, 999999);
  v.run(prodId("femzyk-business-creator-template-bundle"), "FZ-DIG-010-CMP", "Complete (12 templates)", JSON.stringify({ Edition: "Complete" }), 1000, 999999);

  // ── Service packages ─────────────────────────────────────────────────────
  const pk = ins("INSERT INTO service_packages (product_id, name, price_cents, description, features_json, is_popular, position) VALUES (?, ?, ?, ?, ?, ?, ?)");
  pk.run(prodId("business-website-development"), "Starter Website", 49900, "A focused 3-page site for new businesses.", JSON.stringify(["3 content pages", "Mobile-first design", "Contact form", "Basic SEO", "1 revision round"]), 0, 0);
  pk.run(prodId("business-website-development"), "Business Website", 89900, "The complete site for an established business.", JSON.stringify(["5 content pages", "Custom design direction", "Contact form + map", "On-page SEO", "Analytics-ready", "2 revision rounds"]), 1, 1);
  pk.run(prodId("business-website-development"), "Professional Website", 149900, "For businesses ready to scale their presence.", JSON.stringify(["Up to 8 pages", "Advanced design system", "Blog-ready structure", "Performance tuning", "Priority timeline", "3 revision rounds"]), 0, 2);
  pk.run(prodId("landing-page-development"), "Campaign Landing Page", 24900, "One page, one goal, done well.", JSON.stringify(["Single conversion-focused page", "Mobile-first", "CTA wiring", "2 revision rounds"]), 1, 0);
  pk.run(prodId("website-maintenance-care"), "Monthly Care Plan", 7900, "Everything in one clear monthly scope.", JSON.stringify(["Updates & backups check", "Speed & security checks", "2 hours content changes", "Monthly report", "Cancel anytime"]), 1, 0);

  // ── Collections ──────────────────────────────────────────────────────────
  const col = ins("INSERT INTO collections (slug, name, description, rule_json, position) VALUES (?, ?, ?, ?, ?)");
  col.run("bestsellers", "Bestsellers", "Our most-purchased products, ranked by real sales.", JSON.stringify({ sort: "bestselling", limit: 8 }), 1);
  col.run("new-arrivals", "New Arrivals", "Recently published products.", JSON.stringify({ sort: "new", limit: 8 }), 2);
  col.run("under-35", "Under $35", "Great products that keep things affordable.", JSON.stringify({ maxPrice: 35, limit: 8 }), 3);
  col.run("home-favorites", "Home Favorites", "Pieces our customers choose for calmer homes.", "[]", 4);
  col.run("workspace-picks", "Workspace Picks", "Made for focused desks.", "[]", 5);
  col.run("pet-essentials", "Pet Essentials", "Care, travel and comfort for pets.", "[]", 6);
  col.run("digital-starter-kit", "Digital Starter Kit", "Guides and templates to start building today.", JSON.stringify({ type: "DIGITAL_PRODUCT", limit: 8 }), 7);
  col.run("web-creator-collection", "Web Creator Collection", "Resources and services for people building on the web.", "[]", 8);
  col.run("femzyk-picks", "FEMZYK Picks", "Featured products from across the store.", JSON.stringify({ sort: "featured", limit: 8 }), 9);
  const cpick = ins("INSERT INTO collection_products (collection_id, product_id, position) VALUES (?, ?, ?)");
  const colId = (slug: string) => (db.prepare("SELECT id FROM collections WHERE slug = ?").get(slug) as any)?.id;
  ["femzyk-lumora-candle-warmer", "femzyk-neatspace-organization-set", "femzyk-slow-morning-ceramic-set", "femzyk-createbox-diy-craft-kit"].forEach((s, i) => cpick.run(colId("home-favorites"), prodId(s), i));
  ["femzyk-creator-desk-kit", "femzyk-business-creator-template-bundle", "complete-beginners-guide-to-building-websites"].forEach((s, i) => cpick.run(colId("workspace-picks"), prodId(s), i));
  ["femzyk-nova-dog-grooming-kit", "femzyk-rover-travel-organizer", "femzyk-modern-cat-home"].forEach((s, i) => cpick.run(colId("pet-essentials"), prodId(s), i));
  ["complete-beginners-guide-to-building-websites", "python-programming-for-complete-beginners", "business-website-development", "landing-page-development"].forEach((s, i) => cpick.run(colId("web-creator-collection"), prodId(s), i));

  // ── Shipping zones & methods ─────────────────────────────────────────────
  const z = ins("INSERT INTO shipping_zones (code, name, countries_json) VALUES (?, ?, ?)");
  z.run("US", "United States", JSON.stringify(["US"]));
  z.run("CA", "Canada", JSON.stringify(["CA"]));
  z.run("GB", "United Kingdom", JSON.stringify(["GB"]));
  z.run("INTL", "International", JSON.stringify(["*"]));
  const zoneId = (code: string) => (db.prepare("SELECT id FROM shipping_zones WHERE code = ?").get(code) as any)?.id;
  const sm = ins("INSERT INTO shipping_methods (zone_id, name, price_cents, free_threshold_cents, min_days, max_days) VALUES (?, ?, ?, ?, ?, ?)");
  sm.run(zoneId("US"), "Standard Shipping", 499, 7500, 3, 7);
  sm.run(zoneId("CA"), "Standard Shipping", 999, 10000, 7, 14);
  sm.run(zoneId("GB"), "Standard Shipping", 899, 9000, 6, 12);
  sm.run(zoneId("INTL"), "International Shipping", 1499, null, 10, 21);

  // ── Coupons ──────────────────────────────────────────────────────────────
  const cpn = ins("INSERT INTO coupons (code, type, value_cents, min_subtotal_cents, usage_limit, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  cpn.run("WELCOME10", "percent", 1000, 0, 500, t, null);
  cpn.run("LAUNCH15", "percent", 1500, 5000, 200, t, null);

  // ── FAQ ──────────────────────────────────────────────────────────────────
  const faq = ins("INSERT INTO faq_items (category, question, answer, position) VALUES (?, ?, ?, ?)");
  const faqs: [string, string, string][] = [
    ["Orders & Payment", "Which payment methods do you accept?", "We accept major debit and credit cards through our payment processors (currently operating in test mode — live card processing activates when our payment provider keys are connected). Your card details are handled by the payment provider's secure checkout, never stored on our servers."],
    ["Orders & Payment", "Is checkout secure?", "Yes. Payments are processed by PCI-compliant providers, payment results are verified server-side, and we never store card numbers."],
    ["Orders & Payment", "Can I check out without an account?", "Yes — guest checkout is fully supported. You can create an account after purchase if you want order history and downloads in one place."],
    ["Shipping & Delivery", "Where do you ship?", "We ship to the United States, Canada, the United Kingdom and internationally. Delivery estimates are shown at checkout based on your country."],
    ["Shipping & Delivery", "How fast is delivery?", "Estimates depend on your location — typically 3–7 business days in the US, 6–14 days to Canada and the UK, and 10–21 days internationally. We show a realistic range at checkout and in your order confirmation."],
    ["Shipping & Delivery", "Can I track my order?", "Yes. Use the Track Order page with your order number and email, or sign in to your account to see live order status."],
    ["Returns", "What is your return policy?", "Physical products can be returned within 30 days in original condition for a refund. Return eligibility is shown on every product page. Digital products are non-returnable once downloaded — see the Digital Product Policy."],
    ["Digital Products", "How do I receive digital products?", "Immediately after payment you'll get a secure download link by email and in your account under Downloads. Downloads are private and limited to your purchase."],
    ["Digital Products", "What if a digital product is updated?", "Purchases include free updates. We'll notify you when a new version is available."],
    ["Web Development Services", "How do web development services work?", "Choose a package, pay securely, then submit your requirements through your project dashboard. Our team designs, builds and launches with structured review rounds. You can track status the whole way."],
    ["Web Development Services", "What if I need something custom?", "Contact us with your requirements and we'll prepare a scoped quote. Nothing starts until you approve the scope and price."],
  ];
  faqs.forEach(([c, q2, a], i) => faq.run(c, q2, a, i));

  // ── Content pages (admin-editable legal & info pages) ───────────────────
  const page = ins("INSERT OR IGNORE INTO content_pages (slug, title, body_md) VALUES (?, ?, ?)");
  page.run("shipping", "Shipping Policy",
`## Where we ship

We ship physical products to the United States, Canada, the United Kingdom and most international destinations. Digital products and services are delivered online, worldwide.

## Shipping rates & estimates

Shipping costs are calculated at checkout based on your delivery country. Current estimates:

| Destination | Method | Cost | Estimated delivery |
|---|---|---|---|
| United States | Standard | $4.99 — free over $75 | 3–7 business days |
| Canada | Standard | $9.99 — free over $100 | 7–14 business days |
| United Kingdom | Standard | $8.99 — free over $90 | 6–12 business days |
| International | Standard | $14.99 | 10–21 business days |

These are realistic estimates based on our carriers' typical performance, not guarantees. If your delivery is running late, contact us with your order number and we'll investigate.

## Processing time

Orders are typically processed within 1–2 business days. You'll receive a confirmation email when your order ships, with tracking where available.

## Duties & taxes

For international orders, local customs duties or taxes may apply. These are set by your country and are the recipient's responsibility.`);
  page.run("returns", "Returns & Refunds Policy",
`## 30-day returns on physical products

If you're not satisfied with a physical product, you can return it within 30 days of delivery in its original condition for a refund of the product price.

**To start a return:** contact us with your order number and the reason for the return. We'll reply with return instructions.

## Conditions

- Items must be unused and in original packaging where possible.
- Return shipping is the customer's responsibility unless the item arrived damaged or incorrect.
- Refunds are issued to the original payment method within 5–7 business days of us receiving the return.

## Damaged or incorrect items

If something arrives damaged or we sent the wrong item, contact us within 7 days with photos if possible. We'll resolve it with a replacement or full refund — including shipping.

## Digital products

Digital products are non-returnable once downloaded, because they can't be "given back". If your download doesn't work or a file is corrupted, contact us — we'll fix it or refund you.

## Services

Web development services follow the Service Terms. Work already performed is billed for; unstarted work is fully refundable.`);
  page.run("privacy", "Privacy Policy",
`## What we collect

When you shop with us we collect only what's needed to serve you: your name, email, delivery address (for physical orders), order history, and account details if you create an account.

Payments are handled by our payment providers — we never see or store your card number.

## How we use it

- To process and deliver your orders
- To provide support and order updates
- To improve our products and website
- To send emails you've asked for (order updates, downloads, receipts)

We do **not** sell your personal information. We do **not** use invasive third-party tracking.

## Digital purchases

Your purchases and download activity are stored so you can access them in your account. Download links are private and tied to your purchase.

## Your rights

You can request a copy of your data, correct it, or ask us to delete your account and associated data at any time by contacting support.

## Cookies

We use essential cookies for your cart and session, and optional first-party analytics. See our Cookie Policy.

## Contact

Questions about privacy? Email support and we'll answer plainly.`);
  page.run("terms", "Terms of Service",
`## 1. The basics

These terms govern your use of FEMZYK MARKET, operated by FEMZYK ENTERPRISES. By placing an order you agree to these terms.

## 2. Products & pricing

We describe products as accurately as we can. Prices are shown in your selected currency at checkout; the charge total is the amount shown on the final review step. We reserve the right to correct pricing errors before dispatch.

## 3. Orders

An order is confirmed when payment is verified and you receive an order confirmation. We may cancel orders in cases of suspected fraud or pricing errors — you'll be refunded in full.

## 4. Digital products

Digital purchases grant you a personal, non-transferable license to download and use the content. You may not resell or redistribute the raw files.

## 5. Services

Web development services are governed by the Service Terms and the scope agreed in your project dashboard.

## 6. Returns

See our Returns & Refunds Policy.

## 7. Liability

To the maximum extent permitted by law, our liability for any claim is limited to the amount you paid for the relevant product or service.

## 8. Changes

We may update these terms; material changes will be announced on the website. Continued use after changes means you accept them.

## 9. Contact

Questions about these terms? Contact support.`);
  page.run("cookies", "Cookie Policy",
`## What cookies we use

**Essential cookies** — required for the site to work: your shopping cart, your session when signed in, and your display currency. You can't opt out of these.

**Analytics (first-party)** — we record anonymous usage events (pages viewed, searches, purchases) to understand what's useful. No third-party ad trackers.

## What we don't do

- No third-party advertising trackers
- No selling browsing data
- No dark patterns around consent

You can clear cookies in your browser at any time; your cart will be reset.`);
  page.run("digital-products", "Digital Product Policy",
`## Delivery

Digital products are delivered instantly after payment is verified. You'll receive a secure download link by email and in your account under **Downloads**.

## Download limits

Each purchase includes a generous number of downloads (shown on the product page) and access for the stated period — typically 12 months, with purchased versions yours to keep. Lost your access? Contact support and we'll restore it once we verify your purchase.

## Updates

When a digital product you own is updated, you get the new version free and we'll notify you.

## Compatibility

File formats are listed on each product page. If a file doesn't open or is corrupted, contact us and we'll fix it or refund you.

## Refunds on digital products

Because digital files can't be returned, digital products are non-refundable once downloaded — but if the product is materially not as described or technically unusable, we'll make it right with a fix or refund.`);
  page.run("service-terms", "Service Terms",
`## Scope

Every web development project starts with requirements submitted through your project dashboard. The agreed scope, timeline and price are recorded there before work begins.

## Payment

Standard packages are paid upfront. Custom projects may be scoped with milestone payments — always agreed in writing before work starts.

## Revisions

Included revision rounds are listed on each service. Extra revisions or scope changes are quoted transparently before any additional charge.

## Your responsibilities

Timely feedback and content (text, images, credentials) keep projects on schedule. Delays in client feedback extend the timeline correspondingly.

## Ownership

Once final payment is received, the delivered website and assets are yours. Third-party licenses (fonts, plugins, stock) remain under their own terms.

## Refunds

Work already performed is billed for. Before work begins, projects are fully refundable. See also the returns policy.

## Support

Every build includes a post-launch support window listed on the service page. After that, our maintenance service is available.`);
  page.run("about", "About FEMZYK",
`## Who we are

FEMZYK MARKET is the ecommerce and digital-commerce division of **FEMZYK ENTERPRISES** — a growing technology and digital-focused brand that brings together practical products, digital resources and technology services.

## What we believe

- **Practical over hype.** We sell things that genuinely improve everyday routines — at home, at work, online.
- **Transparency builds trust.** Clear pricing, honest delivery estimates, real policies, and support you can actually reach.
- **Quality compounds.** Whether it's a candle warmer, a Python guide or a business website, we'd rather ship fewer things done properly.

## What we offer

1. **Physical products** — carefully selected home, pet, kitchen, desk and lifestyle goods.
2. **Digital products** — guides, templates and resources delivered instantly.
3. **Web development** — professional websites, landing pages and maintenance for businesses.

## Where we're going

FEMZYK MARKET is built to grow: more categories, more digital resources, and more services — always under the same promise of quality and honesty.`);

  // ── Site settings ────────────────────────────────────────────────────────
  const set = ins("INSERT OR IGNORE INTO site_settings (key, value_json) VALUES (?, ?)");
  set.run("currency_rates", JSON.stringify({ USD: 1, CAD: 1.36, GBP: 0.79, NGN: 1550 }));
  set.run("home_hero", JSON.stringify({
    title: "Smart products. Digital solutions. Better everyday living.",
    subtitle: "Discover thoughtfully selected products, useful digital resources and practical web solutions designed to make work and everyday life better.",
  }));
  set.run("promotion", JSON.stringify({ active: false, message: "", ends_at: null }));

  // ── A handful of initial reviews (marked as seeded) ─────────────────────
  // The platform otherwise only shows verified, moderated customer reviews.
  const rev = ins(
    "INSERT INTO reviews (product_id, rating, title, body, author_name, is_verified, is_seed, status, created_at) VALUES (?, ?, ?, ?, ?, 0, 1, 'approved', ?)"
  );
  rev.run(prodId("femzyk-lumora-candle-warmer"), 5, "No more open flames in the bedroom",
    "I stopped burning candles because of my cat. This warms them without a flame and the dimmer is genuinely useful. Heats my candle evenly within about 20 minutes.", "Maya R.", daysAgo(12));
  rev.run(prodId("femzyk-lumora-candle-warmer"), 4, "Great, wish the cable were longer",
    "Works exactly as described — my candles last longer and melt evenly. Only small wish: a longer cable. Otherwise very happy.", "D. Okafor", daysAgo(6));
  rev.run(prodId("femzyk-creator-desk-kit"), 5, "My desk finally looks intentional",
    "The mat is bigger than I expected (in a good way) and the weighted cable holder actually stays put. Good quality for the price.", "Sofia M.", daysAgo(9));
  rev.run(prodId("femzyk-nova-dog-grooming-kit"), 5, "My golden actually enjoys it",
    "The slicker brush is gentle and the case keeps everything together. First grooming kit where my dog stays calm.", "James T.", daysAgo(11));
  rev.run(prodId("femzyk-business-creator-template-bundle"), 5, "Saved me a week of formatting",
    "The proposal and invoice templates are genuinely well structured. Edited everything in Google Docs without issues.", "Amara N.", daysAgo(5));
  rev.run(prodId("business-website-development"), 5, "Clear process from start to launch",
    "The requirements dashboard made it easy to brief the team, and the revision rounds were structured. My site launched on the estimated date.", "R. Whitfield", daysAgo(4));

  console.log("[seed] FEMZYK MARKET seeded: categories, products, services, policies and configuration.");
}
