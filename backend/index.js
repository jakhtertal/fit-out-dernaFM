const path    = require('path');
const fs      = require('fs');
const express = require('express');
const app     = require('./app');
const PORT    = process.env.PORT || 3001;

// Serve built React frontend (local standalone mode)
const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) =>
    res.sendFile(path.join(frontendDist, 'index.html'))
  );
}

app.listen(PORT, () =>
  console.log(`\n🏗️  DERNA FM  →  http://localhost:${PORT}\n`)
);
