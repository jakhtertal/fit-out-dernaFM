const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { shop_id, type, status } = req.query;
    const db = getDb();

    // Use single-field filter in Firestore, rest filtered in JS
    let query = db.collection('issues');
    if (shop_id) query = query.where('shop_id', '==', shop_id);
    else if (type)   query = query.where('type',    '==', type);
    else if (status) query = query.where('status',  '==', status);

    const snap = await query.get();
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // JS filtering for remaining conditions
    if (shop_id && type)   results = results.filter(i => i.type   === type);
    if (shop_id && status) results = results.filter(i => i.status === status);
    if (!shop_id && type && status) results = results.filter(i => i.status === status);

    // Sort by created_at desc
    results.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json(results);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const doc = await getDb().collection('issues').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Not found' });
    res.json({ id: doc.id, ...doc.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { shop_id, description, type } = req.body;
    if (!shop_id || !description)
      return res.status(400).json({ error: 'shop_id and description required' });

    const db      = getDb();
    const shopDoc = await db.collection('shops').doc(shop_id).get();
    if (!shopDoc.exists) return res.status(404).json({ error: 'Shop not found' });
    const shop = shopDoc.data();

    const issueType = type || (req.user.role === 'hseq_inspector' ? 'violation' : 'issue');
    const id  = uuidv4();
    const now = new Date().toISOString();

    await db.collection('issues').doc(id).set({
      inspection_id: null, shop_id,
      shop_no: shop.shop_no, shop_name: shop.shop_name,
      checklist_item_id: null, type: issueType,
      description, status: 'Open',
      created_by: req.user.id, created_by_name: req.user.name,
      work_done_by: null, work_done_by_name: null,
      closed_by: null, closed_by_name: null,
      created_at: now, updated_at: now,
    });
    const doc = await db.collection('issues').doc(id).get();
    res.status(201).json({ id: doc.id, ...doc.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id/status', authenticate, async (req, res) => {
  try {
    const { status } = req.body;
    const db  = getDb();
    const doc = await db.collection('issues').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Issue not found' });
    const issue = doc.data();
    const now   = new Date().toISOString();

    if (status === 'Work Done') {
      if (issue.created_by !== req.user.id)
        return res.status(403).json({ error: 'Only the inspector who opened this can mark it Work Done' });
      if (issue.status !== 'Open')
        return res.status(400).json({ error: 'Only Open issues can be marked Work Done' });
      await db.collection('issues').doc(req.params.id).update({
        status: 'Work Done', work_done_by: req.user.id,
        work_done_by_name: req.user.name, updated_at: now,
      });
    } else if (status === 'Closed') {
      if (!['admin', 'manager'].includes(req.user.role))
        return res.status(403).json({ error: 'Only managers can close issues' });
      if (issue.status !== 'Work Done')
        return res.status(400).json({ error: 'Issue must be Work Done before closing' });
      await db.collection('issues').doc(req.params.id).update({
        status: 'Closed', closed_by: req.user.id,
        closed_by_name: req.user.name, updated_at: now,
      });
    } else {
      return res.status(400).json({ error: 'Invalid status. Use "Work Done" or "Closed"' });
    }

    const updated = await db.collection('issues').doc(req.params.id).get();
    res.json({ id: updated.id, ...updated.data() });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
