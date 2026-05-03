const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, async (req, res) => {
  try {
    const { shop_id, type_code, inspector_id, limit: lim } = req.query;
    const db = getDb();

    // Fetch with single-field filters only (no orderBy to avoid composite index)
    let query = db.collection('inspections');
    if (shop_id)      query = query.where('shop_id',      '==', shop_id);
    else if (type_code)    query = query.where('type_code',    '==', type_code);
    else if (inspector_id) query = query.where('inspector_id', '==', inspector_id);

    const snap = await query.get();
    let results = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Filter remaining conditions in JS
    if (shop_id && type_code)    results = results.filter(i => i.type_code    === type_code);
    if (shop_id && inspector_id) results = results.filter(i => i.inspector_id === inspector_id);
    if (!shop_id && type_code && inspector_id) results = results.filter(i => i.inspector_id === inspector_id);

    // Sort by submitted_at desc in JS
    results.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));
    if (lim) results = results.slice(0, parseInt(lim));

    res.json(results);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const db  = getDb();
    const doc = await db.collection('inspections').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'Inspection not found' });

    const respSnap = await db.collection('inspection_responses')
      .where('inspection_id', '==', req.params.id).get();
    const responses = respSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

    res.json({ id: doc.id, ...doc.data(), responses });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { shop_id, type_code, responses, notes } = req.body;
    if (!shop_id || !type_code || !responses || !Array.isArray(responses))
      return res.status(400).json({ error: 'shop_id, type_code, and responses[] are required' });

    const db = getDb();
    const [typeDoc, shopDoc] = await Promise.all([
      db.collection('inspection_types').doc(type_code).get(),
      db.collection('shops').doc(shop_id).get(),
    ]);
    if (!typeDoc.exists) return res.status(404).json({ error: 'Inspection type not found' });
    if (!shopDoc.exists) return res.status(404).json({ error: 'Shop not found' });

    const type = typeDoc.data();
    const shop = { id: shopDoc.id, ...shopDoc.data() };

    if (!type.allowed_roles.split(',').includes(req.user.role))
      return res.status(403).json({ error: 'Not authorised for this inspection type' });

    const id  = uuidv4();
    const now = new Date().toISOString();
    const isHSEQ = type_code === 'daily_hse';

    const batch = db.batch();
    batch.set(db.collection('inspections').doc(id), {
      shop_id, shop_no: shop.shop_no, shop_name: shop.shop_name,
      type_code, type_name: type.name,
      inspector_id: req.user.id, inspector_name: req.user.name,
      notes: notes || null, submitted_at: now,
    });

    for (const r of responses) {
      const itemDoc  = await db.collection('checklist_items').doc(r.checklist_item_id).get();
      const itemText = itemDoc.exists ? itemDoc.data().item_text : 'Unknown item';
      const orderIdx = itemDoc.exists ? (itemDoc.data().order_index || 0) : 0;

      batch.set(db.collection('inspection_responses').doc(uuidv4()), {
        inspection_id: id, checklist_item_id: r.checklist_item_id,
        item_text: itemText, order_index: orderIdx,
        response: r.response, notes: r.notes || null,
      });

      if (r.response === 'NOT OK') {
        const desc = r.notes ? `${itemText}: ${r.notes}` : itemText;
        batch.set(db.collection('issues').doc(uuidv4()), {
          inspection_id: id, shop_id, shop_no: shop.shop_no, shop_name: shop.shop_name,
          checklist_item_id: r.checklist_item_id,
          type: isHSEQ ? 'violation' : 'issue',
          description: desc, status: 'Open',
          created_by: req.user.id, created_by_name: req.user.name,
          work_done_by: null, work_done_by_name: null,
          closed_by: null, closed_by_name: null,
          created_at: now, updated_at: now,
        });
      }
    }

    await batch.commit();
    await applyFitoutTransition(db, shop, type_code, responses);

    res.status(201).json({ id, message: 'Inspection submitted successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

async function applyFitoutTransition(db, shop, typeCode, responses) {
  const hasNotOK = responses.some(r => r.response === 'NOT OK');
  const hasOK    = responses.some(r => r.response === 'OK');
  let newStatus  = null;

  if (typeCode === 'daily_general'   && shop.fitout_status === 'Not Started')    newStatus = 'Ongoing';
  if (typeCode === 'ceiling_closure' && shop.fitout_status === 'Ongoing'         && !hasNotOK && hasOK) newStatus = 'Ceiling Closed';
  if (typeCode === 'pre_opening'     && shop.fitout_status === 'Ceiling Closed'  && !hasNotOK && hasOK) newStatus = 'Ready to Open';

  if (newStatus)
    await db.collection('shops').doc(shop.id)
      .update({ fitout_status: newStatus, updated_at: new Date().toISOString() });
}

module.exports = router;
