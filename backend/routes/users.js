const express = require('express');
const bcrypt  = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../db/firebase');
const { authenticate, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const snap  = await getDb().collection('users').orderBy('name').get();
    const users = snap.docs.map(d => {
      const { password_hash, ...safe } = d.data();
      return { id: d.id, ...safe };
    });
    res.json(users);
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.post('/', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password || !role)
      return res.status(400).json({ error: 'name, email, password and role are required' });

    const validRoles = ['admin', 'manager', 'hseq_inspector', 'fitout_inspector'];
    if (!validRoles.includes(role)) return res.status(400).json({ error: 'Invalid role' });
    if (role === 'admin' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only admins can create admin users' });

    const db   = getDb();
    const snap = await db.collection('users').where('email', '==', email.toLowerCase()).limit(1).get();
    if (!snap.empty) return res.status(400).json({ error: 'Email already exists' });

    const id = uuidv4();
    await db.collection('users').doc(id).set({
      name, email: email.toLowerCase(),
      password_hash: bcrypt.hashSync(password, 10),
      role, created_at: new Date().toISOString(), created_by: req.user.id,
    });
    res.status(201).json({ id, name, email: email.toLowerCase(), role });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.put('/:id', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { name, role, password } = req.body;
    if (role === 'admin' && req.user.role !== 'admin')
      return res.status(403).json({ error: 'Only admins can assign the admin role' });

    const db  = getDb();
    const doc = await db.collection('users').doc(req.params.id).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (name)     updates.name          = name;
    if (role)     updates.role          = role;
    if (password) updates.password_hash = bcrypt.hashSync(password, 10);

    if (Object.keys(updates).length) await db.collection('users').doc(req.params.id).update(updates);

    const updated = await db.collection('users').doc(req.params.id).get();
    const { password_hash, ...safe } = updated.data();
    res.json({ id: updated.id, ...safe });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.delete('/:id', authenticate, requireRole('admin'), async (req, res) => {
  try {
    if (req.params.id === req.user.id)
      return res.status(400).json({ error: 'Cannot delete yourself' });
    await getDb().collection('users').doc(req.params.id).delete();
    res.json({ message: 'User deleted' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
