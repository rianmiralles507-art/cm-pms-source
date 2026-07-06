import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, MessageSquare } from 'lucide-react';
import Layout from '../components/Layout';
import Modal from '../components/Modal';
import api from '../api/axios';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export default function Approvals() {
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionTarget, setActionTarget] = useState(null); // { step, type: 'approve'|'reject' }
  const [comment, setComment] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/approvals/pending').then((res) => setPending(res.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function openAction(step, type) {
    setActionTarget({ step, type });
    setComment('');
  }

  async function submitAction() {
    setBusy(true);
    try {
      await api.post(`/approvals/${actionTarget.step.id}/${actionTarget.type}`, { comment });
      setActionTarget(null);
      load();
    } catch (err) {
      alert(err.response?.data?.message || 'Unable to process this approval.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout title="Approvals">
      <div className="mb-4">
        <h2 className="font-display font-semibold text-slate-800">Your Approval Queue</h2>
        <p className="text-sm text-slate-500">Contracts waiting for your sign-off, in Department Head → Finance → Admin order.</p>
      </div>

      {loading && <p className="text-slate-400 text-sm">Loading pending approvals…</p>}

      {!loading && pending.length === 0 && (
        <div className="card p-10 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-slate-300" size={32} />
          <p className="text-slate-500 font-medium">You're all caught up</p>
          <p className="text-sm text-slate-400">There are no contracts pending your approval right now.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {pending.map((step) => (
          <div key={step.id} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400">{step.contract_code} · {step.step_name} step</p>
                <Link to={`/contracts/${step.contract_id}`} className="font-medium text-slate-800 hover:text-blue-600">{step.title}</Link>
                <p className="text-sm text-slate-500">{step.client_name}</p>
              </div>
              <span className="text-sm font-semibold text-slate-700 whitespace-nowrap">{PESO.format(step.total_value)}</span>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => openAction(step, 'approve')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-success)' }}
              >
                <CheckCircle2 size={15} /> Approve
              </button>
              <button
                onClick={() => openAction(step, 'reject')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium text-white"
                style={{ background: 'var(--color-danger)' }}
              >
                <XCircle size={15} /> Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={!!actionTarget}
        onClose={() => setActionTarget(null)}
        title={actionTarget?.type === 'approve' ? 'Approve Contract' : 'Reject Contract'}
        width="max-w-md"
      >
        {actionTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              {actionTarget.type === 'approve' ? 'Approving' : 'Rejecting'} the {actionTarget.step.step_name} step for{' '}
              <span className="font-medium">{actionTarget.step.title}</span>.
            </p>
            <div>
              <label className="flex items-center gap-1.5 text-sm font-medium text-slate-700 mb-1"><MessageSquare size={14} /> Comment <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)}
                placeholder="Add a note for the record…"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:border-blue-400 outline-none resize-none" />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setActionTarget(null)} className="px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100">Cancel</button>
              <button
                onClick={submitAction}
                disabled={busy}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-60"
                style={{ background: actionTarget.type === 'approve' ? 'var(--color-success)' : 'var(--color-danger)' }}
              >
                {busy ? 'Submitting…' : actionTarget.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </Layout>
  );
}
