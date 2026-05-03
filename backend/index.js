require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { initFirebase } = require('./db/firebase');

// Init Firebase immediately (sync connect, async seed)
initFirebase();

const app  = express();
const PORT = process.env.PORT || 3001;

process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection:', reason?.message || reason);
});

app.use(cors({
  origin: '*',   // Firebase Hosting serves same origin, so this is safe
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));

// API routes
app.use('/api/auth',        require('./routes/auth'));
app.use('/api/users',       require('./routes/users'));
app.use('/api/shops',       require('./routes/shops'));
app.use('/api/checklists',  require('./routes/checklists'));
app.use('/api/inspections', require('./routes/inspections'));
app.use('/api/issues',      require('./routes/issues'));
app.use('/api/dashboard',   require('./routes/dashboard'));
app.use('/api/reports',     require('./routes/reports'));
app.use('/api/settings',    require('./routes/settings'));

app.get('/health', (_req, res) => res.json({ status: 'ok', app: 'DERNA FM' }));

// Serve built React frontend (local/standalone mode)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) =>
    res.sendFile(path.join(frontendDist, 'index.html'))
  );
}

// ── Firebase Cloud Functions export ──────────────────────────────────────────
// Used when deployed via `firebase deploy`
if (process.env.FIREBASE_CONFIG || process.env.K_SERVICE) {
  exports.api = require('firebase-functions').https.onRequest(app);
} else {
  // Local / standalone mode
  app.listen(PORT, () =>
    console.log(`\n🏗️  DERNA FM  →  http://localhost:${PORT}\n`)
  );
}
