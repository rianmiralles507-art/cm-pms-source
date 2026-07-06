import { useState } from 'react';
import { FileSpreadsheet, FileDown, ClipboardList, Wallet, AlertTriangle } from 'lucide-react';
import Layout from '../components/Layout';
import api from '../api/axios';

const REPORTS = [
  { key: 'contract-summary', title: 'Contract Summary Report', desc: 'All contracts with value, status, and amount paid to date.', icon: ClipboardList, tint: 'primary' },
  { key: 'payment-status', title: 'Payment Status Report', desc: 'Every payment across all contracts with its current status.', icon: Wallet, tint: 'accent' },
  { key: 'overdue-payments', title: 'Overdue Payments Report', desc: 'Payments that are past their due date and still unpaid.', icon: AlertTriangle, tint: 'danger' },
];

export default function Reports() {
  const [preview, setPreview] = useState(null);
  const [loadingKey, setLoadingKey] = useState('');

  async function loadPreview(key) {
    setLoadingKey(key);
    try {
      const res = await api.get(`/reports/${key}`);
      setPreview(res.data);
    } finally {
      setLoadingKey('');
    }
  }

  async function download(key, format) {
    const res = await api.get(`/reports/${key}/${format}`, { responseType: 'blob' });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${key}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  }

  const tints = {
    primary: { bg: 'var(--color-primary-soft)', fg: 'var(--color-primary)' },
    accent: { bg: 'var(--color-accent-soft)', fg: 'var(--color-accent)' },
    danger: { bg: 'var(--color-danger-soft)', fg: 'var(--color-danger)' },
  };

  return (
    <Layout title="Reports">
      <p className="text-sm text-slate-500 mb-5">Preview a report on screen, or export it as an Excel workbook or PDF for sharing.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {REPORTS.map((r) => {
          const t = tints[r.tint];
          return (
            <div key={r.key} className="card p-5 flex flex-col">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3" style={{ background: t.bg, color: t.fg }}>
                <r.icon size={18} />
              </div>
              <h3 className="font-display font-semibold text-slate-800 text-sm">{r.title}</h3>
              <p className="text-xs text-slate-500 mt-1 flex-1">{r.desc}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => loadPreview(r.key)} className="flex-1 text-xs font-medium py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  {loadingKey === r.key ? 'Loading…' : 'Preview'}
                </button>
                <button onClick={() => download(r.key, 'excel')} title="Export to Excel" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <FileSpreadsheet size={15} />
                </button>
                <button onClick={() => download(r.key, 'pdf')} title="Export to PDF" className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50">
                  <FileDown size={15} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {preview && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 font-display font-semibold text-slate-800 text-sm">{preview.title}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
                  {preview.columns.map((c) => <th key={c.key} className="px-5 py-2.5 font-medium">{c.header}</th>)}
                </tr>
              </thead>
              <tbody>
                {preview.rows.length === 0 && (
                  <tr><td colSpan={preview.columns.length} className="px-5 py-8 text-center text-slate-400">No records for this report.</td></tr>
                )}
                {preview.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-50">
                    {preview.columns.map((c) => <td key={c.key} className="px-5 py-2 text-slate-600">{row[c.key] ?? '—'}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
