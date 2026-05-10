require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { initFirebase } = require('./db/firebase');

initFirebase();

const app = express();

process.on('unhandledRejection', (reason) =>
  console.error('⚠️  Unhandled rejection:', reason?.message || reason)
);

app.use(cors({ origin: '*', credentials: true }));
app.use(express.json({ limit: '20mb' }));

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

module.exports = app;
