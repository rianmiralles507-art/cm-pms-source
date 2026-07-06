const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const db = require('../config/db');
const { authenticate } = require('../middleware/auth');
const { logAction } = require('../utils/audit');

const router = express.Router();
router.use(authenticate);

function getContractSummary() {
  return db.prepare(`
    SELECT c.contract_code, c.title, c.client_name, c.status, c.total_value,
           COALESCE((SELECT SUM(amount) FROM payments WHERE contract_id = c.id AND status='Paid'),0) as paid_amount
    FROM contracts c ORDER BY c.created_at DESC
  `).all();
}

function getPaymentStatus() {
  return db.prepare(`
    SELECT p.payment_code, c.contract_code, c.title, p.amount, p.payment_type, p.due_date, p.paid_date, p.status
    FROM payments p JOIN contracts c ON c.id = p.contract_id ORDER BY p.due_date
  `).all();
}

function getOverduePayments() {
  return db.prepare(`
    SELECT p.payment_code, c.contract_code, c.title, c.client_name, p.amount, p.due_date
    FROM payments p JOIN contracts c ON c.id = p.contract_id WHERE p.status='Overdue' ORDER BY p.due_date
  `).all();
}

const REPORTS = {
  'contract-summary': { title: 'Contract Summary Report', getData: getContractSummary,
    columns: [
      { header: 'Contract Code', key: 'contract_code', width: 16 },
      { header: 'Title', key: 'title', width: 28 },
      { header: 'Client / Supplier', key: 'client_name', width: 22 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Total Value', key: 'total_value', width: 14 },
      { header: 'Paid Amount', key: 'paid_amount', width: 14 },
    ] },
  'payment-status': { title: 'Payment Status Report', getData: getPaymentStatus,
    columns: [
      { header: 'Payment Code', key: 'payment_code', width: 16 },
      { header: 'Contract Code', key: 'contract_code', width: 16 },
      { header: 'Contract Title', key: 'title', width: 26 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Type', key: 'payment_type', width: 12 },
      { header: 'Due Date', key: 'due_date', width: 12 },
      { header: 'Paid Date', key: 'paid_date', width: 12 },
      { header: 'Status', key: 'status', width: 10 },
    ] },
  'overdue-payments': { title: 'Overdue Payments Report', getData: getOverduePayments,
    columns: [
      { header: 'Payment Code', key: 'payment_code', width: 16 },
      { header: 'Contract Code', key: 'contract_code', width: 16 },
      { header: 'Title', key: 'title', width: 24 },
      { header: 'Client / Supplier', key: 'client_name', width: 20 },
      { header: 'Amount', key: 'amount', width: 12 },
      { header: 'Due Date', key: 'due_date', width: 12 },
    ] },
};

router.get('/:type/excel', async (req, res) => {
  const report = REPORTS[req.params.type];
  if (!report) return res.status(404).json({ message: 'Unknown report type.' });

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(report.title);
  sheet.columns = report.columns;
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCEEFB' } };

  report.getData().forEach((row) => sheet.addRow(row));

  logAction({ user: req.user, action: 'EXPORT_EXCEL', entityType: 'report', details: req.params.type });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.type}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});

router.get('/:type/pdf', (req, res) => {
  const report = REPORTS[req.params.type];
  if (!report) return res.status(404).json({ message: 'Unknown report type.' });

  const data = report.getData();
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename=${req.params.type}.pdf`);
  doc.pipe(res);

  doc.fontSize(18).fillColor('#1e3a8a').text('CM-PMS', { continued: false });
  doc.fontSize(14).fillColor('#111827').text(report.title);
  doc.fontSize(9).fillColor('#6b7280').text(`Generated: ${new Date().toLocaleString()}`);
  doc.moveDown();

  const colWidths = report.columns.map(c => c.width * 6);
  let y = doc.y;
  doc.fontSize(9).fillColor('#1e3a8a');
  let x = 40;
  report.columns.forEach((c, i) => { doc.text(c.header, x, y, { width: colWidths[i], continued: false }); x += colWidths[i]; });
  y += 16;
  doc.moveTo(40, y).lineTo(780, y).strokeColor('#dbeafe').stroke();
  y += 6;

  doc.fillColor('#111827').fontSize(8.5);
  data.forEach((row) => {
    if (y > 520) { doc.addPage(); y = 40; }
    x = 40;
    report.columns.forEach((c, i) => {
      const val = row[c.key] === null || row[c.key] === undefined ? '' : String(row[c.key]);
      doc.text(val, x, y, { width: colWidths[i] });
      x += colWidths[i];
    });
    y += 16;
  });

  logAction({ user: req.user, action: 'EXPORT_PDF', entityType: 'report', details: req.params.type });
  doc.end();
});

// JSON preview (for on-screen report viewing before export)
router.get('/:type', (req, res) => {
  const report = REPORTS[req.params.type];
  if (!report) return res.status(404).json({ message: 'Unknown report type.' });
  res.json({ title: report.title, columns: report.columns, rows: report.getData() });
});

module.exports = router;
