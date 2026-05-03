const express  = require('express');
const PDFDocument = require('pdfkit');
const ExcelJS  = require('exceljs');
const path     = require('path');
const fs       = require('fs');
const { getDb } = require('../db/firebase');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const COMPANY = 'DERNA FM';
const PROJECT = 'SUMOU GATE MADINAH';
const PRIMARY = '#1e3a5f';
const ACCENT  = '#FFD700';
const LOGO_PATH = path.join(__dirname, '..', 'uploads', 'logo.png');

// ── PDF header ────────────────────────────────────────────────────────────────
function pdfHeader(doc, title) {
  const W = doc.page.width;
  doc.rect(0, 0, W, 85).fill(PRIMARY);

  // Logo (if exists)
  const logoFiles = ['logo.png','logo.jpg','logo.jpeg','logo.webp']
    .map(f => path.join(__dirname, '..', 'uploads', f))
    .find(p => fs.existsSync(p));

  let textX = 20;
  if (logoFiles) {
    try { doc.image(logoFiles, 15, 10, { height: 60, fit: [70, 65] }); textX = 95; }
    catch (_) { textX = 20; }
  }

  doc.fillColor('white').fontSize(22).font('Helvetica-Bold').text(COMPANY, textX, 16);
  doc.fillColor(ACCENT).fontSize(11).font('Helvetica').text(PROJECT, textX, 42);
  doc.fillColor('white').fontSize(9)
     .text(`Generated: ${new Date().toLocaleDateString('en-GB')}`, W - 200, 34, { width: 185, align: 'right' });

  doc.fillColor('black').moveDown(3);
  if (title) {
    doc.fontSize(16).font('Helvetica-Bold').fillColor(PRIMARY).text(title, { align: 'center' });
    doc.moveDown(0.5).fillColor('black');
  }
}

// ── Excel branding ────────────────────────────────────────────────────────────
function excelBrand(sheet, cols) {
  sheet.mergeCells(1, 1, 1, cols);
  const c1 = sheet.getCell('A1');
  c1.value = COMPANY; c1.font = { bold: true, size: 18, color: { argb: 'FFFFFFFF' } };
  c1.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };
  c1.alignment = { horizontal: 'center' };

  sheet.mergeCells(2, 1, 2, cols);
  const c2 = sheet.getCell('A2');
  c2.value = PROJECT; c2.font = { bold: true, size: 12, color: { argb: 'FFFFD700' } };
  c2.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1e3a5f' } };
  c2.alignment = { horizontal: 'center' };

  sheet.addRow([]);
}
function excelHdr(row) {
  row.eachCell(c => {
    c.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2c5f8f' } };
    c.alignment = { horizontal: 'center' };
  });
}

// ── PDF table ─────────────────────────────────────────────────────────────────
function pdfTable(doc, headers, rows, colWidths, startX, pageH) {
  let y = doc.y + 4;
  const rowH = 18;
  const tableW = colWidths.reduce((a, b) => a + b, 0);

  const drawRow = (cells, bg, fg, bold) => {
    if (bg) doc.rect(startX, y, tableW, rowH).fill(bg);
    doc.fillColor(fg || 'black').fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica');
    let x = startX;
    cells.forEach((cell, i) => {
      doc.text(String(cell ?? ''), x + 3, y + 4, { width: colWidths[i] - 6, lineBreak: false, ellipsis: true });
      x += colWidths[i];
    });
    y += rowH; doc.fillColor('black');
  };

  drawRow(headers, PRIMARY, 'white', true);
  rows.forEach((row, idx) => {
    if (y + rowH > (pageH || 760)) { doc.addPage(); pdfHeader(doc, null); y = doc.y + 4; drawRow(headers, PRIMARY, 'white', true); }
    drawRow(row, idx % 2 === 0 ? '#f4f7fb' : null, 'black', false);
  });
  doc.y = y + 4;
}

