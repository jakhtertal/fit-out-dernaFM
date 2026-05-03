require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');
const fs      = require('fs');

const { initFirebase } = require('./db/firebase');

const app  = express();
const PORT = process.env.PORT || 3001;

// Prevent unhandled async errors from crashing the server
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled rejection (server kept alive):', reason?.message || reason);
});

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')   // support comma-separated list
    : ['http://localhost:5173', 'http://localhost:3001'],
  credentials: true,
}));
app.use(express.json({ limit: '20mb' }));

initFirebase().then(() => {
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

  // Serve built React frontend (production / Railway deployment)
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  if (fs.existsSync(frontendDist)) {
    app.use(express.static(frontendDist));
    // SPA fallback — all non-API routes return index.html
    app.get('*', (_req, res) =>
      res.sendFile(path.join(frontendDist, 'index.html'))
    );
    console.log('📦  Serving built frontend from', frontendDist);
  }

  app.listen(PORT, () =>
    console.log(`\n🏗️  DERNA FM  →  http://localhost:${PORT}\n`)
  );
}).catch(err => {
  console.error('Failed to start:', err.message);
  process.exit(1);
});
