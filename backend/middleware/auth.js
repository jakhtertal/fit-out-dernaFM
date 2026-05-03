const jwt    = require('jsonwebtoken');
const { getDb } = require('../db/firebase');

const JWT_SECRET = process.env.JWT_SECRET || 'derna_fm_sumou_gate_2024_secret';

async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer '))
    return res.status(401).json({ error: 'No token provided' });
  try {
    const decoded = jwt.verify(header.split(' ')[1], JWT_SECRET);
    const doc = await getDb().collection('users').doc(decoded.id).get();
    if (!doc.exists) return res.status(401).json({ error: 'User not found' });
    req.user = { id: doc.id, ...doc.data() };
    next();
  } catch (err) {
    if (err.name && err.name.includes('JsonWebToken'))
      return res.status(401).json({ error: 'Invalid or expired token' });
    console.error('auth middleware error:', err);
    return res.status(500).json({ error: 'Authentication error' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
    if (!roles.includes(req.user.role))
      return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}

module.exports = { authenticate, requireRole, JWT_SECRET };