// ══ /shops ════════════════════════════════════════════════════════════════════
router.get('/shops', authenticate, async (req, res) => {
  try {
    const { format = 'pdf', lease_status, fitout_status } = req.query;
    let snap = await getDb().collection('shops').orderBy('shop_no').get();
    let shops = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (lease_status)  shops = shops.filter(s => s.lease_status  === lease_status);
    if (fitout_status) shops = shops.filter(s => s.fitout_status === fitout_status);

    const title = `Shops Report${lease_status ? ' – ' + lease_status : ''}${fitout_status ? ' – ' + fitout_status : ''}`;
    const headers = ['Shop No.', 'Shop Name', 'Floor', 'Zone', 'Lease Status', 'Fit-Out Status'];

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Shops');
      excelBrand(ws, 6); excelHdr(ws.addRow(headers));
      shops.forEach(s => ws.addRow([s.shop_no, s.shop_name, s.floor, s.zone, s.lease_status, s.fitout_status]));
      ws.columns.forEach(c => { c.width = 22; });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=shops-report.xlsx');
      return await wb.xlsx.write(res), res.end();
    }
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=shops-report.pdf');
    doc.pipe(res); pdfHeader(doc, title);
    pdfTable(doc, headers, shops.map(s => [s.shop_no, s.shop_name, s.floor, s.zone, s.lease_status, s.fitout_status]), [60,150,55,55,95,110], 35);
    doc.end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ══ /issues ═══════════════════════════════════════════════════════════════════
router.get('/issues', authenticate, async (req, res) => {
  try {
    const { format = 'pdf', type, status, shop_id } = req.query;
    let snap = await getDb().collection('issues').orderBy('created_at', 'desc').get();
    let issues = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (type)    issues = issues.filter(i => i.type    === type);
    if (status)  issues = issues.filter(i => i.status  === status);
    if (shop_id) issues = issues.filter(i => i.shop_id === shop_id);

    const label = type === 'violation' ? 'Violations Report' : type === 'issue' ? 'Issues Report' : 'Issues & Violations Report';
    const headers = ['Shop No.', 'Shop Name', 'Type', 'Description', 'Status', 'Created By', 'Date'];

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Issues');
      excelBrand(ws, 7); excelHdr(ws.addRow(headers));
      issues.forEach(i => ws.addRow([i.shop_no, i.shop_name, i.type?.toUpperCase(), i.description, i.status, i.created_by_name, new Date(i.created_at).toLocaleDateString('en-GB')]));
      ws.columns.forEach(c => { c.width = 22; });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=issues-report.xlsx');
      return await wb.xlsx.write(res), res.end();
    }
    const doc = new PDFDocument({ margin: 35, size: 'A4', layout: 'landscape' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=issues-report.pdf');
    doc.pipe(res); pdfHeader(doc, label);
    pdfTable(doc, headers, issues.map(i => [i.shop_no, i.shop_name, i.type?.toUpperCase(), i.description, i.status, i.created_by_name, new Date(i.created_at).toLocaleDateString('en-GB')]), [55,110,65,230,75,110,70], 35, 540);
    doc.end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ══ /dashboard ════════════════════════════════════════════════════════════════
router.get('/dashboard', authenticate, async (req, res) => {
  try {
    const { format = 'pdf' } = req.query;
    const db = getDb();
    const [shopsSnap, issuesSnap] = await Promise.all([db.collection('shops').get(), db.collection('issues').get()]);

    const shops  = shopsSnap.docs.map(d => d.data());
    const issues = issuesSnap.docs.map(d => d.data());
    const totalShops = shops.length;
    const byLease = {}, byFitout = {};
    shops.forEach(s => { byLease[s.lease_status] = (byLease[s.lease_status]||0)+1; byFitout[s.fitout_status] = (byFitout[s.fitout_status]||0)+1; });
    const openIssues     = issues.filter(i => i.type==='issue'     && i.status!=='Closed').length;
    const openViolations = issues.filter(i => i.type==='violation' && i.status!=='Closed').length;

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Dashboard');
      excelBrand(ws, 2); excelHdr(ws.addRow(['Metric','Value']));
      ws.addRow(['Total Shops', totalShops]); ws.addRow(['Open Issues', openIssues]); ws.addRow(['Open Violations', openViolations]);
      ws.addRow([]); excelHdr(ws.addRow(['Lease Status','Count'])); Object.entries(byLease).forEach(([l,c]) => ws.addRow([l,c]));
      ws.addRow([]); excelHdr(ws.addRow(['Fit-Out Status','Count'])); Object.entries(byFitout).forEach(([l,c]) => ws.addRow([l,c]));
      ws.columns.forEach(c => { c.width = 30; });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=dashboard-report.xlsx');
      return await wb.xlsx.write(res), res.end();
    }
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=dashboard-report.pdf');
    doc.pipe(res); pdfHeader(doc, 'Dashboard Summary Report');
    const box = (label, val, x, y, color) => {
      doc.rect(x, y, 130, 65).fill(color).fillColor('white').fontSize(10).font('Helvetica').text(label, x+5, y+10, {width:120,align:'center'}).fontSize(26).font('Helvetica-Bold').text(String(val), x+5, y+28, {width:120,align:'center'}); doc.fillColor('black');
    };
    const yBox = doc.y + 10;
    box('Total Shops', totalShops, 50, yBox, PRIMARY);
    box('Open Issues', openIssues, 200, yBox, '#e74c3c');
    box('Open Violations', openViolations, 350, yBox, '#e67e22');
    doc.y = yBox + 80;
    doc.fontSize(13).font('Helvetica-Bold').fillColor(PRIMARY).text('By Lease Status').moveDown(0.3);
    pdfTable(doc, ['Lease Status','Count'], Object.entries(byLease).map(([l,c])=>[l,c]), [300,200], 50);
    doc.moveDown();
    doc.fontSize(13).font('Helvetica-Bold').fillColor(PRIMARY).text('By Fit-Out Status').moveDown(0.3);
    pdfTable(doc, ['Fit-Out Status','Count'], Object.entries(byFitout).map(([l,c])=>[l,c]), [300,200], 50);
    doc.end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

// ══ /inspections ══════════════════════════════════════════════════════════════
router.get('/inspections', authenticate, async (req, res) => {
  try {
    const { format = 'pdf', type_code, shop_id } = req.query;
    let snap = await getDb().collection('inspections').orderBy('submitted_at','desc').get();
    let data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (type_code) data = data.filter(i => i.type_code === type_code);
    if (shop_id)   data = data.filter(i => i.shop_id   === shop_id);

    const headers = ['Shop No.', 'Shop Name', 'Inspection Type', 'Inspector', 'Date'];
    if (format === 'excel') {
      const wb = new ExcelJS.Workbook(); const ws = wb.addWorksheet('Inspections');
      excelBrand(ws, 5); excelHdr(ws.addRow(headers));
      data.forEach(r => ws.addRow([r.shop_no, r.shop_name, r.type_name, r.inspector_name, new Date(r.submitted_at).toLocaleDateString('en-GB')]));
      ws.columns.forEach(c => { c.width = 25; });
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=inspections-report.xlsx');
      return await wb.xlsx.write(res), res.end();
    }
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=inspections-report.pdf');
    doc.pipe(res); pdfHeader(doc, 'Inspections Report');
    pdfTable(doc, headers, data.map(r => [r.shop_no, r.shop_name, r.type_name, r.inspector_name, new Date(r.submitted_at).toLocaleDateString('en-GB')]), [65,150,150,120,80], 35);
    doc.end();
  } catch (err) { console.error(err); res.status(500).json({ error: 'Server error' }); }
});

module.exports = router;
