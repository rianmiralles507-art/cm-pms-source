import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Upload, Eye, Pencil, Trash2 } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import StatusBadge from '../components/StatusBadge';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });
const STATUSES = ['Draft', 'Active', 'Completed', 'Terminated'];

const emptyForm = { title: '', client_name: '', start_date: '', end_date: '', total_value: '', description: '', document: null };

export default function Contracts() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const canManage = user?.role === 'encoder' || user?.role === 'admin';

  const load = useCallback(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    if (statusFilter) params.status = statusFilter;
    api.get('/contracts', { params }).then((res) => setContracts(res.data)).finally(() => setLoading(false));
  }, [search, statusFilter]);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      title: c.title, client_name: c.client_name, start_date: c.start_date, end_date: c.end_date,
      total_value: c.total_value, description: c.description || '', document: null,
    });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'document') { if (v) fd.append('document', v); }
        else fd.append(k, v);
      });
      if (editing) {
        await api.put(`/contracts/${editing.id}`, fd);
      } else {
        await api.post('/contracts', fd);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please check the form and try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete(`/contracts/${deleteTarget.id}`);
      setDeleteTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to delete this contract.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout title="Contracts" onSearch={setSearch}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            title="Filter contracts by status"
            className="text-sm rounded-xl border border-slate-200 py-2 px-3 bg-white outline-none focus:border-blue-400"
          >
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <span className="text-sm text-slate-400">{contracts.length} contract{contracts.length !== 1 ? 's' : ''}</span>
        </div>
        {canManage && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'var(--color-primary)' }}
          >
            <Plus size={16} /> New Contract
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Contract</th>
                <th className="px-5 py-3 font-medium">Client / Supplier</th>
                <th className="px-5 py-3 font-medium">Period</th>
                <th className="px-5 py-3 font-medium text-right">Total Value</th>
                <th className="px-5 py-3 font-medium text-right">Balance</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} className="px-5 py-8 text-center text-slate-400">Loading contracts…</td></tr>
              )}
              {!loading && contracts.length === 0 && (
                <tr><td colSpan={7} className="px-5 py-10 text-center text-slate-400">No contracts found. Try adjusting your search or filters.</td></tr>
              )}
              {!loading && contracts.map((c) => (
                <tr key={c.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3">
                    <button onClick={() => navigate(`/contracts/${c.id}`)} className="text-left">
                      <p className="font-medium text-slate-800 hover:text-blue-600">{c.title}</p>
                      <p className="text-xs text-slate-400">{c.contract_code}</p>
                    </button>
                  </td>
                  <td className="px-5 py-3 text-slate-600">{c.client_name}</td>
                  <td className="px-5 py-3 text-slate-500 text-xs">{c.start_date} → {c.end_date}</td>
                  <td className="px-5 py-3 text-right text-slate-700 font-medium">{PESO.format(c.total_value)}</td>
                  <td className="px-5 py-3 text-right text-slate-500">{PESO.format(c.balance)}</td>
                  <td className="px-5 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button title="View details" onClick={() => navigate(`/contracts/${c.id}`)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                        <Eye size={16} />
                      </button>
                      {canManage && (
                        <button title="Edit contract" onClick={() => openEdit(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600">
                          <Pencil size={16} />
                        </button>
                      )}
                      {user?.role === 'admin' && c.status === 'Draft' && (
                        <button title="Delete contract" onClick={() => setDeleteTarget(c)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit Contract' : 'New Contract'} width="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Title</label>
            <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Office Supplies Annual Contract"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Client / Supplier Name</label>
            <input required value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Start Date</label>
              <input type="date" required value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
              <input type="date" required value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Total Contract Value (₱)</label>
            <input type="number" min="0" step="0.01" required value={form.total_value} onChange={(e) => setForm({ ...form, total_value: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Description <span className="text-slate-400 font-normal">(optional)</span></label>
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Contract Document <span className="text-slate-400 font-normal">(PDF or DOCX, optional)</span></label>
            <label className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg border border-dashed border-slate-300 text-slate-500 cursor-pointer hover:border-blue-300 hover:bg-blue-50/40">
              <Upload size={16} />
              {form.document ? form.document.name : 'Choose a file to upload'}
              <input type="file" accept=".pdf,.docx,.doc" className="hidden" onChange={(e) => setForm({ ...form, document: e.target.files[0] })} />
            </label>
          </div>

          {formError && (
            <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{formError}</div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Contract'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this contract?"
        message={deleteTarget ? `"${deleteTarget.title}" will be permanently removed. This cannot be undone.` : ''}
        confirmLabel="Delete"
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Layout>
  );
}
