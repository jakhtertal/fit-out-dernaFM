const { DatabaseSync } = require('node:sqlite');
const { v4: uuidv4 }   = require('uuid');
const bcrypt           = require('bcryptjs');
const path             = require('path');
const fs               = require('fs');

const DB_PATH = path.join(__dirname, '..', 'data', 'derna_fm.db');
let db;

function getDb() {
  if (!db) {
    db = new DatabaseSync(DB_PATH);
    db.exec("PRAGMA journal_mode=WAL");
    db.exec("PRAGMA foreign_keys=ON");
  }
  return db;
}

function initializeDatabase() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin','manager','hseq_inspector','fitout_inspector')),
      created_at TEXT DEFAULT (datetime('now')),
      created_by TEXT
    );

    CREATE TABLE IF NOT EXISTS shops (
      id TEXT PRIMARY KEY,
      shop_no TEXT UNIQUE NOT NULL,
      shop_name TEXT NOT NULL,
      floor TEXT NOT NULL,
      zone TEXT NOT NULL,
      lease_status TEXT NOT NULL DEFAULT 'Vacant'
        CHECK(lease_status IN ('Vacant','LOI','Signed')),
      fitout_status TEXT NOT NULL DEFAULT 'Not Started'
        CHECK(fitout_status IN ('Not Started','Ongoing','Ceiling Closed','Ready to Open','Opened')),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS inspection_types (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      allowed_roles TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      inspection_type_id INTEGER NOT NULL,
      item_text TEXT NOT NULL,
      order_index INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (inspection_type_id) REFERENCES inspection_types(id)
    );

    CREATE TABLE IF NOT EXISTS inspections (
      id TEXT PRIMARY KEY,
      shop_id TEXT NOT NULL,
      inspection_type_id INTEGER NOT NULL,
      inspector_id TEXT NOT NULL,
      notes TEXT,
      submitted_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (inspection_type_id) REFERENCES inspection_types(id),
      FOREIGN KEY (inspector_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS inspection_responses (
      id TEXT PRIMARY KEY,
      inspection_id TEXT NOT NULL,
      checklist_item_id TEXT NOT NULL,
      response TEXT NOT NULL CHECK(response IN ('OK','NOT OK','N/A')),
      notes TEXT,
      FOREIGN KEY (inspection_id) REFERENCES inspections(id),
      FOREIGN KEY (checklist_item_id) REFERENCES checklist_items(id)
    );

    CREATE TABLE IF NOT EXISTS issues (
      id TEXT PRIMARY KEY,
      inspection_id TEXT,
      shop_id TEXT NOT NULL,
      checklist_item_id TEXT,
      type TEXT NOT NULL CHECK(type IN ('issue','violation')),
      description TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'Open'
        CHECK(status IN ('Open','Work Done','Closed')),
      created_by TEXT NOT NULL,
      work_done_by TEXT,
      closed_by TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (shop_id) REFERENCES shops(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);

  // Seed inspection types
  const types = [
    { code: 'daily_general',   name: 'Daily General Inspection',   roles: 'fitout_inspector,manager,admin' },
    { code: 'daily_hse',       name: 'Daily HSE Inspection',        roles: 'hseq_inspector,manager,admin'  },
    { code: 'ceiling_closure', name: 'Ceiling Closure Inspection',  roles: 'fitout_inspector,manager,admin' },
    { code: 'pre_opening',     name: 'Pre-Opening Inspection',      roles: 'fitout_inspector,manager,admin' },
    { code: 'post_opening',    name: 'Post Opening Inspection',     roles: 'fitout_inspector,manager,admin' },
  ];
  const insertType = db.prepare(`INSERT OR IGNORE INTO inspection_types (code,name,allowed_roles) VALUES (?,?,?)`);
  types.forEach(t => insertType.run(t.code, t.name, t.roles));

  // Default checklist items
  const defaults = {
    daily_general: [
      'Work permit displayed at shop entrance',
      'Workers wearing proper PPE (helmet, vest, safety shoes)',
      'Fire extinguisher present and accessible',
      'Site is clean and tidy',
      'No unauthorized materials stored in public areas',
      'Electrical work done by certified electricians only',
      'No damage to mall structure or finishes',
      'Contractor compliant with approved working hours',
    ],
    daily_hse: [
      'Safety signage displayed at all entry points',
      'All workers have valid IDs and work permits',
      'Fire evacuation route clear and unobstructed',
      'No chemical spills or hazardous materials exposed',
      'First aid kit available and stocked',
      'Noise levels within acceptable limits',
      'Dust control measures in place',
      'Electrical panels properly secured',
    ],
    ceiling_closure: [
      'All MEP rough-in completed and tested',
      'Ceiling grid properly installed and level',
      'Fire sprinklers installed per approved drawings',
      'HVAC diffusers properly installed and connected',
      'Lighting fixtures installed and functional',
      'No exposed wiring above ceiling',
      'Ceiling tiles properly secured with no gaps',
      'Access panels installed where required',
    ],
    pre_opening: [
      'All fit-out works completed to approved design',
      'Shopfront signage installed and approved by mall management',
      'Flooring completed, clean and defect-free',
      'All lighting functional and properly positioned',
      'HVAC operational and balanced',
      'Plumbing tested and functional',
      'Security/alarm system installed and tested',
      'Emergency exit signage in place and illuminated',
      'All snagging items from previous inspections resolved',
      'Municipality approval obtained and displayed',
    ],
    post_opening: [
      'Shop trading license displayed at visible location',
      'All staff trained on emergency procedures',
      'Daily cleaning and maintenance maintained',
      'No unauthorized structural changes made',
      'All building systems operational',
    ],
  };

  const getTypeId  = db.prepare(`SELECT id FROM inspection_types WHERE code=?`);
  const countItems = db.prepare(`SELECT COUNT(*) AS cnt FROM checklist_items WHERE inspection_type_id=?`);
  const insertItem = db.prepare(`INSERT OR IGNORE INTO checklist_items (id,inspection_type_id,item_text,order_index) VALUES (?,?,?,?)`);

  Object.entries(defaults).forEach(([code, items]) => {
    const typeRow = getTypeId.get(code);
    if (!typeRow) return;
    if (countItems.get(typeRow.id).cnt === 0) {
      items.forEach((text, idx) => insertItem.run(uuidv4(), typeRow.id, text, idx));
    }
  });

  // Seed admin user if none
  const userCount = db.prepare(`SELECT COUNT(*) AS cnt FROM users`).get();
  if (userCount.cnt === 0) {
    const hash = bcrypt.hashSync('admin123', 10);
    db.prepare(`INSERT INTO users (id,name,email,password_hash,role) VALUES (?,?,?,?,?)`)
      .run(uuidv4(), 'System Admin', 'admin@derna.com', hash, 'admin');
    console.log('✅ Default admin: admin@derna.com / admin123');
  }

  console.log('✅ Database initialized');
}

module.exports = { getDb, initializeDatabase };
