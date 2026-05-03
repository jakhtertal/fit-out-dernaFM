const express = require('express');
const { getDb } = require('../db/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticate, async (req, res) => {
  try {
    const db = getDb();

    const [shopsSnap, issuesSnap] = await Promise.all([
      db.collection('shops').get(),
      db.collection('issues').get(),
    ]);

    const shops  = shopsSnap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (a.shop_no || '').localeCompare(b.shop_no || ''));
    const issues = issuesSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const totalShops = shops.length;
    const byLease = {}, byFitout = {};
    shops.forEach(s => {
      byLease[s.lease_status]   = (byLease[s.lease_status]   || 0) + 1;
      byFitout[s.fitout_status] = (byFitout[s.fitout_status] || 0) + 1;
    });

    const totalViolations = issues.filter(i => i.type === 'violation').length;
    const openViolations  = issues.filter(i => i.type === 'violation' && i.status !== 'Closed').length;
    const totalIssues     = issues.filter(i => i.type === 'issue').length;
    const openIssues      = issues.filter(i => i.type === 'issue'     && i.status !== 'Closed').length;

    // Completion % — fetch all inspections once, then filter in JS (no composite index needed)
    const [allInspSnap, allRespSnap] = await Promise.all([
      db.collection('inspections').get(),
      db.collection('inspection_responses').get(),
    ]);
    const allInspections = allInspSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const allResponses   = allRespSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const shopCompletions = shops.map(shop => {
      const getPercent = (typeCode) => {
        // Get latest inspection of this type for this shop
        const inspections = allInspections
          .filter(i => i.shop_id === shop.id && i.type_code === typeCode)
          .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

        if (!inspections.length) return null;

        const latestId  = inspections[0].id;
        const responses = allResponses.filter(r => r.inspection_id === latestId);
        if (!responses.length) return 0;

        const okCount = responses.filter(r => r.response === 'OK').length;
        return Math.round((okCount / responses.length) * 100);
      };

      return {
        id: shop.id, shop_no: shop.shop_no,
        shop_name: shop.shop_name, fitout_status: shop.fitout_status,
        ceiling_closure_pct: getPercent('ceiling_closure'),
        pre_opening_pct:     getPercent('pre_opening'),
      };
    });

    res.json({
      totalShops, byLease, byFitout,
      totalViolations, openViolations,
      totalIssues, openIssues,
      shopCompletions,
    });
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
