const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const snap  = await getDb().collection('shops').orderBy('shop_no').get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await getDb().collection('shops').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Shop not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { shop_no, shop_name, floor, zone, lease_status } = req.body;
    if (!shop_no || !shop_name || !floor || !zone)
      return res.status(400).json({ error: 'shop_no, shop_name, floor, zone are required' });

    const db   = getDb();
    const dup  = await db.collection('shops').where('shop_no', '==', shop_no).limit(1).get();
    if (!dup.empty) return res.status(400).json({ error: 'Shop number already exists' });

    const id  = uuidv4();
    const now = new Date().toISOString();
    const ls  = lease_status || 'Vacant';

    await db.collection('shops').doc(id).set({
      shop_no, shop_name, floor, zone,
      lease_status: ls, fitout_status: 'Not Started',
      created_at: now, updated_at: now,
    });
    const doc = await db.collection('shops').doc(id).get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { shop_no, shop_name, floor, zone, lease_status, fitout_status } = req.body;
    const db  = getDb();
    const doc = await db.collection('shops').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Shop not found' });
    const existing = doc.data();

    if (shop_no && shop_no !== existing.shop_no) {
      const dup = await db.collection('shops').where('shop_no', '==', shop_no).limit(1).get();
      if (!dup.empty && dup.docs[0].id !== req.params.id)
        return res.status(400).json({ error: 'Shop number already exists' });
    }

    const updates = { updated_at: new Date().toISOString() };
    if (shop_no)      updates.shop_no      = shop_no;
    if (shop_name)    updates.shop_name    = shop_name;
    if (floor)        updates.floor        = floor;
    if (zone)         updates.zone         = zone;
    if (lease_status) updates.lease_status = lease_status;
    if (fitout_status)updates.fitout_status= fitout_status;

    await db.collection('shops').doc(req.params.id).update(updates);
    const updated = await db.collection('shops').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    await getDb().collection('shops').doc(req.params.id).delete();
    res.json({ message: 'Shop deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
