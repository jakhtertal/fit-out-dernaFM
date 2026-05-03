const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/types', authenticate, async (req, res) => {
  try {
    const snap = await getDb().collection('inspection_types').get();
    const types = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order || 0) - (b.order || 0));
    res.json(types);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:typeCode', authenticate, async (req, res) => {
  try {
    const db      = getDb();
    const typeDoc = await db.collection('inspection_types').doc(req.params.typeCode).get();
    if (!typeDoc.exists) return res.status(404).json({ error: 'Inspection type not found' });

    // No orderBy in query — sort in JS to avoid composite index requirement
    const itemsSnap = await db.collection('checklist_items')
      .where('type_code', '==', req.params.typeCode).get();
    const items = itemsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    res.json({ type: { id: typeDoc.id, ...typeDoc.data() }, items });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/:typeCode/items', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { item_text } = req.body;
    if (!item_text) return res.status(400).json({ error: 'item_text is required' });

    const db      = getDb();
    const typeDoc = await db.collection('inspection_types').doc(req.params.typeCode).get();
    if (!typeDoc.exists) return res.status(404).json({ error: 'Inspection type not found' });

    const existing = await db.collection('checklist_items')
      .where('type_code', '==', req.params.typeCode).get();
    const maxIdx = existing.docs.reduce((m, d) => Math.max(m, d.data().order_index || 0), -1);

    const id = uuidv4();
    await db.collection('checklist_items').doc(id).set({
      type_code: req.params.typeCode, item_text,
      order_index: maxIdx + 1, created_at: new Date().toISOString(),
    });
    const doc = await db.collection('checklist_items').doc(id).get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/items/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { item_text, order_index } = req.body;
    const db  = getDb();
    const doc = await db.collection('checklist_items').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Item not found' });

    const updates = {};
    if (item_text !== undefined)   updates.item_text   = item_text;
    if (order_index !== undefined) updates.order_index = order_index;
    if (Object.keys(updates).length)
      await db.collection('checklist_items').doc(req.params.id).update(updates);

    const updated = await db.collection('checklist_items').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/items/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await getDb().collection('checklist_items').doc(req.params.id).delete();
    res.json({ message: 'Item deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
