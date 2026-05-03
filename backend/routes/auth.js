const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../db/firebase');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password required' });

    const snap = await getDb().collection('users')
      .where('email', '==', email.toLowerCase().trim()).limit(1).get();

    if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });

    const doc  = snap.docs[0];
    const user = { id: doc.id, ...doc.data() };

    if (!bcrypt.compareSync(password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

router.get('/me', authenticate, (req, res) => {
  const { id, name, email, role } = req.user;
  res.json({ user: { id, name, email, role } });
});

router.post('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ error: 'Both passwords required' });

    const doc  = await getDb().collection('users').doc(req.user.id).get();
    const user = doc.data();

    if (!bcrypt.compareSync(currentPassword, user.password_hash))
      return res.status(400).json({ error: 'Current password is incorrect' });

    await getDb().collection('users').doc(req.user.id)
      .update({ password_hash: bcrypt.hashSync(newPassword, 10) });
    res.json({ message: 'Password changed successfully' });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
