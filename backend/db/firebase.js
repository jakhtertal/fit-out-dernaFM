const admin  = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');
const path   = require('path');
const fs     = require('fs');

let firestoreDb = null;

function getDb() {
  if (!firestoreDb) throw new Error('Firebase not initialised yet.');
  return firestoreDb;
}

// Synchronous init — works in Cloud Functions AND local
function initFirebase() {
  if (admin.apps.length) return; // Already initialised

  if (process.env.FIREBASE_CONFIG || process.env.K_SERVICE) {
    // Running inside Firebase Cloud Functions — credentials are automatic
    admin.initializeApp();
    console.log('🔑  Firebase: Cloud Functions (auto credentials)');
  } else if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON)),
    });
    console.log('🔑  Firebase: env variable credentials');
  } else {
    const saPath = path.join(__dirname, '..', 'firebase-service-account.json');
    if (!fs.existsSync(saPath)) {
      const msg = 'Firebase credentials not found. Set FIREBASE_SERVICE_ACCOUNT_JSON env variable in Vercel dashboard.';
      console.error('❌ ' + msg);
      throw new Error(msg);   // throw instead of process.exit — works in serverless
    }
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(fs.readFileSync(saPath, 'utf8'))),
    });
  }

  firestoreDb = admin.firestore();
  console.log('✅  Firebase Firestore connected');

  // Seed runs async/non-blocking — won't delay first request
  seedDatabase()
    .then(() => console.log('✅  Database seed complete'))
    .catch(err => console.error('⚠️  Seed error:', err.message));
}

async function seedDatabase() {
  const db = firestoreDb;

  const types = [
    { code: 'daily_general',   name: 'Daily General Inspection',   allowed_roles: 'fitout_inspector,manager,admin', order: 1 },
    { code: 'daily_hse',       name: 'Daily HSE Inspection',        allowed_roles: 'hseq_inspector,manager,admin',  order: 2 },
    { code: 'ceiling_closure', name: 'Ceiling Closure Inspection',  allowed_roles: 'fitout_inspector,manager,admin', order: 3 },
    { code: 'pre_opening',     name: 'Pre-Opening Inspection',      allowed_roles: 'fitout_inspector,manager,admin', order: 4 },
    { code: 'post_opening',    name: 'Post Opening Inspection',     allowed_roles: 'fitout_inspector,manager,admin', order: 5 },
  ];
  for (const t of types) {
    const ref = db.collection('inspection_types').doc(t.code);
    if (!(await ref.get()).exists) await ref.set(t);
  }

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

  for (const [typeCode, items] of Object.entries(defaults)) {
    const existing = await db.collection('checklist_items')
      .where('type_code', '==', typeCode).limit(1).get();
    if (!existing.empty) continue;
    const batch = db.batch();
    items.forEach((text, idx) =>
      batch.set(db.collection('checklist_items').doc(uuidv4()), {
        type_code: typeCode, item_text: text, order_index: idx,
        created_at: new Date().toISOString(),
      })
    );
    await batch.commit();
  }

  const usersSnap = await db.collection('users').limit(1).get();
  if (usersSnap.empty) {
    await db.collection('users').doc(uuidv4()).set({
      name: 'System Admin', email: 'admin@derna.com',
      password_hash: bcrypt.hashSync('admin123', 10),
      role: 'admin', created_at: new Date().toISOString(),
    });
    console.log('✅  Default admin: admin@derna.com / admin123');
  }
}

module.exports = { getDb, initFirebase };
