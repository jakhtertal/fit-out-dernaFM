const express = require('express');
const multer  = require('multer');
const { getDb } = require('../db/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

// Memory storage — no filesystem dependency, works on any cloud platform
const upload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/png','image/jpeg','image/webp'].includes(file.mimetype))
      cb(null, true);
    else
      cb(new Error('Only PNG, JPG, or WEBP accepted'));
  },
});

// GET /api/settings/logo — serve logo from Firestore
router.get('/logo', async (_req, res) => {
  try {
    const doc = await getDb().collection('settings').doc('logo').get();
    if (!doc.exists) return res.status(404).json({ error: 'No logo uploaded yet' });
    const { data, mimetype } = doc.data();
    res.set('Content-Type', mimetype);
    res.set('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(data, 'base64'));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// POST /api/settings/logo — upload logo (stored in Firestore as base64)
router.post('/logo',
  authenticate, requireRole('admin', 'manager'),
  upload.single('logo'),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: 'No file received' });
      const base64 = req.file.buffer.toString('base64');
      await getDb().collection('settings').doc('logo').set({
        data: base64,
        mimetype: req.file.mimetype,
        originalName: req.file.originalname,
        updatedAt: new Date().toISOString(),
      });
      res.json({ message: 'Logo uploaded successfully', url: '/api/settings/logo' });
    } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
  }
);

// DELETE /api/settings/logo
router.delete('/logo', authenticate, requireRole('admin'), async (_req, res) => {
  try {
    await getDb().collection('settings').doc('logo').delete();
    res.json({ message: 'Logo removed' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
