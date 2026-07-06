import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, UserX } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { ROLE_LABELS } from '../context/AuthContext';
import api from '../api/axios';

const ROLES = ['admin', 'finance_officer', 'approver', 'encoder'];
const emptyForm = { name: '', email: '', password: '', role: 'encoder' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/users').then((res) => setUsers(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormError('');
    setModalOpen(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name, email: u.email, password: '', role: u.role });
    setFormError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setFormError('');
    try {
      if (editing) {
        const payload = { name: form.name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.put(`/users/${editing.id}`, payload);
      } else {
        await api.post('/users', form);
      }
      setModalOpen(false);
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    setBusy(true);
    try {
      await api.delete(`/users/${deactivateTarget.id}`);
      setDeactivateTarget(null);
      load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Users">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">Manage who can access CM-PMS and what they can do.</p>
        <button onClick={openCreate} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ background: 'var(--color-primary)' }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate-400 border-b border-slate-100 text-xs uppercase tracking-wide">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && <tr><td colSpan={5} className="px-5 py-8 text-center text-slate-400">Loading users…</td></tr>}
              {!loading && users.map((u) => (
                <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                  <td className="px-5 py-3 font-medium text-slate-800">{u.name}</td>
                  <td className="px-5 py-3 text-slate-600">{u.email}</td>
                  <td className="px-5 py-3 text-slate-600">{ROLE_LABELS[u.role]}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${u.is_active ? 'text-green-700 bg-green-50' : 'text-slate-500 bg-slate-100'}`}>
                      {u.is_active ? 'Active' : 'Deactivated'}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      <button title="Edit user" onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-slate-400 hover:bg-blue-50 hover:text-blue-600"><Pencil size={16} /></button>
                      {u.is_active ? (
                        <button title="Deactivate user" onClick={() => setDeactivateTarget(u)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><UserX size={16} /></button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Edit User' : 'Add User'} width="max-w-md">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
            <input type="email" required disabled={!!editing} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none disabled:bg-slate-50 disabled:text-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">{editing ? 'New Password' : 'Password'} {editing && <span className="text-slate-400 font-normal">(leave blank to keep current)</span>}</label>
            <input type="password" required={!editing} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Role</label>
            <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none">
              {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </div>
          {formError && <div className="text-sm rounded-lg px-3 py-2" style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)' }}>{formError}</div>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60" style={{ background: 'var(--color-primary)' }}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add User'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deactivateTarget}
        title="Deactivate this user?"
        message={deactivateTarget ? `${deactivateTarget.name} will no longer be able to log in.` : ''}
        confirmLabel="Deactivate"
        loading={busy}
        onConfirm={handleDeactivate}
        onCancel={() => setDeactivateTarget(null)}
      />
    </Layout>
  );
}
