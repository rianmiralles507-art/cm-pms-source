import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, FileX, CheckCircle2, XCircle, Circle, Ban } from 'lucide-react';
import Layout from '../components/Layout';
import StatusBadge from '../components/StatusBadge';
import ConfirmDialog from '../components/ConfirmDialog';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

const PESO = new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 });

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [terminateOpen, setTerminateOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/contracts/${id}`).then((res) => setContract(res.data)).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleTerminate() {
    setBusy(true);
    try {
      await api.post(`/contracts/${id}/terminate`, { reason: 'Terminated by admin' });
      setTerminateOpen(false);
      load();
    } finally {
      setBusy(false);
    }
  }

  const STEP_ICON = { Approved: CheckCircle2, Rejected: XCircle, Pending: Circle, Skipped: Ban };
  const STEP_COLOR = { Approved: '#16a34a', Rejected: '#dc2626', Pending: '#d97706', Skipped: '#94a3b8' };

  return (
    <Layout title="Contract Details">
      <button onClick={() => navigate('/contracts')} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mb-4">
        <ArrowLeft size={15} /> Back to Contracts
      </button>

      {loading && <p className="text-slate-400 text-sm">Loading contract…</p>}

      {!loading && contract && (
        <div className="space-y-6">
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-400 mb-1">{contract.contract_code}</p>
                <h2 className="text-xl font-display font-bold text-slate-900">{contract.title}</h2>
                <p className="text-sm text-slate-500 mt-1">{contract.client_name}</p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={contract.status} />
                {user?.role === 'admin' && contract.status === 'Active' && (
                  <button onClick={() => setTerminateOpen(true)} className="text-sm font-medium px-3 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50">
                    Terminate
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-400">Start Date</p>
                <p className="text-sm font-medium text-slate-700">{contract.start_date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">End Date</p>
                <p className="text-sm font-medium text-slate-700">{contract.end_date}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Total Value</p>
                <p className="text-sm font-medium text-slate-700">{PESO.format(contract.total_value)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Balance Remaining</p>
                <p className="text-sm font-medium text-slate-700">{PESO.format(contract.balance)}</p>
              </div>
            </div>

            {contract.description && (
              <p className="text-sm text-slate-500 mt-4 pt-4 border-t border-slate-100">{contract.description}</p>
            )}

            <div className="mt-4 pt-4 border-t border-slate-100">
              {contract.file_path ? (
                <a href={`/api/contracts/${contract.id}/document`} className="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-lg" style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary-dark)' }}>
                  <Download size={15} /> Download {contract.file_name}
                </a>
              ) : (
                <p className="inline-flex items-center gap-2 text-sm text-slate-400"><FileX size={15} /> No document uploaded</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-6">
              <h3 className="font-display font-semibold text-slate-800 text-sm mb-4">Approval Timeline</h3>
              <ol className="space-y-4">
                {contract.approvals.map((a, idx) => {
                  const Icon = STEP_ICON[a.status];
                  return (
                    <li key={a.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <Icon size={20} style={{ color: STEP_COLOR[a.status] }} />
                        {idx < contract.approvals.length - 1 && <div className="w-px flex-1 bg-slate-200 mt-1" />}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-slate-700">{a.step_name}</p>
                        <p className="text-xs text-slate-400">Role: {a.required_role.replace('_', ' ')}</p>
                        <div className="mt-1"><StatusBadge status={a.status} /></div>
                        {a.acted_by_name && (
                          <p className="text-xs text-slate-400 mt-1">by {a.acted_by_name} · {a.acted_at}</p>
                        )}
                        {a.comment && <p className="text-xs text-slate-500 mt-1 italic">"{a.comment}"</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>

            <div className="card p-6">
              <h3 className="font-display font-semibold text-slate-800 text-sm mb-4">Linked Payments</h3>
              {contract.payments.length === 0 ? (
                <p className="text-sm text-slate-400">No payments linked to this contract yet.</p>
              ) : (
                <div className="space-y-3">
                  {contract.payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{p.payment_code} · {p.payment_type}</p>
                        <p className="text-xs text-slate-400">Due {p.due_date}{p.paid_date ? ` · Paid ${p.paid_date}` : ''}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-800">{PESO.format(p.amount)}</p>
                        <StatusBadge status={p.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/payments" className="inline-block mt-4 text-sm font-medium" style={{ color: 'var(--color-primary)' }}>
                Manage payments →
              </Link>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={terminateOpen}
        title="Terminate this contract?"
        message="This will immediately end the contract. This action can only be reversed by an administrator."
        confirmLabel="Terminate"
        loading={busy}
        onConfirm={handleTerminate}
        onCancel={() => setTerminateOpen(false)}
      />
    </Layout>
  );
}
