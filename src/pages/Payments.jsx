import { useEffect, useState, useCallback } from 'react';
import { Plus, CheckCircle2 } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const STATUSES = ['Pending', 'Paid', 'Overdue'];
const TYPES = ['Advance', 'Progress', 'Final'];

export default function Payments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ contract_id: '', amount: '', payment_type: 'Advance', due_date: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canManage = user?.role === 'finance_officer' || user?.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (statusFilter) params.status = statusFilter;
    api.get('/payments', { params }).then((res) => setPayments(res.data)).finally(() => setLoading(false));
  }, [statusFilter]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get('/contracts').then((res) => setContracts(res.data)); }, []);

  function openCreate() {
    setForm({ contract_id: '', amount: '', payment_type: 'Advance', due_date: '', notes: '' });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      await api.post('/payments', form);
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function markPaid(p) {
    if (!confirm(`Mark ${p.payment_code} as paid?`)) return;
    await api.post(`/payments/${p.id}/mark-paid`, {});
    load();
  }

  return (
    <Layout title="Payments">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter payments by status"
            className="text-sm rounded-xl border border-slate-200 py-2 px-3 bg-white outline-none focus:border-blue-400">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-sm text-slate-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
        </div>
        {canManage && (
          <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
            <Plus size={16} /> Record Payment
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Payment</th>
                <th className="px-5 py-3 font-medium">Contract</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium">Due Date</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading payments…</td></tr>}
              {!loading && payments.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No payments found.</td></tr>
              )}
              {!loading && payments.map((p) => (
                <tr key={p.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-slate-800">{p.payment_code}</td>
                  <td className="px-5 py-3 text-slate-600">
                    <p>{p.contract_title}</p>
                    <p className="text-xs text-slate-400">{p.contract_code}</p>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{p.payment_type}</td>
                  <td className="px-5 py-3 text-right font-medium text-slate-700">{PESO.format(p.amount)}</td>
                  <td className="px-5 py-3 text-slate-500">{p.due_date}{p.paid_date ? <><br /><span className="text-xs text-slate-400">Paid {p.paid_date}</span></> : null}</td>
                  <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                  <td className="px-5 py-3 text-right">
                    {canManage && p.status !== 'Paid' && (
                      <button onClick={() => markPaid(p)} title="Mark as paid" className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg" style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)' }}>
                        <CheckCircle2 size={14} /> Mark Paid
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record Payment" width="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract</label>
            <select required value={form.contract_id} onChange={(e) => setForm({ ...form, contract_id: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none">
              <option value="">Select a contract…</option>
              {contracts.map((c) => <option key={c.id} value={c.id}>{c.contract_code} — {c.title}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Amount (₱)</label>
              <input type="number" min="0" step="0.01" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Payment Type</label>
              <select value={form.payment_type} onChange={(e) => setForm({ ...form, payment_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none">
                {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Due Date</label>
            <input type="date" required value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Notes <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none resize-none" />
          </div>
          {formError && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{formError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
              {saving ? 'Saving…' : 'Record Payment'}
            </button>
          </div>
        </form>
      </Modal>
    </Layout>
  );
}
